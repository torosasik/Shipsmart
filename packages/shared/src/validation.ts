/**
 * Shared validation rules for shipping data.
 * These constants define limits used across the platform.
 */

// ============================================================================
// Weight Limits
// ============================================================================

/** Maximum weight for a single package in lbs (general limit) */
export const MAX_PACKAGE_WEIGHT_LBS = 150;

/** Weight threshold where LTL freight becomes cost-effective */
export const LTL_THRESHOLD_LBS = 150;

/** Standard UPS/FedEx ground weight limit */
export const STANDARD_GROUND_WEIGHT_LIMIT_LBS = 70;

// ============================================================================
// Dimension Limits
// ============================================================================

/** Maximum length for a single package in inches */
export const MAX_LENGTH_INCHES = 48;

/** Maximum width for a single package in inches */
export const MAX_WIDTH_INCHES = 48;

/** Maximum height for a single package in inches */
export const MAX_HEIGHT_INCHES = 48;

/** Maximum length + girth (2W + 2H) in inches */
export const MAX_LENGTH_PLUS_GIRTH = 165;

/** Minimum length for a package in inches */
export const MIN_LENGTH_INCHES = 3;

/** Minimum width for a package in inches */
export const MIN_WIDTH_INCHES = 3;

/** Minimum height for a package in inches */
export const MIN_HEIGHT_INCHES = 0.25;

// ============================================================================
// Address Validation
// ============================================================================

/** Required fields for a valid address */
export const REQUIRED_ADDRESS_FIELDS = [
  'name',
  'street1',
  'city',
  'state',
  'zip',
  'country',
] as const;

/** Valid US state codes */
export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR',
] as const;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate that a weight is within acceptable limits.
 *
 * @param weight - Weight in lbs to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validateWeight(weight: number): { isValid: boolean; error?: string } {
  if (typeof weight !== 'number' || isNaN(weight)) {
    return { isValid: false, error: 'Weight must be a number' };
  }
  if (weight <= 0) {
    return { isValid: false, error: 'Weight must be greater than 0' };
  }
  if (weight > MAX_PACKAGE_WEIGHT_LBS) {
    return {
      isValid: false,
      error: `Weight exceeds maximum package limit of ${MAX_PACKAGE_WEIGHT_LBS} lbs`,
    };
  }
  return { isValid: true };
}

/**
 * Validate that dimensions are within acceptable limits.
 *
 * @param length - Length in inches
 * @param width - Width in inches
 * @param height - Height in inches
 * @returns Object with isValid flag and error message if invalid
 */
export function validateDimensions(
  length: number,
  width: number,
  height: number,
): { isValid: boolean; error?: string } {
  // Check minimum dimensions
  if (length < MIN_LENGTH_INCHES) {
    return { isValid: false, error: `Length must be at least ${MIN_LENGTH_INCHES} inches` };
  }
  if (width < MIN_WIDTH_INCHES) {
    return { isValid: false, error: `Width must be at least ${MIN_WIDTH_INCHES} inches` };
  }
  if (height < MIN_HEIGHT_INCHES) {
    return { isValid: false, error: `Height must be at least ${MIN_HEIGHT_INCHES} inches` };
  }

  // Check maximum dimensions
  if (length > MAX_LENGTH_INCHES) {
    return { isValid: false, error: `Length exceeds maximum of ${MAX_LENGTH_INCHES} inches` };
  }
  if (width > MAX_WIDTH_INCHES) {
    return { isValid: false, error: `Width exceeds maximum of ${MAX_WIDTH_INCHES} inches` };
  }
  if (height > MAX_HEIGHT_INCHES) {
    return { isValid: false, error: `Height exceeds maximum of ${MAX_HEIGHT_INCHES} inches` };
  }

  // Check length + girth
  const lengthPlusGirth = length + 2 * width + 2 * height;
  if (lengthPlusGirth > MAX_LENGTH_PLUS_GIRTH) {
    return {
      isValid: false,
      error: `Length + girth (${lengthPlusGirth}") exceeds maximum of ${MAX_LENGTH_PLUS_GIRTH}"`,
    };
  }

  return { isValid: true };
}

/**
 * Validate a US ZIP code format.
 *
 * @param zip - ZIP code to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validateZipCode(zip: string): { isValid: boolean; error?: string } {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  if (!zipRegex.test(zip)) {
    return { isValid: false, error: 'ZIP code must be in format 12345 or 12345-6789' };
  }
  return { isValid: true };
}

/**
 * Validate a US state code.
 *
 * @param state - State code to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validateStateCode(state: string): { isValid: boolean; error?: string } {
  if (!US_STATES.includes(state as (typeof US_STATES)[number])) {
    return { isValid: false, error: `Invalid state code: ${state}` };
  }
  return { isValid: true };
}

/**
 * Validate a phone number format.
 *
 * @param phone - Phone number to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validatePhone(phone: string): { isValid: boolean; error?: string } {
  const phoneRegex = /^\+?1?\d{10,11}$/;
  const cleaned = phone.replace(/[\s()-]/g, '');
  if (!phoneRegex.test(cleaned)) {
    return { isValid: false, error: 'Phone number must be a valid US format' };
  }
  return { isValid: true };
}

/**
 * Validate an email address format.
 *
 * @param email - Email address to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  return { isValid: true };
}
