/**
 * Shippo Carrier Gateway Adapter for the ShipSmart shipping platform.
 * Implements the CarrierGateway interface for Shippo multi-carrier API.
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
 * Shippo API configuration.
 */
interface ShippoConfig {
  /** Shippo API token */
  apiToken: string;
  /** Shippo API base URL */
  baseUrl: string;
}

/**
 * Shippo Carrier Gateway Adapter.
 *
 * Uses Shippo API for multi-carrier rate shopping and label generation.
 */
export class ShippoGateway extends BaseCarrierGateway {
  readonly id = CarrierId.Shippo;
  readonly name = 'Shippo';
  readonly enabled = true;

  private config: ShippoConfig;

  constructor(config?: Partial<ShippoConfig>) {
    super();
    this.config = {
      apiToken: process.env.SHIPPO_API_TOKEN || '',
      baseUrl: 'https://api.goshippo.com',
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

    if (billableWeight > CARRIER_WEIGHT_LIMITS[CarrierId.Shippo]) {
      throw new Error(`Package exceeds weight limit`);
    }

    const lengthPlusGirth = calculateLengthPlusGirth(pkg.length, pkg.width, pkg.height);
    if (lengthPlusGirth > CARRIER_MAX_LENGTH_PLUS_GIRTH[CarrierId.Shippo]) {
      throw new Error(`Package exceeds size limit`);
    }

    try {
      // Create from/to addresses first
      const fromAddress = await this.createAddress(request.fromAddress, true);
      const toAddress = await this.createAddress(request.toAddress, false);

      // Create parcel
      const parcel = await this.createParcel(pkg);

      // Get rates
      const rates = await this.getRates(fromAddress, toAddress, parcel);

      if (rates.length === 0) {
        throw new Error('No rates returned from Shippo');
      }

      // Return the cheapest rate
      const cheapestRate = rates.reduce((min, r) =>
        (r.amount as number) < (min.amount as number) ? r : min,
      );

      const amount = parseFloat((cheapestRate.amount as string) || '0');
      const provider = (cheapestRate.provider as string) || 'Unknown';
      const serviceLevel = (cheapestRate.servicelevel as Record<string, string> | undefined)?.name || 'Standard';
      const estimatedDays = parseInt((cheapestRate.duration_terms as string) || '5', 10);

      return {
        carrier: CarrierId.Shippo,
        serviceLevel,
        rate: Math.round(amount * 100) / 100,
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
          provider,
          rateObjectId: cheapestRate.object_id,
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

      const fromAddress = await this.createAddress(request.fromAddress, true);
      const toAddress = await this.createAddress(request.toAddress, false);
      const parcel = await this.createParcel(pkg);

      const shipment = await this.createShipment(
        fromAddress,
        toAddress,
        parcel,
        request.serviceLevel,
      );

      // Buy the label
      const label = await this.buyLabel(shipment);

      return {
        trackingNumber: (label.tracking_number as string) || '',
        labelUrl: (label.label_url as string) || '',
        labelFormat: 'PDF',
        charge: parseFloat(((label.rate as Record<string, string> | undefined)?.amount) || '0'),
        metadata: {
          shipmentId: label.object_id,
        },
      };
    } catch (error) {
      this.logError('createLabel', error);
      throw error;
    }
  }

  async voidLabel(_trackingNumber: string): Promise<boolean> {
    try {
      // Shippo requires the transaction object_id to void, not tracking number
      // This is a simplified implementation
      return false;
    } catch {
      return false;
    }
  }

  async trackPackage(trackingNumber: string): Promise<TrackingStatus> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/tracks/${trackingNumber}`,
        {
          headers: {
            Authorization: `ShippoToken ${this.config.apiToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Shippo tracking request failed: ${response.statusText}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      const trackingStatus = (data?.tracking_status as Record<string, string> | undefined);
      const status = trackingStatus?.status || 'unknown';
      const events = (data?.tracking_history as Array<Record<string, unknown>> | undefined) || [];

      return {
        trackingNumber,
        status,
        estimatedDelivery: null,
        lastUpdate: new Date(),
        events: events.map((event) => ({
          timestamp: event.date_occurred || new Date(),
          description: (event.status_details as string) || '',
          location: ((event.location as Record<string, string> | undefined)?.city) || '',
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
      if (totalWeight > CARRIER_WEIGHT_LIMITS[CarrierId.Shippo]) return false;
      for (const pkg of request.packages) {
        const lengthPlusGirth = calculateLengthPlusGirth(pkg.length, pkg.width, pkg.height);
        if (lengthPlusGirth > CARRIER_MAX_LENGTH_PLUS_GIRTH[CarrierId.Shippo]) return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  calcDimensionalWeight(length: number, width: number, height: number): number {
    return calculateDimensionalWeight(length, width, height, CarrierId.Shippo);
  }

  /**
   * Create an address in Shippo.
   */
  private async createAddress(
    address: { name: string; street1: string; street2?: string; city: string; state: string; zip: string; country: string; phone?: string; email?: string },
    isFrom: boolean,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.config.baseUrl}/addresses/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ShippoToken ${this.config.apiToken}`,
      },
      body: JSON.stringify({
        name: address.name,
        street1: address.street1,
        street2: address.street2 || '',
        city: address.city,
        state: address.state,
        zip: address.zip,
        country: address.country,
        phone: address.phone || '',
        email: address.email || '',
        is_complete: isFrom,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create address: ${response.statusText}`);
    }

    return (await response.json()) as Record<string, unknown>;
  }

  /**
   * Create a parcel in Shippo.
   */
  private async createParcel(pkg: { length: number; width: number; height: number; weight: number; declaredValue: number }): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.config.baseUrl}/parcels/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ShippoToken ${this.config.apiToken}`,
      },
      body: JSON.stringify({
        length: pkg.length.toString(),
        width: pkg.width.toString(),
        height: pkg.height.toString(),
        distance_unit: 'in',
        weight: pkg.weight.toString(),
        mass_unit: 'lb',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create parcel: ${response.statusText}`);
    }

    return (await response.json()) as Record<string, unknown>;
  }

  /**
   * Get rates for a shipment.
   */
  private async getRates(
    fromAddress: Record<string, unknown>,
    toAddress: Record<string, unknown>,
    parcel: Record<string, unknown>,
  ): Promise<Array<Record<string, unknown>>> {
    const response = await fetch(`${this.config.baseUrl}/shipments/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ShippoToken ${this.config.apiToken}`,
      },
      body: JSON.stringify({
        address_from: fromAddress.object_id,
        address_to: toAddress.object_id,
        parcels: [parcel.object_id],
        async: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get rates: ${response.statusText}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    return (data?.rates as Array<Record<string, unknown>> | undefined) || [];
  }

  /**
   * Create a shipment object.
   */
  private async createShipment(
    fromAddress: Record<string, unknown>,
    toAddress: Record<string, unknown>,
    parcel: Record<string, unknown>,
    _serviceLevel: string,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.config.baseUrl}/shipments/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ShippoToken ${this.config.apiToken}`,
      },
      body: JSON.stringify({
        address_from: fromAddress.object_id,
        address_to: toAddress.object_id,
        parcels: [parcel.object_id],
        async: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create shipment: ${response.statusText}`);
    }

    return (await response.json()) as Record<string, unknown>;
  }

  /**
   * Buy a label for a shipment.
   */
  private async buyLabel(
    shipment: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const rates = (shipment.rates as Array<Record<string, unknown>> | undefined) || [];
    if (rates.length === 0) {
      throw new Error('No rates available for purchase');
    }

    const cheapestRate = rates.reduce((min, r) =>
      parseFloat((r.amount as string) || '0') < parseFloat((min.amount as string) || '0') ? r : min,
    );

    const response = await fetch(`${this.config.baseUrl}/transactions/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ShippoToken ${this.config.apiToken}`,
      },
      body: JSON.stringify({
        rate: cheapestRate.object_id,
        label_file_type: 'application/pdf',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to buy label: ${response.statusText}`);
    }

    return (await response.json()) as Record<string, unknown>;
  }
}
