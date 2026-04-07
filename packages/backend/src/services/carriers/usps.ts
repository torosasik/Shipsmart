/**
 * USPS Carrier Gateway Adapter for the ShipSmart shipping platform.
 * Implements the CarrierGateway interface for USPS API integration (via Pirate Ship).
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
 * USPS/Pirate Ship API configuration.
 */
interface USPSConfig {
  /** Pirate Ship API key */
  apiKey: string;
  /** Pirate Ship API base URL */
  baseUrl: string;
}

/**
 * USPS Carrier Gateway Adapter.
 *
 * Uses Pirate Ship API for USPS Commercial Pricing rates.
 */
export class USPSGateway extends BaseCarrierGateway {
  readonly id = CarrierId.USPS;
  readonly name = 'USPS';
  readonly enabled = true;

  private config: USPSConfig;

  constructor(config?: Partial<USPSConfig>) {
    super();
    this.config = {
      apiKey: process.env.PIRATESHIP_API_KEY || '',
      baseUrl: 'https://api.pirateship.com',
      ...config,
    };
  }

  async getRate(request: RateRequest): Promise<CarrierQuote> {
    this.validateRateRequest(request);

    const pkg = request.packages[0];
    if (!pkg) {
      throw new Error('No packages in rate request');
    }

    const dimWeight = this.calcDimensionalWeight(pkg.length, pkg.width, pkg.height);
    const billableWeight = Math.max(pkg.weight, dimWeight);

    if (billableWeight > CARRIER_WEIGHT_LIMITS[CarrierId.USPS]) {
      throw new Error(`Package exceeds USPS weight limit (${billableWeight} lbs > ${CARRIER_WEIGHT_LIMITS[CarrierId.USPS]} lbs)`);
    }

    const lengthPlusGirth = calculateLengthPlusGirth(pkg.length, pkg.width, pkg.height);
    if (lengthPlusGirth > CARRIER_MAX_LENGTH_PLUS_GIRTH[CarrierId.USPS]) {
      throw new Error(`Package exceeds USPS size limit`);
    }

    try {
      // Pirate Ship rate request
      const rateRequest = {
        from_address: {
          name: request.fromAddress.name || 'Warehouse',
          street1: request.fromAddress.street1,
          city: request.fromAddress.city,
          state: request.fromAddress.state,
          zip: request.fromAddress.zip,
          country: request.fromAddress.country,
        },
        to_address: {
          name: request.toAddress.name || 'Customer',
          street1: request.toAddress.street1,
          city: request.toAddress.city,
          state: request.toAddress.state,
          zip: request.toAddress.zip,
          country: request.toAddress.country,
        },
        parcels: [
          {
            length: pkg.length,
            width: pkg.width,
            height: pkg.height,
            distance_unit: 'in',
            weight: pkg.weight,
            mass_unit: 'lb',
          },
        ],
      };

      this.logRequest('getRate', rateRequest);

      const response = await fetch(`${this.config.baseUrl}/api/v1/rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(this.config.apiKey).toString('base64')}`,
        },
        body: JSON.stringify(rateRequest),
      });

      if (!response.ok) {
        throw new Error(`USPS rate request failed: ${response.statusText}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      const rates = (data?.rates as Array<Record<string, unknown>> | undefined) || [];

      if (rates.length === 0) {
        throw new Error('No rates returned from USPS');
      }

      // Find Priority Mail rate
      const priorityRate = rates.find(
        (r) => (r.shipment_type as string) === 'PriorityMail',
      ) || rates[0];

      const rate = parseFloat((priorityRate?.amount as string) || '0');
      const serviceLevel = (priorityRate?.shipment_type as string) || 'PriorityMail';

      // Estimate delivery days based on service
      const estimatedDays = serviceLevel === 'PriorityMail' ? 2 : serviceLevel === 'FirstClassMail' ? 3 : 5;

      return {
        carrier: CarrierId.USPS,
        serviceLevel: this.mapServiceType(serviceLevel),
        rate: Math.round(rate * 100) / 100,
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
          shipmentType: serviceLevel,
        },
      };
    } catch (error) {
      this.logError('getRate', error);
      throw error;
    }
  }

  async createLabel(request: LabelRequest): Promise<LabelResponse> {
    try {
      const pkg = request.packages[0];
      if (!pkg) throw new Error('No packages in label request');

      const dimWeight = this.calcDimensionalWeight(pkg.length, pkg.width, pkg.height);
      const billableWeight = Math.max(pkg.weight, dimWeight);

      const labelRequest = {
        from_address: {
          name: request.fromAddress.name,
          street1: request.fromAddress.street1,
          street2: request.fromAddress.street2,
          city: request.fromAddress.city,
          state: request.fromAddress.state,
          zip: request.fromAddress.zip,
          country: request.fromAddress.country,
          phone: request.fromAddress.phone,
        },
        to_address: {
          name: request.toAddress.name,
          street1: request.toAddress.street1,
          street2: request.toAddress.street2,
          city: request.toAddress.city,
          state: request.toAddress.state,
          zip: request.toAddress.zip,
          country: request.toAddress.country,
          phone: request.toAddress.phone,
        },
        parcels: [
          {
            length: pkg.length,
            width: pkg.width,
            height: pkg.height,
            distance_unit: 'in',
            weight: billableWeight,
            mass_unit: 'lb',
          },
        ],
        shipment_type: this.mapServiceLevel(request.serviceLevel),
        label_size: '4x6',
        date_advance: 0,
      };

      this.logRequest('createLabel', labelRequest);

      const response = await fetch(`${this.config.baseUrl}/api/v1/labels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(this.config.apiKey).toString('base64')}`,
        },
        body: JSON.stringify(labelRequest),
      });

      if (!response.ok) {
        throw new Error(`USPS label creation failed: ${response.statusText}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      const labelData = (data?.label as Record<string, unknown>) || {};

      return {
        trackingNumber: (labelData?.tracking_number as string) || '',
        labelUrl: (labelData?.label_download_url as string) || '',
        labelFormat: 'PDF',
        charge: parseFloat((labelData?.amount as string) || '0'),
        metadata: {
          shipmentType: labelData?.shipment_type,
        },
      };
    } catch (error) {
      this.logError('createLabel', error);
      throw error;
    }
  }

  async voidLabel(_trackingNumber: string): Promise<boolean> {
    // Pirate Ship doesn't expose a direct void endpoint via their public API.
    // Voiding requires the label ID from the original purchase, which must be
    // stored and passed separately. This is a known limitation.
    // TODO: Implement void by storing labelId from createLabel response
    throw new Error(
      'USPS label voiding is not supported via Pirate Ship public API. ' +
      'Voiding requires the label ID from the original purchase.',
    );
  }

  async trackPackage(trackingNumber: string): Promise<TrackingStatus> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/api/v1/tracking/${trackingNumber}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Basic ${Buffer.from(this.config.apiKey).toString('base64')}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`USPS tracking request failed: ${response.statusText}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      const trackingEvents = (data?.tracking_events as Array<Record<string, unknown>> | undefined) || [];
      const lastEvent = trackingEvents[trackingEvents.length - 1];

      const status = (lastEvent?.status as string) || 'unknown';

      return {
        trackingNumber,
        status,
        estimatedDelivery: null,
        lastUpdate: new Date(),
        events: trackingEvents.map((event) => ({
          timestamp: event.event_date || new Date(),
          description: (event.event_description as string) || '',
          location: (event.event_city as string) || '',
          statusCode: (event.status as string) || '',
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
      if (totalWeight > CARRIER_WEIGHT_LIMITS[CarrierId.USPS]) return false;
      for (const pkg of request.packages) {
        const lengthPlusGirth = calculateLengthPlusGirth(pkg.length, pkg.width, pkg.height);
        if (lengthPlusGirth > CARRIER_MAX_LENGTH_PLUS_GIRTH[CarrierId.USPS]) return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  calcDimensionalWeight(length: number, width: number, height: number): number {
    return calculateDimensionalWeight(length, width, height, CarrierId.USPS);
  }

  private mapServiceType(type: string): string {
    const map: Record<string, string> = {
      PriorityMail: 'PRIORITY',
      FirstClassMail: 'FIRST_CLASS',
      ParcelSelect: 'GROUND',
      PriorityMailExpress: 'EXPRESS',
      MediaMail: 'MEDIA',
    };
    return map[type] || 'PRIORITY';
  }

  private mapServiceLevel(serviceLevel: string): string {
    const map: Record<string, string> = {
      PRIORITY: 'PriorityMail',
      FIRST_CLASS: 'FirstClassMail',
      GROUND: 'ParcelSelect',
      EXPRESS: 'PriorityMailExpress',
      MEDIA: 'MediaMail',
    };
    return map[serviceLevel] || 'PriorityMail';
  }
}
