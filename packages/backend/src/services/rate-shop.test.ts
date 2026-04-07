/**
 * Unit tests for rate comparison engine.
 * Tests known inputs/outputs for the rate shopping and multi-box optimization.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateRequest, CarrierId, Address } from '@shipsmart/shared';
import {
  shopRates,
  generateMultiBoxOptions,
  clearRateCache,
  getCacheStats,
} from './rate-shop';

// Test fixtures
const TEST_FROM_ADDRESS: Address = {
  name: 'Test Sender',
  street1: '123 Warehouse St',
  city: 'Chicago',
  state: 'IL',
  zip: '60601',
  country: 'US',
};

const TEST_TO_ADDRESS: Address = {
  name: 'Test Recipient',
  street1: '456 Main St',
  city: 'Los Angeles',
  state: 'CA',
  zip: '90001',
  country: 'US',
};

const TEST_PACKAGE = {
  weight: 10,
  length: 12,
  width: 12,
  height: 12,
  declaredValue: 100,
};

// Create a valid test request
function createRateRequest(overrides?: Partial<RateRequest>): RateRequest {
  return {
    fromAddress: TEST_FROM_ADDRESS,
    toAddress: TEST_TO_ADDRESS,
    packages: [TEST_PACKAGE],
    shipDate: new Date('2025-01-15'),
    ...overrides,
  };
}

describe('generateMultiBoxOptions', () => {
  beforeEach(() => {
    clearRateCache();
  });

  it('returns single box option for packages under 50 lbs', () => {
    const request = createRateRequest({
      packages: [{ ...TEST_PACKAGE, weight: 30 }],
    });

    const options = generateMultiBoxOptions(request);

    expect(options).toHaveLength(1);
    expect(options[0].boxCount).toBe(1);
  });

  it('generates 70 lb split option for packages over 70 lbs', () => {
    const request = createRateRequest({
      packages: [{ ...TEST_PACKAGE, weight: 100 }],
    });

    const options = generateMultiBoxOptions(request);

    // Should have single box + 70lb split
    const multiBoxOptions = options.filter((o) => o.boxCount > 1);
    expect(multiBoxOptions.length).toBeGreaterThan(0);

    // 100 lbs / 70 lbs = 2 boxes (round up)
    const box70Option = options.find((o) => o.boxCount === 2);
    expect(box70Option).toBeDefined();
    expect(box70Option?.boxes).toHaveLength(2);
  });

  it('generates 50 lb split option for packages over 50 lbs', () => {
    const request = createRateRequest({
      packages: [{ ...TEST_PACKAGE, weight: 80 }],
    });

    const options = generateMultiBoxOptions(request);

    // 80 lbs / 50 lbs = 2 boxes
    const box50Option = options.find((o) => o.boxCount === 2);
    expect(box50Option).toBeDefined();
  });

  it('calculates correct weight per box when splitting', () => {
    const request = createRateRequest({
      packages: [{ ...TEST_PACKAGE, weight: 100 }],
    });

    const options = generateMultiBoxOptions(request);
    const multiBoxOption = options.find((o) => o.boxCount === 2);

    expect(multiBoxOption).toBeDefined();
    const weightPerBox = multiBoxOption!.boxes[0].weight;
    expect(weightPerBox).toBe(50);
  });

  it('splits declared value across boxes', () => {
    const request = createRateRequest({
      packages: [{ ...TEST_PACKAGE, weight: 100, declaredValue: 200 }],
    });

    const options = generateMultiBoxOptions(request);
    const multiBoxOption = options.find((o) => o.boxCount === 2);

    expect(multiBoxOption).toBeDefined();
    const valuePerBox = multiBoxOption!.boxes[0].declaredValue;
    expect(valuePerBox).toBe(100); // 200 / 2
  });

  it('handles multiple input packages', () => {
    const request = createRateRequest({
      packages: [
        { ...TEST_PACKAGE, weight: 25 },
        { ...TEST_PACKAGE, weight: 25 },
      ],
    });

    const options = generateMultiBoxOptions(request);

    expect(options).toHaveLength(1); // 50 total, single box option only
  });

  it('returns empty array for empty packages', () => {
    const request = createRateRequest({
      packages: [],
    });

    const options = generateMultiBoxOptions(request);

    expect(options).toHaveLength(0);
  });
});

describe('shopRates', () => {
  beforeEach(() => {
    clearRateCache();
  });

  it('returns rate comparison response', async () => {
    const request = createRateRequest();
    const result = await shopRates(request);

    expect(result).toHaveProperty('quotes');
    expect(result).toHaveProperty('cheapest');
    expect(result).toHaveProperty('fastest');
    expect(result).toHaveProperty('bestValue');
    expect(result).toHaveProperty('sessionId');
    expect(result).toHaveProperty('timestamp');
  });

  it('includes multi-box options', async () => {
    const request = createRateRequest({
      packages: [{ ...TEST_PACKAGE, weight: 100 }],
    });

    const result = await shopRates(request);

    expect(result.multiBoxOptions).toBeDefined();
    expect(result.multiBoxOptions.length).toBeGreaterThan(0);
  });

  it('caches rate requests', async () => {
    const request = createRateRequest();

    // First request
    const result1 = await shopRates(request);

    // Second request (should use cache)
    const result2 = await shopRates(request);

    // Both should have same sessionId due to caching
    expect(result1.sessionId).toBe(result2.sessionId);
  });

  it('includes weight threshold note for heavy packages', async () => {
    const request = createRateRequest({
      packages: [{ ...TEST_PACKAGE, weight: 150 }],
    });

    const result = await shopRates(request);

    expect(result.weightThresholdNote).toBeDefined();
    expect(result.weightThresholdNote).toContain('150');
  });

  it('recommends LTL for heavy packages', async () => {
    const request = createRateRequest({
      packages: [{ ...TEST_PACKAGE, weight: 150 }],
    });

    const result = await shopRates(request);

    expect(result.ltlRecommended).toBe(true);
  });
});

describe('clearRateCache', () => {
  it('clears all cached entries', async () => {
    const request = createRateRequest();

    // First, populate cache
    await shopRates(request);

    // Verify cache has entries
    const statsBefore = getCacheStats();
    expect(statsBefore.size).toBeGreaterThan(0);

    // Clear cache
    clearRateCache();

    // Verify cache is empty
    const statsAfter = getCacheStats();
    expect(statsAfter.size).toBe(0);
  });
});

describe('getCacheStats', () => {
  it('returns empty stats for empty cache', () => {
    clearRateCache();

    const stats = getCacheStats();

    expect(stats.size).toBe(0);
    expect(stats.entries).toHaveLength(0);
  });
});