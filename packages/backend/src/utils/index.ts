/**
 * Re-export all backend utility functions.
 *
 * Import from this central index for convenience:
 * ```ts
 * import { calculateDimensionalWeight, formatCurrency, calculateZone } from '@/utils';
 * ```
 */

// Dimensional weight utilities
export {
  calculateDimensionalWeight,
  calculateBillableWeight,
  getDimensionalWeightDivisor,
  calculateLengthPlusGirth,
} from './dimensional-weight';

// Zone calculation utilities
export {
  calculateZone,
  getZoneDescription,
  estimateTransitTime,
} from './zone';

// Formatting utilities
export {
  formatCurrency,
  formatAddress,
  formatTrackingUrl,
  formatWeight,
  formatDate,
  formatDateTime,
} from './formatting';
