/**
 * ShipStation Carrier Gateway Adapter for the ShipSmart shipping platform.
 * Implements the CarrierGateway interface using the ShipStation REST API.
 *
 * ShipStation API docs: https://www.shipstation.com/docs/api/
 * Authentication: HTTP Basic Auth – API Key as username, API Secret as password.
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

// ============================================================================
// ShipStation API types
// ============================================================================

interface ShipStationAddress {
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  residential?: boolean;
}

interface ShipStationWeight {
  value: number;
  units: 'pounds' | 'ounces' | 'grams' | 'kilograms';
}

interface ShipStationDimensions {
  length: number;
  width: number;
  height: number;
  units: 'inches' | 'centimeters';
}

interface ShipStationRateRequest {
  carrierCode?: string;
  serviceCode?: string;
  packageCode?: string;
  fromPostalCode: string;
  toState: string;
  toCountry: string;
  toPostalCode: string;
  toCity: string;
  weight: ShipStationWeight;
  dimensions?: ShipStationDimensions;
  confirmation?: string;
  residential?: boolean;
}

interface ShipStationRate {
  serviceName: string;
  serviceCode: string;
  shipmentCost: number;
  otherCost: number;
}

interface ShipStationLabelRequest {
  serviceCode: string;
  carrierCode: string;
  packageCode: string;
  confirmation?: string;
  shipDate: string;
  weight: ShipStationWeight;
  dimensions?: ShipStationDimensions;
  shipFrom: ShipStationAddress;
  shipTo: ShipStationAddress;
  testLabel?: boolean;
}

interface ShipStationLabelResponse {
  shipmentId: number;
  trackingNumber: string;
  serviceCode: string;
  carrierCode: string;
  shipmentCost: number;
  insuranceCost: number;
  labelData: string;
}

interface ShipStationShipment {
  shipmentId: number;
  trackingNumber: string;
  carrierCode: string;
  serviceCode: string;
  shipDate: string;
  voided: boolean;
  trackingStatus?: string;
}

interface ShipStationVoidResponse {
  approved: boolean;
  message: string;
}

// ============================================================================
// Configuration
// ============================================================================

interface ShipStationConfig {
  /** ShipStation API Key (used as Basic Auth username) */
  apiKey: string;
  /** ShipStation API Secret (used as Basic Auth password) */
  apiSecret: string;
  /** ShipStation API base URL */
  baseUrl: string;
  /** Default carrier code used for rate shopping (e.g. 'stamps_com', 'fedex', 'ups') */
  defaultCarrierCode?: string;
  /** Whether to generate test labels */
  testMode: boolean;
}

// ============================================================================
// Gateway
// ============================================================================

/**
 * ShipStation Carrier Gateway Adapter.
 *
 * Uses the ShipStation REST API for multi-carrier rate shopping, label
 * generation, void, and tracking.
 */
// Use string cast until shared package is rebuilt with ShipStation enum value
const SHIPSTATION_CARRIER_ID = 'shipstation' as CarrierId;

export class ShipStationGateway extends BaseCarrierGateway {
  readonly id = SHIPSTATION_CARRIER_ID;
  readonly name = 'ShipStation';
  readonly enabled = true;

  private config: ShipStationConfig;

  constructor(config?: Partial<ShipStationConfig>) {
    super();
    this.config = {
      apiKey: process.env.SHIPSTATION_API_KEY || '',
      apiSecret: process.env.SHIPSTATION_API_SECRET || '',
      baseUrl: 'https://ssapi.shipstation.com',
      defaultCarrierCode: process.env.SHIPSTATION_DEFAULT_CARRIER || undefined,
      testMode: process.env.SHIPSTATION_TEST_MODE === 'true',
      ...config,
    };
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  /** Build HTTP Basic Auth header from API key + secret. */
  private get authHeader(): string {
    const encoded = Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64');
    return `Basic ${encoded}`;
  }

  /** Perform an authenticated fetch to the ShipStation API. */
  private async apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw new Error(`ShipStation API error ${response.status}: ${text}`);
    }

    return response.json() as Promise<T>;
  }

  /** Convert platform package details to ShipStation weight/dimensions. */
  private buildWeightAndDimensions(pkg: RateRequest['packages'][0]): {
    weight: ShipStationWeight;
    dimensions: ShipStationDimensions;
  } {
    return {
      weight: { value: pkg.weight, units: 'pounds' },
      dimensions: {
        length: pkg.length,
        width: pkg.width,
        height: pkg.height,
        units: 'inches',
      },
    };
  }

  /** Convert a platform Address to a ShipStation address. */
  private toShipStationAddress(
    addr: RateRequest['fromAddress'],
    fallbackName = 'Sender',
  ): ShipStationAddress {
    return {
      name: addr.name || fallbackName,
      street1: addr.street1,
      street2: addr.street2,
      city: addr.city,
      state: addr.state,
      postalCode: addr.zip,
      country: addr.country,
      phone: addr.phone,
    };
  }

  // --------------------------------------------------------------------------
  // CarrierGateway implementation
  // --------------------------------------------------------------------------

  /**
   * Get rate quotes from ShipStation for all available services on the first package.
   * Returns the cheapest available service as a {@link CarrierQuote}.
   */
  async getRate(request: RateRequest): Promise<CarrierQuote> {
    this.validateRateRequest(request);

    const pkg = request.packages[0];
    const { weight, dimensions } = this.buildWeightAndDimensions(pkg);

    const body: ShipStationRateRequest = {
      carrierCode: this.config.defaultCarrierCode,
      fromPostalCode: request.fromAddress.zip,
      toState: request.toAddress.state,
      toCountry: request.toAddress.country,
      toPostalCode: request.toAddress.zip,
      toCity: request.toAddress.city,
      weight,
      dimensions,
      residential: true,
    };

    this.logRequest('getRate', body);

    const rates = await this.apiFetch<ShipStationRate[]>('/shipments/getrates', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    this.logResponse('getRate', rates);

    if (!rates || rates.length === 0) {
      throw new Error('ShipStation returned no rates');
    }

    // Pick the cheapest service
    const best = rates.reduce((prev, curr) =>
      prev.shipmentCost + prev.otherCost <= curr.shipmentCost + curr.otherCost ? prev : curr,
    );

    const totalCost = best.shipmentCost + best.otherCost;
    const dimWeight = this.calcDimensionalWeight(pkg.length, pkg.width, pkg.height);
    const billableWeight = Math.max(pkg.weight, dimWeight);

    return {
      carrier: SHIPSTATION_CARRIER_ID,
      serviceLevel: best.serviceCode,
      rate: totalCost,
      currency: 'USD',
      estimatedDays: 0,
      dimensionalWeight: dimWeight,
      billableWeight,
      zone: null,
      isCheapest: false,
      isFastest: false,
      isBestValue: false,
      requiresLTL: false,
      metadata: {
        serviceName: best.serviceName,
        serviceCode: best.serviceCode,
        allRates: rates.map((r) => ({
          serviceCode: r.serviceCode,
          serviceName: r.serviceName,
          totalCost: r.shipmentCost + r.otherCost,
        })),
      },
    };
  }

  /**
   * Create a shipping label via ShipStation.
   */
  async createLabel(request: LabelRequest): Promise<LabelResponse> {
    const pkg = request.packages[0];
    if (!pkg) throw new Error('No packages in label request');

    const { weight, dimensions } = this.buildWeightAndDimensions(pkg);

    const body: ShipStationLabelRequest = {
      serviceCode: request.serviceLevel,
      carrierCode: this.config.defaultCarrierCode || 'stamps_com',
      packageCode: 'package',
      shipDate: new Date().toISOString().split('T')[0],
      weight,
      dimensions,
      shipFrom: this.toShipStationAddress(request.fromAddress, 'Sender'),
      shipTo: this.toShipStationAddress(request.toAddress, 'Recipient'),
      testLabel: this.config.testMode,
    };

    this.logRequest('createLabel', body);

    const label = await this.apiFetch<ShipStationLabelResponse>('/shipments/createlabel', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    this.logResponse('createLabel', {
      shipmentId: label.shipmentId,
      trackingNumber: label.trackingNumber,
    });

    return {
      trackingNumber: label.trackingNumber,
      labelUrl: `data:application/pdf;base64,${label.labelData}`,
      labelFormat: 'PDF',
      charge: label.shipmentCost + label.insuranceCost,
      metadata: {
        shipmentId: label.shipmentId,
        carrierCode: label.carrierCode,
        serviceCode: label.serviceCode,
      },
    };
  }

  /**
   * Void a ShipStation label by its shipment ID.
   * Pass the shipmentId (from label metadata) as the identifier.
   */
  async voidLabel(shipmentId: string): Promise<boolean> {
    try {
      const result = await this.apiFetch<ShipStationVoidResponse>(
        `/shipments/${shipmentId}/voidlabel`,
        { method: 'POST' },
      );
      return result.approved;
    } catch (error) {
      this.logError('voidLabel', error);
      return false;
    }
  }

  /**
   * Track a package via ShipStation by tracking number.
   */
  async trackPackage(trackingNumber: string): Promise<TrackingStatus> {
    const data = await this.apiFetch<{ shipments: ShipStationShipment[] }>(
      `/shipments?trackingNumber=${encodeURIComponent(trackingNumber)}`,
    );

    if (!data.shipments || data.shipments.length === 0) {
      throw new Error(`No ShipStation shipment found for tracking number: ${trackingNumber}`);
    }

    const shipment = data.shipments[0];

    return {
      trackingNumber,
      status: shipment.voided ? 'voided' : (shipment.trackingStatus || 'unknown'),
      estimatedDelivery: null,
      lastUpdate: shipment.shipDate || new Date().toISOString(),
      events: [],
    };
  }

  /**
   * Check whether ShipStation can handle the given shipment.
   * Requires API credentials and the package must be within weight/size limits.
   */
  canHandle(request: RateRequest): boolean {
    if (!this.config.apiKey || !this.config.apiSecret) {
      return false;
    }

    const weightLimit = CARRIER_WEIGHT_LIMITS[SHIPSTATION_CARRIER_ID] ?? 150;
    const sizeLimit = CARRIER_MAX_LENGTH_PLUS_GIRTH[SHIPSTATION_CARRIER_ID] ?? 165;

    for (const pkg of request.packages) {
      if (pkg.weight > weightLimit) return false;
      if (calculateLengthPlusGirth(pkg.length, pkg.width, pkg.height) > sizeLimit) return false;
    }

    return true;
  }

  /**
   * Calculate dimensional weight using the standard 139 cubic-inch divisor.
   */
  calcDimensionalWeight(length: number, width: number, height: number): number {
    return calculateDimensionalWeight(length, width, height, SHIPSTATION_CARRIER_ID);
  }
}
