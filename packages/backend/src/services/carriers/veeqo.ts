/**
 * Veeqo Carrier Gateway Adapter for the ShipSmart shipping platform.
 * Implements the CarrierGateway interface using the Veeqo REST API.
 *
 * Veeqo API docs: https://developers.veeqo.com/docs
 * Authentication: API key passed as the `x-api-key` header.
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
// Veeqo API types
// ============================================================================

interface VeeqoAddress {
  first_name: string;
  last_name?: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

interface VeeqoShipmentRate {
  id: number;
  service_name: string;
  service_code: string;
  carrier_name: string;
  total_price: number;
  currency: string;
  estimated_days?: number;
}

interface VeeqoShipment {
  id: number;
  tracking_number: string;
  carrier_name: string;
  service_name: string;
  label_url?: string;
  label_pdf?: string;
  total_price: number;
  currency: string;
  status?: string;
  created_at: string;
}

interface VeeqoCreateShipmentRequest {
  shipment: {
    send_address: VeeqoAddress;
    return_address: VeeqoAddress;
    packages_attributes: Array<{
      weight_value: number;
      weight_unit: string;
      length: number;
      width: number;
      height: number;
      dimension_unit: string;
    }>;
    shipping_rate_id?: number;
    service_code?: string;
    carrier_name?: string;
    ship_date?: string;
    test?: boolean;
  };
}

// ============================================================================
// Configuration
// ============================================================================

interface VeeqoConfig {
  /** Veeqo API key */
  apiKey: string;
  /** Veeqo API base URL */
  baseUrl: string;
  /** Whether to generate test labels */
  testMode: boolean;
}

// ============================================================================
// Gateway
// ============================================================================

// Use string cast until shared package enum is rebuilt
const VEEQO_CARRIER_ID = 'veeqo' as CarrierId;

/**
 * Veeqo Carrier Gateway Adapter.
 *
 * Uses the Veeqo REST API for multi-carrier rate shopping, label
 * generation, void, and tracking.
 */
export class VeeqoGateway extends BaseCarrierGateway {
  readonly id = VEEQO_CARRIER_ID;
  readonly name = 'Veeqo';
  readonly enabled = true;

  private config: VeeqoConfig;

  constructor(config?: Partial<VeeqoConfig>) {
    super();
    this.config = {
      apiKey: process.env.VEEQO_API_KEY || '',
      baseUrl: 'https://api.veeqo.com',
      testMode: process.env.VEEQO_TEST_MODE === 'true',
      ...config,
    };
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  /** Perform an authenticated fetch to the Veeqo API. */
  private async apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'x-api-key': this.config.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw new Error(`Veeqo API error ${response.status}: ${text}`);
    }

    return response.json() as Promise<T>;
  }

  /** Convert a platform Address to a Veeqo address. */
  private toVeeqoAddress(addr: RateRequest['fromAddress'], fallbackName = 'Sender'): VeeqoAddress {
    const nameParts = (addr.name || fallbackName).split(' ');
    return {
      first_name: nameParts[0] || fallbackName,
      last_name: nameParts.slice(1).join(' ') || undefined,
      address1: addr.street1,
      address2: addr.street2,
      city: addr.city,
      state: addr.state,
      zip: addr.zip,
      country: addr.country,
      phone: addr.phone,
      email: addr.email,
    };
  }

  // --------------------------------------------------------------------------
  // CarrierGateway implementation
  // --------------------------------------------------------------------------

  /**
   * Get rate quotes from Veeqo for all available services on the first package.
   * Returns the cheapest available service as a {@link CarrierQuote}.
   */
  async getRate(request: RateRequest): Promise<CarrierQuote> {
    this.validateRateRequest(request);

    const pkg = request.packages[0];

    const body = {
      shipment: {
        send_address: this.toVeeqoAddress(request.fromAddress, 'Sender'),
        return_address: this.toVeeqoAddress(request.fromAddress, 'Sender'),
        packages_attributes: [
          {
            weight_value: pkg.weight,
            weight_unit: 'lb',
            length: pkg.length,
            width: pkg.width,
            height: pkg.height,
            dimension_unit: 'in',
          },
        ],
      },
    };

    this.logRequest('getRate', body);

    const rates = await this.apiFetch<VeeqoShipmentRate[]>('/shipping_rates', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    this.logResponse('getRate', rates);

    if (!rates || rates.length === 0) {
      throw new Error('Veeqo returned no rates');
    }

    // Pick the cheapest service
    const best = rates.reduce((prev, curr) =>
      prev.total_price <= curr.total_price ? prev : curr,
    );

    const dimWeight = this.calcDimensionalWeight(pkg.length, pkg.width, pkg.height);
    const billableWeight = Math.max(pkg.weight, dimWeight);

    return {
      carrier: VEEQO_CARRIER_ID,
      serviceLevel: best.service_code,
      rate: best.total_price,
      currency: best.currency || 'USD',
      estimatedDays: best.estimated_days ?? 0,
      dimensionalWeight: dimWeight,
      billableWeight,
      zone: null,
      isCheapest: false,
      isFastest: false,
      isBestValue: false,
      requiresLTL: false,
      metadata: {
        rateId: best.id,
        serviceName: best.service_name,
        carrierName: best.carrier_name,
        allRates: rates.map((r) => ({
          id: r.id,
          serviceCode: r.service_code,
          serviceName: r.service_name,
          carrierName: r.carrier_name,
          totalPrice: r.total_price,
          estimatedDays: r.estimated_days,
        })),
      },
    };
  }

  /**
   * Create a shipping label via Veeqo.
   */
  async createLabel(request: LabelRequest): Promise<LabelResponse> {
    const pkg = request.packages[0];
    if (!pkg) throw new Error('No packages in label request');

    const body: VeeqoCreateShipmentRequest = {
      shipment: {
        send_address: this.toVeeqoAddress(request.fromAddress, 'Sender'),
        return_address: this.toVeeqoAddress(request.fromAddress, 'Sender'),
        packages_attributes: [
          {
            weight_value: pkg.weight,
            weight_unit: 'lb',
            length: pkg.length,
            width: pkg.width,
            height: pkg.height,
            dimension_unit: 'in',
          },
        ],
        service_code: request.serviceLevel,
        ship_date: new Date().toISOString().split('T')[0],
        test: this.config.testMode,
      },
    };

    this.logRequest('createLabel', body);

    const shipment = await this.apiFetch<VeeqoShipment>('/shipments', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    this.logResponse('createLabel', {
      id: shipment.id,
      trackingNumber: shipment.tracking_number,
    });

    const labelUrl = shipment.label_url ||
      (shipment.label_pdf ? `data:application/pdf;base64,${shipment.label_pdf}` : '');

    return {
      trackingNumber: shipment.tracking_number,
      labelUrl,
      labelFormat: 'PDF',
      charge: shipment.total_price,
      metadata: {
        shipmentId: shipment.id,
        carrierName: shipment.carrier_name,
        serviceName: shipment.service_name,
      },
    };
  }

  /**
   * Void a Veeqo shipment by its shipment ID.
   */
  async voidLabel(shipmentId: string): Promise<boolean> {
    try {
      await this.apiFetch(`/shipments/${shipmentId}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      this.logError('voidLabel', error);
      return false;
    }
  }

  /**
   * Track a package via Veeqo by tracking number.
   */
  async trackPackage(trackingNumber: string): Promise<TrackingStatus> {
    const data = await this.apiFetch<{ shipments: VeeqoShipment[] }>(
      `/shipments?tracking_number=${encodeURIComponent(trackingNumber)}`,
    );

    const shipments = data?.shipments || (Array.isArray(data) ? (data as VeeqoShipment[]) : []);

    if (!shipments || shipments.length === 0) {
      throw new Error(`No Veeqo shipment found for tracking number: ${trackingNumber}`);
    }

    const shipment = shipments[0];

    return {
      trackingNumber,
      status: shipment.status || 'unknown',
      estimatedDelivery: null,
      lastUpdate: shipment.created_at || new Date().toISOString(),
      events: [],
    };
  }

  /**
   * Check whether Veeqo can handle the given shipment.
   * Requires an API key and the package must be within weight/size limits.
   */
  canHandle(request: RateRequest): boolean {
    if (!this.config.apiKey) {
      return false;
    }

    const weightLimit = CARRIER_WEIGHT_LIMITS[VEEQO_CARRIER_ID] ?? 150;
    const sizeLimit = CARRIER_MAX_LENGTH_PLUS_GIRTH[VEEQO_CARRIER_ID] ?? 165;

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
    return calculateDimensionalWeight(length, width, height, VEEQO_CARRIER_ID);
  }
}
