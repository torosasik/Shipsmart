/**
 * Carrier Gateway interface for the ShipSmart shipping platform.
 * Defines the contract that all carrier adapters must implement.
 */

import {
  CarrierId,
  RateRequest,
  CarrierQuote,
  LabelRequest,
  LabelResponse,
  TrackingStatus,
} from '@shipsmart/shared';

/**
 * CarrierGateway interface defines the methods that all carrier adapters
 * must implement to interact with carrier APIs.
 */
export interface CarrierGateway {
  /** Unique identifier for this carrier */
  readonly id: CarrierId;

  /** Human-readable carrier name */
  readonly name: string;

  /** Whether this carrier is currently enabled */
  readonly enabled: boolean;

  /**
   * Get rate quote for a shipment.
   *
   * @param request - Rate request with shipment details
   * @returns Carrier quote with pricing and delivery estimates
   */
  getRate(request: RateRequest): Promise<CarrierQuote>;

  /**
   * Generate a shipping label.
   *
   * @param request - Label request with shipment details
   * @returns Label response with tracking number and label URL
   */
  createLabel(request: LabelRequest): Promise<LabelResponse>;

  /**
   * Void/cancel a shipping label.
   *
   * @param trackingNumber - Tracking number of the label to void
   * @returns Whether the void was successful
   */
  voidLabel(trackingNumber: string): Promise<boolean>;

  /**
   * Get tracking status for a package.
   *
   * @param trackingNumber - Tracking number to look up
   * @returns Tracking status with current location and events
   */
  trackPackage(trackingNumber: string): Promise<TrackingStatus>;

  /**
   * Check if this carrier can handle a given shipment request.
   *
   * @param request - Rate request to check
   * @returns Whether the carrier can handle this shipment
   */
  canHandle(request: RateRequest): boolean;

  /**
   * Calculate dimensional weight for this carrier.
   *
   * @param length - Package length in inches
   * @param width - Package width in inches
   * @param height - Package height in inches
   * @returns Dimensional weight in lbs (rounded up)
   */
  calcDimensionalWeight(length: number, width: number, height: number): number;
}

/**
 * Base class for carrier gateways with common functionality.
 */
export abstract class BaseCarrierGateway implements CarrierGateway {
  abstract readonly id: CarrierId;
  abstract readonly name: string;
  abstract readonly enabled: boolean;

  abstract getRate(request: RateRequest): Promise<CarrierQuote>;
  abstract createLabel(request: LabelRequest): Promise<LabelResponse>;
  abstract voidLabel(trackingNumber: string): Promise<boolean>;
  abstract trackPackage(trackingNumber: string): Promise<TrackingStatus>;
  abstract canHandle(request: RateRequest): boolean;
  abstract calcDimensionalWeight(
    length: number,
    width: number,
    height: number,
  ): number;

  /**
   * Validate that a rate request has all required fields.
   *
   * @param request - Rate request to validate
   * @throws Error if validation fails
   */
  protected validateRateRequest(request: RateRequest): void {
    if (!request.fromAddress) {
      throw new Error('Missing fromAddress');
    }
    if (!request.toAddress) {
      throw new Error('Missing toAddress');
    }
    if (!request.packages || request.packages.length === 0) {
      throw new Error('Missing packages');
    }
    if (!request.shipDate) {
      throw new Error('Missing shipDate');
    }

    // Validate addresses
    const fromAddr = request.fromAddress;
    if (!fromAddr.street1 || !fromAddr.city || !fromAddr.state || !fromAddr.zip || !fromAddr.country) {
      throw new Error('fromAddress is missing required fields');
    }

    const toAddr = request.toAddress;
    if (!toAddr.street1 || !toAddr.city || !toAddr.state || !toAddr.zip || !toAddr.country) {
      throw new Error('toAddress is missing required fields');
    }

    // Validate packages
    for (let i = 0; i < request.packages.length; i++) {
      const pkg = request.packages[i];
      if (!pkg.weight || pkg.weight <= 0) {
        throw new Error(`Package ${i + 1}: Invalid weight`);
      }
      if (!pkg.length || pkg.length <= 0) {
        throw new Error(`Package ${i + 1}: Invalid length`);
      }
      if (!pkg.width || pkg.width <= 0) {
        throw new Error(`Package ${i + 1}: Invalid width`);
      }
      if (!pkg.height || pkg.height <= 0) {
        throw new Error(`Package ${i + 1}: Invalid height`);
      }
    }
  }

  /**
   * Log a carrier API request for debugging.
   */
  protected logRequest(method: string, data: unknown): void {
    console.log(
      `[${this.name}] ${method}:`,
      JSON.stringify(data, null, 2),
    );
  }

  /**
   * Log a carrier API response for debugging.
   */
  protected logResponse(method: string, data: unknown): void {
    console.log(
      `[${this.name}] ${method} response:`,
      JSON.stringify(data, null, 2),
    );
  }

  /**
   * Log a carrier API error.
   */
  protected logError(method: string, error: unknown): void {
    console.error(`[${this.name}] ${method} error:`, error);
  }
}
