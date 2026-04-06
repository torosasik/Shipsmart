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
import {
  calculateDimensionalWeight,
  calculateBillableWeight,
  exceedsWeightLimit,
  exceedsSizeLimit,
  LTL_THRESHOLD_LBS,
} from '@shipsmart/shared';

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

/** Carrier registry entry */
interface CarrierEntry {
  /** Carrier ID */
  id: CarrierId;
  /** Whether this carrier is enabled */
  enabled: boolean;
  /** Priority order for display */
  priority: number;
}

// ============================================================================
// Carrier Registry
// ============================================================================

/** Default carrier configuration */
const DEFAULT_CARRIERS: CarrierEntry[] = [
  { id: CarrierId.UPS, enabled: true, priority: 1 },
  { id: CarrierId.FedEx, enabled: true, priority: 2 },
  { id: CarrierId.USPS, enabled: true, priority: 3 },
  { id: CarrierId.Shippo, enabled: false, priority: 4 },
  { id: CarrierId.LTL, enabled: true, priority: 5 },
];

/**
 * Get enabled carriers for rate shopping.
 * In production, this would query Firestore for carrierConfigs.
 */
function getEnabledCarriers(): CarrierEntry[] {
  // TODO: Fetch from Firestore carrierConfigs collection
  return DEFAULT_CARRIERS.filter((c) => c.enabled);
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
// Carrier Gateway Interface
// ============================================================================

/**
 * Placeholder for carrier gateway calls.
 * In production, each carrier adapter would implement this interface.
 */
interface CarrierGateway {
  /** Carrier ID */
  readonly id: CarrierId;
  /** Get rate quote for a shipment */
  getRate(request: RateRequest): Promise<CarrierQuote | null>;
}

/**
 * Mock carrier gateway for development.
 * Replace with real carrier API calls in production.
 */
class MockCarrierGateway implements CarrierGateway {
  constructor(readonly id: CarrierId) {}

  async getRate(request: RateRequest): Promise<CarrierQuote | null> {
    // Simulate API latency
    await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200));

    if (request.packages.length === 0) return null;

    // Calculate total rate for all packages
    let totalRate = 0;
    let totalDimWeight = 0;
    let totalBillableWeight = 0;

    for (const pkg of request.packages) {
      const dimWeight = calculateDimensionalWeight(
        pkg.length,
        pkg.width,
        pkg.height,
        this.id,
      );
      const billableWeight = calculateBillableWeight(pkg.weight, dimWeight);

      // Check if carrier can handle this package
      if (exceedsWeightLimit(billableWeight, this.id)) {
        if (this.id === CarrierId.LTL) {
          // LTL can handle heavy packages - continue processing
        } else {
          return null;
        }
      }

      // Check size limits
      if (exceedsSizeLimit(pkg.length, pkg.width, pkg.height, this.id)) {
        if (this.id === CarrierId.LTL) {
          // LTL can handle oversized packages - continue processing
        } else {
          return null;
        }
      }

      totalDimWeight += dimWeight;
      totalBillableWeight += billableWeight;
    }

    // Generate mock rate based on total weight and zone
    const zone = this.calculateZone(request.fromAddress.zip, request.toAddress.zip);
    const baseRate = this.getBaseRate(zone);
    const weightSurcharge = totalBillableWeight * this.getWeightMultiplier();
    totalRate = baseRate + weightSurcharge;

    const estimatedDays = this.getEstimatedDays(zone);

    // For LTL, use combined calculation
    if (this.id === CarrierId.LTL) {
      return this.generateLTLQuote(request, totalBillableWeight);
    }

    return {
      carrier: this.id,
      serviceLevel: this.getDefaultServiceLevel(),
      rate: Math.round(totalRate * 100) / 100,
      currency: 'USD',
      estimatedDays,
      dimensionalWeight: totalDimWeight,
      billableWeight: totalBillableWeight,
      zone,
      isCheapest: false,
      isFastest: false,
      isBestValue: false,
      requiresLTL: false,
      metadata: {
        baseRate: Math.round(baseRate * 100) / 100,
        weightSurcharge: Math.round(weightSurcharge * 100) / 100,
        packageCount: request.packages.length,
      },
    };
  }

  private generateLTLQuote(
    request: RateRequest,
    billableWeight: number,
  ): CarrierQuote {
    const zone = this.calculateZone(request.fromAddress.zip, request.toAddress.zip);
    const baseRate = 150 + zone * 10;
    const weightSurcharge = billableWeight * 0.15;
    const rate = baseRate + weightSurcharge;

    return {
      carrier: CarrierId.LTL,
      serviceLevel: 'LTL_STANDARD',
      rate: Math.round(rate * 100) / 100,
      currency: 'USD',
      estimatedDays: 5 + zone,
      dimensionalWeight: billableWeight,
      billableWeight,
      zone,
      isCheapest: false,
      isFastest: false,
      isBestValue: false,
      requiresLTL: true,
      metadata: {
        freightClass: this.getFreightClass(billableWeight),
      },
    };
  }

  private calculateZone(fromZip: string, toZip: string): number {
    // Simplified zone calculation based on ZIP code distance
    const fromPrefix = parseInt(fromZip.substring(0, 3), 10);
    const toPrefix = parseInt(toZip.substring(0, 3), 10);
    const diff = Math.abs(fromPrefix - toPrefix);

    if (diff < 100) return 2;
    if (diff < 300) return 4;
    if (diff < 600) return 6;
    return 8;
  }

  private getBaseRate(zone: number): number {
    switch (this.id) {
      case CarrierId.UPS:
        return 8.5 + zone * 0.75;
      case CarrierId.FedEx:
        return 8.75 + zone * 0.7;
      case CarrierId.USPS:
        return 7.5 + zone * 0.5;
      case CarrierId.Shippo:
        return 8 + zone * 0.65;
      case CarrierId.LTL:
        return 150 + zone * 10;
      default:
        return 10;
    }
  }

  private getWeightMultiplier(): number {
    switch (this.id) {
      case CarrierId.UPS:
        return 0.08;
      case CarrierId.FedEx:
        return 0.085;
      case CarrierId.USPS:
        return 0.06;
      case CarrierId.Shippo:
        return 0.07;
      case CarrierId.LTL:
        return 0.15;
      default:
        return 0.1;
    }
  }

  private getEstimatedDays(zone: number): number {
    switch (this.id) {
      case CarrierId.UPS:
        return Math.min(5, 1 + Math.ceil(zone / 2));
      case CarrierId.FedEx:
        return Math.min(5, 1 + Math.ceil(zone / 2));
      case CarrierId.USPS:
        return Math.min(7, 2 + Math.ceil(zone / 2));
      case CarrierId.Shippo:
        return Math.min(5, 1 + Math.ceil(zone / 2));
      case CarrierId.LTL:
        return 5 + zone;
      default:
        return 5;
    }
  }

  private getDefaultServiceLevel(): string {
    switch (this.id) {
      case CarrierId.UPS:
        return 'GROUND';
      case CarrierId.FedEx:
        return 'GROUND';
      case CarrierId.USPS:
        return 'PRIORITY';
      case CarrierId.Shippo:
        return 'GROUND';
      case CarrierId.LTL:
        return 'LTL_STANDARD';
      default:
        return 'STANDARD';
    }
  }

  private getFreightClass(weight: number): string {
    if (weight < 50) return 'CLASS_70';
    if (weight < 100) return 'CLASS_77.5';
    if (weight < 200) return 'CLASS_85';
    if (weight < 500) return 'CLASS_100';
    return 'CLASS_125';
  }
}

/**
 * Get carrier gateway instances for enabled carriers.
 */
function getCarrierGateways(): CarrierGateway[] {
  const enabledCarriers = getEnabledCarriers();
  return enabledCarriers.map((entry) => new MockCarrierGateway(entry.id));
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

  // Query all carriers in parallel
  const ratePromises = gateways.map(async (gateway) => {
    try {
      return await gateway.getRate(request);
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
        try {
          return await gateway.getRate(multiPkgRequest);
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
