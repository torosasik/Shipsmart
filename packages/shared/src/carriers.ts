/**
 * Carrier constants, weight limits, and dimensional weight configuration.
 * These values are used across the platform for rate calculations and validation.
 */

import { CarrierId } from './schemas';

// ============================================================================
// Carrier Display Names
// ============================================================================

/** Human-readable names for each carrier */
export const CARRIER_NAMES: Record<CarrierId, string> = {
  [CarrierId.UPS]: 'UPS',
  [CarrierId.FedEx]: 'FedEx',
  [CarrierId.USPS]: 'USPS',
  [CarrierId.Shippo]: 'Shippo',
  [CarrierId.LTL]: 'LTL Freight',
  [CarrierId.ShipStation]: 'ShipStation',
  [CarrierId.Veeqo]: 'Veeqo',
};

// ============================================================================
// Dimensional Weight Divisors
// ============================================================================

/**
 * Dimensional weight divisor by carrier.
 * Formula: dimWeight = (L × W × H) / divisor
 *
 * UPS and FedEx use 139 for domestic shipments.
 * USPS uses 166 for Priority Mail and 194 for retail.
 */
export const DIMENSIONAL_WEIGHT_DIVISORS: Record<CarrierId, number> = {
  [CarrierId.UPS]: 139,
  [CarrierId.FedEx]: 139,
  [CarrierId.USPS]: 166,
  [CarrierId.Shippo]: 139,
  [CarrierId.LTL]: 139,
  [CarrierId.ShipStation]: 139,
  [CarrierId.Veeqo]: 139,
};

// ============================================================================
// Weight Limits
// ============================================================================

/**
 * Maximum weight per package in lbs by carrier.
 * Packages exceeding these limits may require LTL freight or special handling.
 */
export const CARRIER_WEIGHT_LIMITS: Record<CarrierId, number> = {
  [CarrierId.UPS]: 150,
  [CarrierId.FedEx]: 150,
  [CarrierId.USPS]: 70,
  [CarrierId.Shippo]: 150,
  [CarrierId.LTL]: 10000,
  [CarrierId.ShipStation]: 150,
  [CarrierId.Veeqo]: 150,
};

/**
 * Maximum length + girth (2×width + 2×height) in inches by carrier.
 * Packages exceeding this limit may incur oversize charges.
 */
export const CARRIER_MAX_LENGTH_PLUS_GIRTH: Record<CarrierId, number> = {
  [CarrierId.UPS]: 165,
  [CarrierId.FedEx]: 165,
  [CarrierId.USPS]: 130,
  [CarrierId.Shippo]: 165,
  [CarrierId.LTL]: 9999,
  [CarrierId.ShipStation]: 165,
  [CarrierId.Veeqo]: 165,
};

// ============================================================================
// Default Carrier Configuration
// ============================================================================

/** Default priority order for displaying carriers in rate comparison */
export const DEFAULT_CARRIER_PRIORITY: Record<CarrierId, number> = {
  [CarrierId.UPS]: 1,
  [CarrierId.FedEx]: 2,
  [CarrierId.USPS]: 3,
  [CarrierId.Shippo]: 4,
  [CarrierId.LTL]: 5,
  [CarrierId.ShipStation]: 6,
  [CarrierId.Veeqo]: 7,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate dimensional weight for a package using a specific carrier's divisor.
 *
 * @param length - Package length in inches
 * @param width - Package width in inches
 * @param height - Package height in inches
 * @param carrier - Carrier to use for dimensional weight calculation
 * @returns Dimensional weight in lbs (rounded up)
 */
export function calculateDimensionalWeight(
  length: number,
  width: number,
  height: number,
  carrier: CarrierId,
): number {
  const divisor = DIMENSIONAL_WEIGHT_DIVISORS[carrier];
  return Math.ceil((length * width * height) / divisor);
}

/**
 * Calculate billable weight (greater of actual vs dimensional weight).
 *
 * @param actualWeight - Actual weight in lbs
 * @param dimensionalWeight - Calculated dimensional weight in lbs
 * @returns Billable weight in lbs
 */
export function calculateBillableWeight(
  actualWeight: number,
  dimensionalWeight: number,
): number {
  return Math.max(actualWeight, dimensionalWeight);
}

/**
 * Check if a package exceeds a carrier's weight limit.
 *
 * @param weight - Package weight in lbs
 * @param carrier - Carrier to check against
 * @returns True if the package exceeds the carrier's weight limit
 */
export function exceedsWeightLimit(weight: number, carrier: CarrierId): boolean {
  return weight > CARRIER_WEIGHT_LIMITS[carrier];
}

/**
 * Calculate length plus girth for a package.
 *
 * @param length - Package length in inches (longest dimension)
 * @param width - Package width in inches
 * @param height - Package height in inches
 * @returns Length plus girth in inches
 */
export function calculateLengthPlusGirth(
  length: number,
  width: number,
  height: number,
): number {
  return length + 2 * width + 2 * height;
}

/**
 * Check if a package exceeds a carrier's length plus girth limit.
 *
 * @param length - Package length in inches
 * @param width - Package width in inches
 * @param height - Package height in inches
 * @param carrier - Carrier to check against
 * @returns True if the package exceeds the carrier's size limit
 */
export function exceedsSizeLimit(
  length: number,
  width: number,
  height: number,
  carrier: CarrierId,
): boolean {
  const maxLengthPlusGirth = CARRIER_MAX_LENGTH_PLUS_GIRTH[carrier];
  return calculateLengthPlusGirth(length, width, height) > maxLengthPlusGirth;
}
