/**
 * @module @shipsmart/shared
 * Shared types and utilities for the American Tile Depot Shipping Platform.
 */

// Export all schema types and enums
export {
  // Enums
  OrderStatus,
  ShipmentType,
  ShipmentStatus,
  ReturnStatus,
  CarrierId,
  AuditAction,
  // Core types
  type Address,
  type LineItem,
  type Order,
  type Shipment,
  type ReturnEvent,
  type ReturnBoxDetail,
  type ReturnBoxLabel,
  type RateQuote,
  type CarrierQuote,
  type CarrierConfig,
  type AuditLog,
  type LabelRef,
  type BoxDetail,
  type PackageDetail,
  type ShipmentContext,
  type Timestamp,
  // Carrier gateway types
  type RateRequest,
  type LabelRequest,
  type LabelResponse,
  type TrackingStatus,
  type TrackingEvent,
} from './schemas';

// Export carrier constants and helpers
export {
  CARRIER_NAMES,
  DIMENSIONAL_WEIGHT_DIVISORS,
  CARRIER_WEIGHT_LIMITS,
  CARRIER_MAX_LENGTH_PLUS_GIRTH,
  DEFAULT_CARRIER_PRIORITY,
  calculateDimensionalWeight,
  calculateBillableWeight,
  exceedsWeightLimit,
  calculateLengthPlusGirth,
  exceedsSizeLimit,
} from './carriers';

// Export validation rules and functions
export {
  MAX_PACKAGE_WEIGHT_LBS,
  LTL_THRESHOLD_LBS,
  STANDARD_GROUND_WEIGHT_LIMIT_LBS,
  MAX_LENGTH_INCHES,
  MAX_WIDTH_INCHES,
  MAX_HEIGHT_INCHES,
  MAX_LENGTH_PLUS_GIRTH,
  MIN_LENGTH_INCHES,
  MIN_WIDTH_INCHES,
  MIN_HEIGHT_INCHES,
  REQUIRED_ADDRESS_FIELDS,
  US_STATES,
  validateWeight,
  validateDimensions,
  validateZipCode,
  validateStateCode,
  validatePhone,
  validateEmail,
} from './validation';
