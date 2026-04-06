/**
 * Dimensional weight calculation utilities.
 *
 * These functions wrap and extend the shared package's dimensional weight
 * helpers with additional backend-specific logic.
 */

import {
  CarrierId,
  DIMENSIONAL_WEIGHT_DIVISORS,
  calculateBillableWeight as sharedCalculateBillableWeight,
  calculateLengthPlusGirth as sharedCalculateLengthPlusGirth,
} from '@shipsmart/shared';

/**
 * Calculate dimensional weight for a package.
 *
 * Formula: dimWeight = (L × W × H) / divisor
 *
 * @param length - Package length in inches
 * @param width - Package width in inches
 * @param height - Package height in inches
 * @param divisor - Dimensional weight divisor (defaults to 139)
 * @returns Dimensional weight in lbs (rounded up)
 */
export function calculateDimensionalWeight(
  length: number,
  width: number,
  height: number,
  divisor: number = 139,
): number {
  if (length <= 0 || width <= 0 || height <= 0) {
    throw new Error('Dimensions must be positive numbers');
  }
  if (divisor <= 0) {
    throw new Error('Divisor must be a positive number');
  }

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
  return sharedCalculateBillableWeight(actualWeight, dimensionalWeight);
}

/**
 * Get the dimensional weight divisor for a specific carrier.
 *
 * @param carrierId - Carrier identifier
 * @returns Dimensional weight divisor for the carrier
 * @throws Error if carrier is not found in configuration
 */
export function getDimensionalWeightDivisor(carrierId: CarrierId): number {
  const divisor = DIMENSIONAL_WEIGHT_DIVISORS[carrierId];
  if (divisor === undefined) {
    throw new Error(`Unknown carrier: ${carrierId}`);
  }
  return divisor;
}

/**
 * Calculate length plus girth for a package.
 *
 * Formula: L + 2×(W + H)
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
  return sharedCalculateLengthPlusGirth(length, width, height);
}
