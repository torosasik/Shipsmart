/**
 * Unit tests for address normalization and validation logic.
 */

import { describe, it, expect } from 'vitest';
import {
  validateWeight,
  validateDimensions,
  validateZipCode,
  validateStateCode,
  validatePhone,
  validateEmail,
  MAX_PACKAGE_WEIGHT_LBS,
  MIN_LENGTH_INCHES,
  MAX_LENGTH_INCHES,
} from './validation';

describe('validateWeight', () => {
  it('validates weight within limits', () => {
    const result = validateWeight(10);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('validates maximum weight', () => {
    const result = validateWeight(MAX_PACKAGE_WEIGHT_LBS);
    expect(result.isValid).toBe(true);
  });

  it('returns invalid for zero weight', () => {
    const result = validateWeight(0);
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns invalid for negative weight', () => {
    const result = validateWeight(-5);
    expect(result.isValid).toBe(false);
  });

  it('returns invalid for weight over limit', () => {
    const result = validateWeight(MAX_PACKAGE_WEIGHT_LBS + 1);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('exceeds maximum');
  });
});

describe('validateDimensions', () => {
  it('validates dimensions within limits', () => {
    const result = validateDimensions(12, 12, 12);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('validates minimum dimensions', () => {
    const result = validateDimensions(MIN_LENGTH_INCHES, 3, 0.25);
    expect(result.isValid).toBe(true);
  });

  it('validates maximum dimensions', () => {
    const result = validateDimensions(MAX_LENGTH_INCHES, 48, 48);
    expect(result.isValid).toBe(true);
  });

  it('returns invalid for zero dimensions', () => {
    const result = validateDimensions(0, 12, 12);
    expect(result.isValid).toBe(false);
  });

  it('returns invalid for negative dimensions', () => {
    const result = validateDimensions(-1, 12, 12);
    expect(result.isValid).toBe(false);
  });

  it('returns invalid for dimensions over maximum', () => {
    const result = validateDimensions(MAX_LENGTH_INCHES + 1, 12, 12);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('exceeds maximum');
  });

  it('validates length plus girth limit', () => {
    // 100 + 2*48 + 2*48 = 292 > 165, should fail
    const result = validateDimensions(100, 48, 48);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('girth');
  });
});

describe('validateZipCode', () => {
  it('validates 5-digit ZIP code', () => {
    const result = validateZipCode('60601');
    expect(result.isValid).toBe(true);
  });

  it('validates 9-digit ZIP code', () => {
    const result = validateZipCode('60601-1234');
    expect(result.isValid).toBe(true);
  });

  it('returns invalid for invalid ZIP code', () => {
    const result = validateZipCode('invalid');
    expect(result.isValid).toBe(false);
  });

  it('returns invalid for empty ZIP code', () => {
    const result = validateZipCode('');
    expect(result.isValid).toBe(false);
  });
});

describe('validateStateCode', () => {
  it('validates uppercase state code', () => {
    const result = validateStateCode('IL');
    expect(result.isValid).toBe(true);
  });

  it('validates lowercase state code', () => {
    const result = validateStateCode('il');
    expect(result.isValid).toBe(true);
  });

  it('returns invalid for invalid state code', () => {
    const result = validateStateCode('XX');
    expect(result.isValid).toBe(false);
  });

  it('returns invalid for empty state code', () => {
    const result = validateStateCode('');
    expect(result.isValid).toBe(false);
  });
});

describe('validatePhone', () => {
  it('validates E.164 format phone number', () => {
    const result = validatePhone('+13105550100');
    expect(result.isValid).toBe(true);
  });

  it('validates 10-digit phone number', () => {
    const result = validatePhone('3105550100');
    expect(result.isValid).toBe(true);
  });

  it('returns invalid for invalid phone number', () => {
    const result = validatePhone('invalid');
    expect(result.isValid).toBe(false);
  });

  it('returns invalid for too short phone number', () => {
    const result = validatePhone('123');
    expect(result.isValid).toBe(false);
  });
});

describe('validateEmail', () => {
  it('validates email format', () => {
    const result = validateEmail('test@example.com');
    expect(result.isValid).toBe(true);
  });

  it('validates email with dots', () => {
    const result = validateEmail('user.name@domain.org');
    expect(result.isValid).toBe(true);
  });

  it('returns invalid for invalid email format', () => {
    const result = validateEmail('invalid');
    expect(result.isValid).toBe(false);
  });

  it('returns invalid for empty email', () => {
    const result = validateEmail('');
    expect(result.isValid).toBe(false);
  });
});