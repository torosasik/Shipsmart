/**
 * Unit tests for dimensional weight calculations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateDimensionalWeight,
  calculateBillableWeight,
  calculateLengthPlusGirth,
  getDimensionalWeightDivisor,
} from './dimensional-weight';
import { CarrierId, DIMENSIONAL_WEIGHT_DIVISORS } from '@shipsmart/shared';

describe('calculateDimensionalWeight', () => {
  it('calculates dimensional weight correctly with default divisor', () => {
    // 12 x 12 x 12 inch box = 1728 cubic inches
    // 1728 / 139 = 12.43, rounded up = 13
    const dimWeight = calculateDimensionalWeight(12, 12, 12);
    expect(dimWeight).toBe(13);
  });

  it('calculates dimensional weight correctly with custom divisor', () => {
    // 24 x 18 x 12 = 5184 cubic inches
    // 5184 / 139 = 37.27, rounded up = 38
    const dimWeight = calculateDimensionalWeight(24, 18, 12, 139);
    expect(dimWeight).toBe(38);
  });

  it('calculates dimensional weight with 139 divisor (FedEx/UPS)', () => {
    // Standard 12x12x12 box
    const dimWeight = calculateDimensionalWeight(12, 12, 12, 139);
    expect(dimWeight).toBe(13);
  });

  it('calculates dimensional weight with 194 divisor (USPS)', () => {
    // Standard 12x12x12 box: 1728 / 194 = 8.9, rounded up = 9
    const dimWeight = calculateDimensionalWeight(12, 12, 12, 194);
    expect(dimWeight).toBe(9);
  });

  it('throws error for zero dimensions', () => {
    expect(() => calculateDimensionalWeight(0, 12, 12)).toThrow('Dimensions must be positive numbers');
  });

  it('throws error for negative dimensions', () => {
    expect(() => calculateDimensionalWeight(-1, 12, 12)).toThrow('Dimensions must be positive numbers');
  });

  it('throws error for zero divisor', () => {
    expect(() => calculateDimensionalWeight(12, 12, 12, 0)).toThrow('Divisor must be a positive number');
  });

  it('throws error for negative divisor', () => {
    expect(() => calculateDimensionalWeight(12, 12, 12, -1)).toThrow('Divisor must be a positive number');
  });

  it('handles small packages correctly', () => {
    // 6 x 4 x 2 = 48 cubic inches / 139 = 0.35, rounded up = 1
    const dimWeight = calculateDimensionalWeight(6, 4, 2);
    expect(dimWeight).toBe(1);
  });

  it('handles large packages correctly', () => {
    // 48 x 40 x 30 = 57,600 cubic inches / 139 = 414.39, rounded up = 415
    const dimWeight = calculateDimensionalWeight(48, 40, 30);
    expect(dimWeight).toBe(415);
  });
});

describe('calculateBillableWeight', () => {
  it('returns actual weight when greater than dimensional weight', () => {
    const billable = calculateBillableWeight(15, 10);
    expect(billable).toBe(15);
  });

  it('returns dimensional weight when greater than actual weight', () => {
    const billable = calculateBillableWeight(10, 15);
    expect(billable).toBe(15);
  });

  it('returns actual weight when equal to dimensional weight', () => {
    const billable = calculateBillableWeight(10, 10);
    expect(billable).toBe(10);
  });

  it('handles zero actual weight', () => {
    const billable = calculateBillableWeight(0, 15);
    expect(billable).toBe(15);
  });

  it('handles zero dimensional weight', () => {
    const billable = calculateBillableWeight(10, 0);
    expect(billable).toBe(10);
  });
});

describe('calculateLengthPlusGirth', () => {
  it('calculates length plus girth correctly', () => {
    // L + 2*(W + H) = 24 + 2*(12 + 10) = 24 + 44 = 68
    const result = calculateLengthPlusGirth(24, 12, 10);
    expect(result).toBe(68);
  });

  it('calculates for standard box', () => {
    // 12 + 2*(12 + 12) = 12 + 48 = 60
    const result = calculateLengthPlusGirth(12, 12, 12);
    expect(result).toBe(60);
  });

  it('calculates for flat package', () => {
    // 24 + 2*(18 + 2) = 24 + 40 = 64
    const result = calculateLengthPlusGirth(24, 18, 2);
    expect(result).toBe(64);
  });

  it('handles cubic package', () => {
    // 20 + 2*(20 + 20) = 20 + 80 = 100
    const result = calculateLengthPlusGirth(20, 20, 20);
    expect(result).toBe(100);
  });
});

describe('getDimensionalWeightDivisor', () => {
  it('returns correct divisor for UPS', () => {
    expect(getDimensionalWeightDivisor(CarrierId.UPS)).toBe(DIMENSIONAL_WEIGHT_DIVISORS[CarrierId.UPS]);
  });

  it('returns correct divisor for FedEx', () => {
    expect(getDimensionalWeightDivisor(CarrierId.FedEx)).toBe(DIMENSIONAL_WEIGHT_DIVISORS[CarrierId.FedEx]);
  });

  it('returns correct divisor for USPS', () => {
    expect(getDimensionalWeightDivisor(CarrierId.USPS)).toBe(DIMENSIONAL_WEIGHT_DIVISORS[CarrierId.USPS]);
  });

  it('throws error for unknown carrier', () => {
    expect(() => getDimensionalWeightDivisor('unknown' as CarrierId)).toThrow();
  });
});