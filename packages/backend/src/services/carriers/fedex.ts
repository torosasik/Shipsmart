/**
 * FedEx Carrier Gateway Adapter for the ShipSmart shipping platform.
 * Implements the CarrierGateway interface for FedEx API integration.
 */

import {
  CarrierId,
  RateRequest,
  CarrierQuote,
  LabelRequest,
  LabelResponse,
  TrackingStatus,
} from '@shipsmart/shared';
import {
  calculateDimensionalWeight,
  CARRIER_WEIGHT_LIMITS,
  CARRIER_MAX_LENGTH_PLUS_GIRTH,
  calculateLengthPlusGirth,
} from '@shipsmart/shared';
import { BaseCarrierGateway } from './gateway';

/**
 * FedEx API configuration.
 */
interface FedExConfig {
  /** FedEx API key */
  apiKey: string;
  /** FedEx API secret */
  apiSecret: string;
  /** FedEx API base URL */
  baseUrl: string;
  /** FedEx OAuth URL */
  authUrl: string;
  /** Whether to use sandbox mode */
  sandbox: boolean;
}

/**
 * FedEx OAuth token response
 */
interface FedExTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * FedEx Carrier Gateway Adapter.
 */
export class FedExGateway extends BaseCarrierGateway {
  readonly id = CarrierId.FedEx;
  readonly name = 'FedEx';
  readonly enabled = true;

  private config: FedExConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(config?: Partial<FedExConfig>) {
    super();
    this.config = {
      apiKey: process.env.FEDEX_API_KEY || '',
      apiSecret: process.env.FEDEX_API_SECRET || '',
      baseUrl: 'https://apis.fedex.com',
      authUrl: 'https://apis.fedex.com/oauth/token',
      sandbox: process.env.NODE_ENV !== 'production',
      ...config,
    };

    if (this.config.sandbox) {
      this.config.baseUrl = 'https://apis-sandbox.fedex.com';
      this.config.authUrl = 'https://apis-sandbox.fedex.com/oauth/token';
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
      return this.accessToken;
    }

    try {
      const credentials = Buffer.from(
        `${this.config.apiKey}:${this.config.apiSecret}`,
      ).toString('base64');

      const response = await fetch(this.config.authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
        }),
      });

      if (!response.ok) {
        throw new Error(`FedEx OAuth failed: ${response.statusText}`);
      }

      const data = (await response.json()) as FedExTokenResponse;
      this.accessToken = data.access_token;
      this.tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);

      return this.accessToken;
    } catch (error) {
      this.logError('getAccessToken', error);
      throw error;
    }
  }

  async getRate(request: RateRequest): Promise<CarrierQuote> {
    this.validateRateRequest(request);

    const pkg = request.packages[0];
    if (!pkg) {
      throw new Error('No packages in rate request');
    }

    const dimWeight = this.calcDimensionalWeight(pkg.length, pkg.width, pkg.height);
    const billableWeight = Math.max(pkg.weight, dimWeight);

    if (billableWeight > CARRIER_WEIGHT_LIMITS[CarrierId.FedEx]) {
      throw new Error(`Package exceeds FedEx weight limit`);
    }

    const lengthPlusGirth = calculateLengthPlusGirth(pkg.length, pkg.width, pkg.height);
    if (lengthPlusGirth > CARRIER_MAX_LENGTH_PLUS_GIRTH[CarrierId.FedEx]) {
      throw new Error(`Package exceeds FedEx size limit`);
    }

    try {
      const token = await this.getAccessToken();

      const rateRequest = {
        accountNumber: { value: this.config.apiKey },
        requestedShipment: {
          shipper: {
            address: {
              postalCode: request.fromAddress.zip,
              stateCode: request.fromAddress.state,
              countryCode: request.fromAddress.country,
            },
          },
          recipient: {
            address: {
              postalCode: request.toAddress.zip,
              stateCode: request.toAddress.state,
              countryCode: request.toAddress.country,
            },
          },
          packageCount: '1',
          requestedPackageLineItems: [
            {
              weight: {
                units: 'LB',
                value: billableWeight.toString(),
              },
              dimensions: {
                length: pkg.length.toString(),
                width: pkg.width.toString(),
                height: pkg.height.toString(),
                units: 'IN',
              },
            },
          ],
        },
      };

      const response = await fetch(`${this.config.baseUrl}/rate/v1/rates/quotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(rateRequest),
      });

      if (!response.ok) {
        throw new Error(`FedEx rate request failed: ${response.statusText}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      const rateReply = (data?.rateReplyDetails as Array<Record<string, unknown>> | undefined)?.[0];

      if (!rateReply) {
        throw new Error('No rates returned from FedEx');
      }

      const ratedShipment = (rateReply?.ratedShipmentDetails as Array<Record<string, unknown>> | undefined)?.[0];
      const totalNetCharge = (ratedShipment?.totalNetCharge as Record<string, string> | undefined)?.amount || '0';
      const serviceType = (rateReply?.serviceType as string) || 'FEDEX_GROUND';
      const transitInfo = (rateReply?.commit as Record<string, unknown> | undefined);
      const estimatedDays = parseInt((transitInfo?.transitTime as string) || '5', 10);

      return {
        carrier: CarrierId.FedEx,
        serviceLevel: this.mapServiceType(serviceType),
        rate: Math.round(parseFloat(totalNetCharge) * 100) / 100,
        currency: 'USD',
        estimatedDays,
        dimensionalWeight: dimWeight,
        billableWeight,
        zone: null,
        isCheapest: false,
        isFastest: false,
        isBestValue: false,
        requiresLTL: false,
        metadata: {
          serviceType,
          transitTime: transitInfo?.transitTime,
        },
      };
    } catch (error) {
      this.logError('getRate', error);
      throw error;
    }
  }

  async createLabel(request: LabelRequest): Promise<LabelResponse> {
    try {
      const token = await this.getAccessToken();
      const pkg = request.packages[0];
      if (!pkg) throw new Error('No packages in label request');

      const dimWeight = this.calcDimensionalWeight(pkg.length, pkg.width, pkg.height);
      const billableWeight = Math.max(pkg.weight, dimWeight);

      const labelRequest = {
        labelResponseOptions: 'URL_ONLY',
        requestedShipment: {
          shipper: {
            name: request.fromAddress.name,
            address: {
              streetLines: [request.fromAddress.street1],
              city: request.fromAddress.city,
              stateCode: request.fromAddress.state,
              postalCode: request.fromAddress.zip,
              countryCode: request.fromAddress.country,
            },
          },
          recipients: [
            {
              name: request.toAddress.name,
              address: {
                streetLines: [request.toAddress.street1],
                city: request.toAddress.city,
                stateCode: request.toAddress.state,
                postalCode: request.toAddress.zip,
                countryCode: request.toAddress.country,
              },
            },
          ],
          shipDatestamp: new Date().toISOString().split('T')[0],
          serviceType: this.mapServiceLevel(request.serviceLevel),
          packagingType: 'YOUR_PACKAGING',
          packageCount: '1',
          requestedPackageLineItems: [
            {
              weight: { units: 'LB', value: billableWeight.toString() },
              dimensions: {
                length: pkg.length.toString(),
                width: pkg.width.toString(),
                height: pkg.height.toString(),
                units: 'IN',
              },
            },
          ],
        },
        labelSpecification: {
          labelFormat: 'PDF',
          labelStockType: 'PAPER_4X6',
        },
      };

      const response = await fetch(`${this.config.baseUrl}/ship/v1/shipments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(labelRequest),
      });

      if (!response.ok) {
        throw new Error(`FedEx label creation failed: ${response.statusText}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      const output = (data?.output as Record<string, unknown>) || {};
      const transactionShipments = (output?.transactionShipments as Array<Record<string, unknown>> | undefined) || [];
      const shipment = transactionShipments[0];

      if (!shipment) {
        throw new Error('No shipment data returned from FedEx');
      }

      // Extract label URL from the correct field in FedEx response
      const packageDocuments = (shipment?.packageDocuments as Array<Record<string, string>> | undefined) || [];
      const labelUrl = packageDocuments[0]?.url || '';

      return {
        trackingNumber: (shipment?.masterTrackingNumber as string) || '',
        labelUrl,
        labelFormat: 'PDF',
        charge: 0,
        metadata: { shipmentId: shipment?.shipmentId },
      };
    } catch (error) {
      this.logError('createLabel', error);
      throw error;
    }
  }

  async voidLabel(trackingNumber: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const response = await fetch(
        `${this.config.baseUrl}/ship/v1/shipments/cancel`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ trackingNumber }),
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async trackPackage(trackingNumber: string): Promise<TrackingStatus> {
    try {
      const token = await this.getAccessToken();
      const response = await fetch(
        `${this.config.baseUrl}/track/v1/trackingnumbers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            includeDetailedScans: true,
            trackingInfo: [{ trackingNumberInfo: { trackingNumber } }],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`FedEx tracking request failed: ${response.statusText}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      const output = (data?.output as Record<string, unknown>) || {};
      const completeTrackResults = (output?.completeTrackResults as Array<Record<string, unknown>> | undefined) || [];
      const trackResult = completeTrackResults[0];

      if (!trackResult) {
        throw new Error('No tracking data found');
      }

      const trackResults = (trackResult?.trackResults as Array<Record<string, unknown>> | undefined) || [];
      const firstResult = trackResults[0];
      const latestStatusDetail = (firstResult?.latestStatusDetail as Record<string, string> | undefined);
      const status = latestStatusDetail?.description || 'unknown';
      const events = (firstResult?.scanEvents as Array<Record<string, unknown>> | undefined) || [];

      return {
        trackingNumber,
        status,
        estimatedDelivery: null,
        lastUpdate: new Date(),
        events: events.map((event) => ({
          timestamp: event.date || new Date(),
          description: (event.eventDescription as string) || '',
          location: (event.city || '') as string,
          statusCode: '',
        })),
      };
    } catch (error) {
      this.logError('trackPackage', error);
      throw error;
    }
  }

  canHandle(request: RateRequest): boolean {
    try {
      this.validateRateRequest(request);
      const totalWeight = request.packages.reduce((sum, p) => sum + p.weight, 0);
      if (totalWeight > CARRIER_WEIGHT_LIMITS[CarrierId.FedEx]) return false;
      for (const pkg of request.packages) {
        const lengthPlusGirth = calculateLengthPlusGirth(pkg.length, pkg.width, pkg.height);
        if (lengthPlusGirth > CARRIER_MAX_LENGTH_PLUS_GIRTH[CarrierId.FedEx]) return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  calcDimensionalWeight(length: number, width: number, height: number): number {
    return calculateDimensionalWeight(length, width, height, CarrierId.FedEx);
  }

  private mapServiceType(code: string): string {
    const map: Record<string, string> = {
      FEDEX_GROUND: 'GROUND',
      FEDEX_2_DAY: '2ND_DAY_AIR',
      FEDEX_EXPRESS_SAVER: '3_DAY_SELECT',
      STANDARD_OVERNIGHT: 'NEXT_DAY_AIR',
      PRIORITY_OVERNIGHT: 'NEXT_DAY_AIR_EARLY',
      FIRST_OVERNIGHT: 'NEXT_DAY_AIR_EARLY',
    };
    return map[code] || 'GROUND';
  }

  private mapServiceLevel(serviceLevel: string): string {
    const map: Record<string, string> = {
      GROUND: 'FEDEX_GROUND',
      '2ND_DAY_AIR': 'FEDEX_2_DAY',
      '3_DAY_SELECT': 'FEDEX_EXPRESS_SAVER',
      NEXT_DAY_AIR: 'STANDARD_OVERNIGHT',
      NEXT_DAY_AIR_EARLY: 'PRIORITY_OVERNIGHT',
    };
    return map[serviceLevel] || 'FEDEX_GROUND';
  }
}
