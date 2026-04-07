/**
 * Rate comparison engine for the ShipSmart shipping platform.
 * Queries multiple carriers in parallel, normalizes quotes,
 * applies optimization logic, and ranks results.
 */

import {
  CarrierId,
  CarrierQuote,
  RateRequest,
  PackageDetail,
  ShipmentContext,
} from '@shipsmart/shared';
import { LTL_THRESHOLD_LBS } from '@shipsmart/shared';
import { CarrierGateway as RealCarrierGateway } from './carriers/gateway';
import { getEnabledCarriers as getEnabledCarrierGateways } from './carriers';
import { withRetry, carrierCircuitBreakers } from '../utils/retry';

// ============================================================================
// Types
// ============================================================================

/** Multi-box split option for rate comparison */
export interface MultiBoxOption {
  /** Number of boxes in this configuration */
  boxCount: number;
  /** Individual box details */
  boxes: PackageDetail[];
  /** Best rate for this configuration in USD */
  bestRate: number;
  /** Carrier offering the best rate */
  bestCarrier: CarrierId;
}

/** Complete rate comparison response */
export interface RateComparisonResponse {
  /** All quotes from all carriers */
  quotes: CarrierQuote[];
  /** Cheapest quote */
  cheapest: CarrierQuote | null;
  /** Fastest delivery quote */
  fastest: CarrierQuote | null;
  /** Best value quote (cost/speed balance) */
  bestValue: CarrierQuote | null;
  /** Whether LTL freight is recommended */
  ltlRecommended: boolean;
  /** Multi-box optimization options */
  multiBoxOptions: MultiBoxOption[];
  /** Note about weight thresholds */
  weightThresholdNote: string | null;
  /** Rate shop session ID */
  sessionId: string;
  /** Timestamp of the rate shop */
  timestamp: Date;
}

// ============================================================================
// Rate Cache
// ============================================================================

/** Cache entry for rate quotes */
interface CacheEntry {
  /** Cached response */
  response: RateComparisonResponse;
  /** Cache expiration timestamp */
  expiresAt: number;
}

/** Rate cache with TTL */
const rateCache = new Map<string, CacheEntry>();

/** Default cache TTL in milliseconds (5 minutes) */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Generate a cache key from a rate request.
 */
function generateCacheKey(request: RateRequest): string {
  const packagesHash = request.packages
    .map(
      (p) =>
        `${p.weight}-${p.length}-${p.width}-${p.height}-${p.declaredValue}`,
    )
    .join('|');

  return `${request.fromAddress.zip}-${request.toAddress.zip}-${packagesHash}-${request.shipDate.toISOString().split('T')[0]}`;
}

/**
 * Check cache for a rate request.
 */
function checkCache(request: RateRequest): RateComparisonResponse | null {
  const key = generateCacheKey(request);
  const entry = rateCache.get(key);

  if (entry && entry.expiresAt > Date.now()) {
    return entry.response;
  }

  // Expired or missing
  if (entry) {
    rateCache.delete(key);
  }

  return null;
}

/**
 * Store a rate response in cache.
 */
function storeCache(request: RateRequest, response: RateComparisonResponse): void {
  const key = generateCacheKey(request);
  rateCache.set(key, {
    response,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// ============================================================================
// Carrier Gateway Integration
// ============================================================================

/**
 * Get carrier gateway instances for enabled carriers.
 * Uses the real carrier gateways from the carriers registry.
 * Each gateway calls the actual carrier API (UPS, FedEx, USPS, Shippo, LTL).
 */
function getCarrierGateways(): RealCarrierGateway[] {
  return getEnabledCarrierGateways();
}

// ============================================================================
// Rate Shopping Logic
// ============================================================================

/**
 * Shop rates across all enabled carriers in parallel.
 *
 * @param request - Rate request with shipment details
 * @returns Rate comparison response with ranked quotes
 */
export async function shopRates(request: RateRequest): Promise<RateComparisonResponse> {
  // Check cache first
  const cached = checkCache(request);
  if (cached) {
    return cached;
  }

  const sessionId = generateSessionId();
  const gateways = getCarrierGateways();

  // Query all carriers in parallel with retry and circuit breaker
  const ratePromises = gateways.map(async (gateway) => {
    const circuitBreaker = carrierCircuitBreakers[gateway.id];
    
    try {
      // Use circuit breaker and retry logic for external API calls
      const rate = circuitBreaker
        ? await circuitBreaker.execute(() => withRetry(() => gateway.getRate(request)))
        : await withRetry(() => gateway.getRate(request));
      return rate;
    } catch (error) {
      console.error(`[RateShop] Error fetching rate from ${gateway.id}:`, error);
      return null;
    }
  });

  const results = await Promise.all(ratePromises);
  const quotes = results.filter((q): q is CarrierQuote => q !== null);

  // Check if LTL is recommended
  const totalWeight = request.packages.reduce((sum, p) => sum + p.weight, 0);
  const ltlRecommended = totalWeight >= LTL_THRESHOLD_LBS;

  // Generate multi-box options
  const multiBoxOptions = generateMultiBoxOptions(request);

  // Rank quotes
  const rankedQuotes = rankQuotes(quotes);

  // Build response
  const response: RateComparisonResponse = {
    quotes: rankedQuotes,
    cheapest: rankedQuotes.find((q) => q.isCheapest) || null,
    fastest: rankedQuotes.find((q) => q.isFastest) || null,
    bestValue: rankedQuotes.find((q) => q.isBestValue) || null,
    ltlRecommended,
    multiBoxOptions,
    weightThresholdNote: generateWeightThresholdNote(totalWeight),
    sessionId,
    timestamp: new Date(),
  };

  // Cache the response
  storeCache(request, response);

  return response;
}

/**
 * Rank quotes and mark cheapest, fastest, and best value.
 */
function rankQuotes(quotes: CarrierQuote[]): CarrierQuote[] {
  if (quotes.length === 0) return [];

  // Find cheapest
  const cheapest = quotes.reduce((min, q) => (q.rate < min.rate ? q : min));
  cheapest.isCheapest = true;

  // Find fastest
  const fastest = quotes.reduce((min, q) =>
    q.estimatedDays < min.estimatedDays ? q : min,
  );
  fastest.isFastest = true;

  // Calculate best value using weighted score
  const bestValue = calculateBestValue(quotes);
  if (bestValue) {
    bestValue.isBestValue = true;
  }

  // Sort by priority: cheapest first, then by carrier priority
  const sorted = [...quotes].sort((a, b) => {
    if (a.isCheapest && !b.isCheapest) return -1;
    if (!a.isCheapest && b.isCheapest) return 1;
    if (a.isBestValue && !b.isBestValue) return -1;
    if (!a.isBestValue && b.isBestValue) return 1;
    return a.rate - b.rate;
  });

  return sorted;
}

/**
 * Calculate best value using weighted cost/speed score.
 * Score = (normalized_cost * 0.6) + (normalized_speed * 0.4)
 */
function calculateBestValue(quotes: CarrierQuote[]): CarrierQuote | null {
  if (quotes.length === 0) return null;
  if (quotes.length === 1) return quotes[0];

  const minRate = Math.min(...quotes.map((q) => q.rate));
  const maxRate = Math.max(...quotes.map((q) => q.rate));
  const minDays = Math.min(...quotes.map((q) => q.estimatedDays));
  const maxDays = Math.max(...quotes.map((q) => q.estimatedDays));

  const rateRange = maxRate - minRate || 1;
  const daysRange = maxDays - minDays || 1;

  let bestQuote: CarrierQuote | null = null;
  let bestScore = Infinity;

  for (const quote of quotes) {
    const normalizedCost = (quote.rate - minRate) / rateRange;
    const normalizedSpeed = (quote.estimatedDays - minDays) / daysRange;
    const score = normalizedCost * 0.6 + normalizedSpeed * 0.4;

    if (score < bestScore) {
      bestScore = score;
      bestQuote = quote;
    }
  }

  return bestQuote;
}

// ============================================================================
// Multi-Box Optimization
// ============================================================================

/**
 * Generate multi-box split options for rate comparison.
 *
 * @param request - Original rate request
 * @returns Array of multi-box options with rates
 */
export function generateMultiBoxOptions(
  request: RateRequest,
): MultiBoxOption[] {
  const options: MultiBoxOption[] = [];
  const totalWeight = request.packages.reduce((sum, p) => sum + p.weight, 0);

  if (request.packages.length === 0) return options;

  const pkg = request.packages[0];

  // Option 1: Single box (original configuration)
  options.push({
    boxCount: 1,
    boxes: request.packages,
    bestRate: 0, // Will be calculated
    bestCarrier: CarrierId.UPS,
  });

  // Option 2: Split at 70 lbs (USPS limit)
  if (totalWeight > 70) {
    const boxCount = Math.ceil(totalWeight / 70);
    const weightPerBox = totalWeight / boxCount;
    const splitBoxes: PackageDetail[] = Array.from({ length: boxCount }, () => ({
      weight: weightPerBox,
      length: pkg.length,
      width: pkg.width,
      height: pkg.height,
      declaredValue: pkg.declaredValue / boxCount,
    }));

    options.push({
      boxCount,
      boxes: splitBoxes,
      bestRate: 0,
      bestCarrier: CarrierId.UPS,
    });
  }

  // Option 3: Split at 50 lbs (optimal for many carriers)
  if (totalWeight > 50) {
    const boxCount = Math.ceil(totalWeight / 50);
    const weightPerBox = totalWeight / boxCount;
    const splitBoxes: PackageDetail[] = Array.from({ length: boxCount }, () => ({
      weight: weightPerBox,
      length: pkg.length,
      width: pkg.width,
      height: pkg.height,
      declaredValue: pkg.declaredValue / boxCount,
    }));

    // Avoid duplicate if same as 70 lbs split
    if (boxCount !== options[options.length - 1].boxCount) {
      options.push({
        boxCount,
        boxes: splitBoxes,
        bestRate: 0,
        bestCarrier: CarrierId.UPS,
      });
    }
  }

  return options;
}

/**
 * Calculate rates for multi-box options.
 */
export async function calculateMultiBoxRates(
  request: RateRequest,
  options: MultiBoxOption[],
): Promise<MultiBoxOption[]> {
  const gateways = getCarrierGateways();

  const updatedOptions = await Promise.all(
    options.map(async (option) => {
      const multiPkgRequest: RateRequest = {
        ...request,
        packages: option.boxes,
      };

      const ratePromises = gateways.map(async (gateway) => {
        const circuitBreaker = carrierCircuitBreakers[gateway.id];
        
        try {
          // Use circuit breaker and retry logic for external API calls
          const rate = circuitBreaker
            ? await circuitBreaker.execute(() => withRetry(() => gateway.getRate(multiPkgRequest)))
            : await withRetry(() => gateway.getRate(multiPkgRequest));
          return rate;
        } catch {
          return null;
        }
      });

      const results = await Promise.all(ratePromises);
      const quotes = results.filter((q): q is CarrierQuote => q !== null);

      // Sum up rates for all packages
      const totalRate = quotes.reduce((sum, q) => sum + q.rate, 0);
      const bestCarrier =
        quotes.length > 0
          ? quotes.reduce((min, q) => (q.rate < min.rate ? q : min)).carrier
          : CarrierId.UPS;

      return {
        ...option,
        bestRate: Math.round(totalRate * 100) / 100,
        bestCarrier,
      };
    }),
  );

  return updatedOptions.sort((a, b) => a.bestRate - b.bestRate);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique session ID for rate shop sessions.
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `rs-${timestamp}-${random}`;
}

/**
 * Generate a weight threshold note based on total weight.
 */
function generateWeightThresholdNote(totalWeight: number): string | null {
  if (totalWeight >= LTL_THRESHOLD_LBS) {
    return `Total weight (${totalWeight} lbs) exceeds LTL threshold (${LTL_THRESHOLD_LBS} lbs). LTL freight may be more cost-effective.`;
  }
  if (totalWeight > 70) {
    return `Total weight (${totalWeight} lbs) exceeds standard parcel limits. Consider splitting into multiple boxes.`;
  }
  if (totalWeight > 50) {
    return `Total weight (${totalWeight} lbs) is approaching parcel limits. Multi-box options may offer better rates.`;
  }
  return null;
}

/**
 * Build shipment context from a rate request for Firestore storage.
 */
export function buildShipmentContext(request: RateRequest): ShipmentContext {
  const totalWeight = request.packages.reduce((sum, p) => sum + p.weight, 0);
  const declaredValue = request.packages.reduce(
    (sum, p) => sum + p.declaredValue,
    0,
  );

  return {
    fromAddress: request.fromAddress,
    toAddress: request.toAddress,
    packages: request.packages,
    totalWeight,
    declaredValue,
  };
}

/**
 * Clear the rate cache.
 */
export function clearRateCache(): void {
  rateCache.clear();
}

/**
 * Get cache statistics for monitoring.
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: rateCache.size,
    entries: Array.from(rateCache.keys()),
  };
}
