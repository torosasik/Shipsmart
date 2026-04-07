/**
 * UPS Carrier Gateway Adapter for the ShipSmart shipping platform.
 * Implements the CarrierGateway interface for UPS API integration.
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
 * UPS API configuration.
 * In production, load from environment variables.
 */
interface UPSConfig {
  /** UPS API client ID */
  clientId: string;
  /** UPS API client secret */
  clientSecret: string;
  /** UPS API base URL */
  baseUrl: string;
  /** Whether to use sandbox mode */
  sandbox: boolean;
}

/**
 * UPS OAuth token response
 */
interface UPSTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * UPS Carrier Gateway Adapter.
 *
 * Implements the CarrierGateway interface for UPS API integration.
 * Handles OAuth authentication, rate requests, label generation,
 * and tracking for UPS shipments.
 */
export class UPSGateway extends BaseCarrierGateway {
  readonly id = CarrierId.UPS;
  readonly name = 'UPS';
  readonly enabled = true;

  private config: UPSConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(config?: Partial<UPSConfig>) {
    super();
    this.config = {
      clientId: process.env.UPS_CLIENT_ID || '',
      clientSecret: process.env.UPS_CLIENT_SECRET || '',
      baseUrl: 'https://onlinetools.ups.com',
      sandbox: process.env.NODE_ENV !== 'production',
      ...config,
    };

    // Override base URL for sandbox
    if (this.config.sandbox) {
      this.config.baseUrl = 'https://wwwcie.ups.com';
    }
  }

  /**
   * Get an OAuth access token for UPS API.
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
      return this.accessToken;
    }

    try {
      // UPS OAuth requires Basic Auth with clientId:clientSecret
      const credentials = Buffer.from(
        `${this.config.clientId}:${this.config.clientSecret}`,
      ).toString('base64');

      this.logRequest('getAccessToken', { clientId: this.config.clientId });

      const response = await fetch(`${this.config.baseUrl}/security/v1/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
        }),
      });

      if (!response.ok) {
        throw new Error(`UPS OAuth failed: ${response.statusText}`);
      }

      const data = (await response.json()) as UPSTokenResponse;
      this.accessToken = data.access_token;
      this.tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);

      this.logResponse('getAccessToken', { expires_in: data.expires_in });
      return this.accessToken;
    } catch (error) {
      this.logError('getAccessToken', error);
      throw error;
    }
  }

  /**
   * Get rate quote from UPS.
   */
  async getRate(request: RateRequest): Promise<CarrierQuote> {
    this.validateRateRequest(request);

    const pkg = request.packages[0];
    if (!pkg) {
      throw new Error('No packages in rate request');
    }

    const dimWeight = this.calcDimensionalWeight(pkg.length, pkg.width, pkg.height);
    const billableWeight = Math.max(pkg.weight, dimWeight);

    // Check weight limit
    if (billableWeight > CARRIER_WEIGHT_LIMITS[CarrierId.UPS]) {
      throw new Error(`Package exceeds UPS weight limit (${billableWeight} lbs > ${CARRIER_WEIGHT_LIMITS[CarrierId.UPS]} lbs)`);
    }

    // Check size limit
    const lengthPlusGirth = calculateLengthPlusGirth(pkg.length, pkg.width, pkg.height);
    if (lengthPlusGirth > CARRIER_MAX_LENGTH_PLUS_GIRTH[CarrierId.UPS]) {
      throw new Error(`Package exceeds UPS size limit (${lengthPlusGirth} inches > ${CARRIER_MAX_LENGTH_PLUS_GIRTH[CarrierId.UPS]} inches)`);
    }

    try {
      const token = await this.getAccessToken();

      const rateRequest = {
        RateRequest: {
          Request: {
            RequestOption: 'Rate',
            TransactionReference: {
              CustomerContext: 'ShipSmart Rate Request',
            },
          },
          Shipment: {
            Shipper: {
              Address: {
                PostalCode: request.fromAddress.zip,
                StateProvinceCode: request.fromAddress.state,
                CountryCode: request.fromAddress.country,
              },
            },
            ShipTo: {
              Address: {
                PostalCode: request.toAddress.zip,
                StateProvinceCode: request.toAddress.state,
                CountryCode: request.toAddress.country,
              },
            },
            Package: {
              PackagingType: {
                Code: '02', // Customer supplied package
              },
              PackageWeight: {
                UnitOfMeasurement: {
                  Code: 'LBS',
                },
                Weight: billableWeight.toString(),
              },
              Dimensions: {
                UnitOfMeasurement: {
                  Code: 'IN',
                },
                Length: pkg.length.toString(),
                Width: pkg.width.toString(),
                Height: pkg.height.toString(),
              },
            },
          },
        },
      };

      this.logRequest('getRate', rateRequest);

      const response = await fetch(`${this.config.baseUrl}/api/rating/v1/Shop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'transId': this.generateTransactionId(),
          'transactionSrc': 'ShipSmart',
        },
        body: JSON.stringify(rateRequest),
      });

      if (!response.ok) {
        throw new Error(`UPS rate request failed: ${response.statusText}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      this.logResponse('getRate', data);

      // Parse UPS response
      const ratedShipment = (data as Record<string, unknown>)?.RatedShipment as Array<Record<string, unknown>> | undefined;
      const firstRatedShipment = ratedShipment?.[0];
      if (!ratedShipment) {
        throw new Error('No rates returned from UPS');
      }

      const rate = parseFloat((firstRatedShipment?.TotalCharges as Record<string, string> | undefined)?.MonetaryValue || '0');
      const serviceCode = (firstRatedShipment?.Service as Record<string, string> | undefined)?.Code || '03';
      const estimatedDays = parseInt((firstRatedShipment?.GuaranteedDelivery as Record<string, string> | undefined)?.BusinessDaysInTransit || '5', 10);

      return {
        carrier: CarrierId.UPS,
        serviceLevel: this.mapServiceCode(serviceCode),
        rate: Math.round(rate * 100) / 100,
        currency: 'USD',
        estimatedDays,
        dimensionalWeight: dimWeight,
        billableWeight,
        zone: null, // UPS doesn't return zone in rate response
        isCheapest: false,
        isFastest: false,
        isBestValue: false,
        requiresLTL: false,
        metadata: {
          serviceCode,
          baseCharge: (firstRatedShipment?.TransportationCharges as Record<string, string> | undefined)?.MonetaryValue,
          fuelSurcharge: (firstRatedShipment?.FuelSurcharge as Record<string, string> | undefined)?.MonetaryValue,
        },
      };
    } catch (error) {
      this.logError('getRate', error);
      throw error;
    }
  }

  /**
   * Create a shipping label with UPS.
   */
  async createLabel(request: LabelRequest): Promise<LabelResponse> {
    try {
      const token = await this.getAccessToken();

      const pkg = request.packages[0];
      if (!pkg) {
        throw new Error('No packages in label request');
      }

      const dimWeight = this.calcDimensionalWeight(pkg.length, pkg.width, pkg.height);
      const billableWeight = Math.max(pkg.weight, dimWeight);

      const labelRequest = {
        LabelSpecification: {
          LabelImageFormat: {
            Code: 'PDF',
          },
          LabelStockSize: {
            Height: '6',
            Width: '4',
          },
        },
        ShipmentRequest: {
          Request: {
            RequestOption: 'nonvalidate',
          },
          Shipment: {
            Description: request.reference || 'ShipSmart Shipment',
            Shipper: {
              Name: request.fromAddress.name,
              Address: {
                AddressLine: request.fromAddress.street1,
                City: request.fromAddress.city,
                StateProvinceCode: request.fromAddress.state,
                PostalCode: request.fromAddress.zip,
                CountryCode: request.fromAddress.country,
              },
            },
            ShipTo: {
              Name: request.toAddress.name,
              Address: {
                AddressLine: request.toAddress.street1,
                City: request.toAddress.city,
                StateProvinceCode: request.toAddress.state,
                PostalCode: request.toAddress.zip,
                CountryCode: request.toAddress.country,
              },
            },
            Service: {
              Code: this.mapServiceLevel(request.serviceLevel),
            },
            Package: {
              PackagingType: {
                Code: '02',
              },
              PackageWeight: {
                UnitOfMeasurement: {
                  Code: 'LBS',
                },
                Weight: billableWeight.toString(),
              },
            },
          },
        },
      };

      this.logRequest('createLabel', labelRequest);

      const response = await fetch(`${this.config.baseUrl}/api/shipments/v1/ship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'transId': this.generateTransactionId(),
          'transactionSrc': 'ShipSmart',
        },
        body: JSON.stringify(labelRequest),
      });

      if (!response.ok) {
        throw new Error(`UPS label creation failed: ${response.statusText}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      this.logResponse('createLabel', data);

      const shipmentResults = (data as Record<string, unknown>)?.ShipmentResponse as Record<string, unknown> | undefined;
      const packageResults = (shipmentResults?.ShipmentResults as Record<string, unknown>)?.PackageResults as Record<string, unknown> | undefined;
      const trackingNumber = packageResults?.TrackingNumber as string;
      const labelBase64 = ((packageResults?.ShippingLabel as Record<string, unknown>)?.GraphicImage as string) || '';

      const shipmentCharges = (shipmentResults?.ShipmentResults as Record<string, unknown>)?.ShipmentCharges as Record<string, unknown> | undefined;
      const totalCharges = (shipmentCharges?.TotalCharges as Record<string, string> | undefined)?.MonetaryValue || '0';

      return {
        trackingNumber,
        labelUrl: `data:application/pdf;base64,${labelBase64}`,
        labelFormat: 'PDF',
        charge: parseFloat(totalCharges),
        metadata: {
          serviceCode: (shipmentResults?.ShipmentServiceOptions as Record<string, unknown>)?.ServiceSummary as string,
        },
      };
    } catch (error) {
      this.logError('createLabel', error);
      throw error;
    }
  }

  /**
   * Void a shipping label with UPS.
   */
  async voidLabel(trackingNumber: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(
        `${this.config.baseUrl}/api/shipments/v1/void/${trackingNumber}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'transId': this.generateTransactionId(),
            'transactionSrc': 'ShipSmart',
          },
        },
      );

      return response.ok;
    } catch (error) {
      this.logError('voidLabel', error);
      return false;
    }
  }

  /**
   * Get tracking status from UPS.
   */
  async trackPackage(trackingNumber: string): Promise<TrackingStatus> {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(
        `${this.config.baseUrl}/api/track/v2/details/${trackingNumber}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'transId': this.generateTransactionId(),
            'transactionSrc': 'ShipSmart',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`UPS tracking request failed: ${response.statusText}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      const trackResponse = ((data as Record<string, unknown>)?.trackResponse as Record<string, unknown>)?.shipment as Array<Record<string, unknown>> | undefined;
      const firstTrackResponse = trackResponse?.[0];

      if (!trackResponse) {
        throw new Error('No tracking data found');
      }

      const pkg = (firstTrackResponse?.package as Array<Record<string, unknown>> | undefined)?.[0];
      const activities = (pkg?.activity as Array<Record<string, unknown>> | undefined) || [];
      const firstActivity = activities[0];
      const statusObj = (firstActivity?.status as Record<string, string> | undefined);

      const status = statusObj?.type || 'unknown';
      const estimatedDelivery = pkg?.scheduledDeliveryDate as string | null || null;

      const events = activities.map((act: Record<string, unknown>) => ({
        timestamp: act.date,
        description: (act.statusDescription as string) || '',
        location: `${act.city || ''}, ${act.stateProvince || ''}`,
        statusCode: ((act.status as Record<string, string> | undefined)?.type) || '',
      }));

      return {
        trackingNumber,
        status,
        estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
        lastUpdate: new Date(),
        events,
      };
    } catch (error) {
      this.logError('trackPackage', error);
      throw error;
    }
  }

  /**
   * Check if UPS can handle a given shipment.
   */
  canHandle(request: RateRequest): boolean {
    try {
      this.validateRateRequest(request);

      const totalWeight = request.packages.reduce((sum, p) => sum + p.weight, 0);
      if (totalWeight > CARRIER_WEIGHT_LIMITS[CarrierId.UPS]) {
        return false;
      }

      for (const pkg of request.packages) {
        const lengthPlusGirth = calculateLengthPlusGirth(pkg.length, pkg.width, pkg.height);
        if (lengthPlusGirth > CARRIER_MAX_LENGTH_PLUS_GIRTH[CarrierId.UPS]) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Calculate dimensional weight for UPS.
   */
  calcDimensionalWeight(length: number, width: number, height: number): number {
    return calculateDimensionalWeight(length, width, height, CarrierId.UPS);
  }

  /**
   * Map UPS service code to service level name.
   */
  private mapServiceCode(code: string): string {
    const serviceMap: Record<string, string> = {
      '01': 'NEXT_DAY_AIR',
      '02': '2ND_DAY_AIR',
      '03': 'GROUND',
      '07': 'EXPRESS',
      '08': 'EXPEDITED',
      '11': 'STANDARD',
      '12': '3_DAY_SELECT',
      '13': 'NEXT_DAY_AIR_SAVER',
      '14': 'NEXT_DAY_AIR_EARLY',
      '59': '2ND_DAY_AIR_AM',
      '65': 'SAVER',
      '71': 'UPS_SUREPOST',
      '82': 'UPS_SUREPOST',
      '83': 'UPS_SUREPOST',
      '85': 'UPS_SUREPOST',
      '86': 'UPS_SUREPOST',
      '92': 'UPS_SUREPOST',
      '93': 'UPS_SUREPOST',
      '94': 'UPS_SUREPOST',
      '96': 'UPS_SUREPOST',
    };
    return serviceMap[code] || 'GROUND';
  }

  /**
   * Map service level name to UPS service code.
   */
  private mapServiceLevel(serviceLevel: string): string {
    const serviceMap: Record<string, string> = {
      'NEXT_DAY_AIR': '01',
      '2ND_DAY_AIR': '02',
      'GROUND': '03',
      'EXPRESS': '07',
      'EXPEDITED': '08',
      'STANDARD': '11',
      '3_DAY_SELECT': '12',
      'NEXT_DAY_AIR_SAVER': '13',
      'NEXT_DAY_AIR_EARLY': '14',
      '2ND_DAY_AIR_AM': '59',
      'SAVER': '65',
    };
    return serviceMap[serviceLevel] || '03';
  }

  /**
   * Generate a unique transaction ID for UPS API calls.
   */
  private generateTransactionId(): string {
    return `ss-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}
