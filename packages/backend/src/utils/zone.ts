/**
 * Zone calculation utilities for shipping.
 *
 * Shipping zones (1-8) determine transit time and cost based on the distance
 * between origin and destination zip codes. This module provides simplified
 * zone estimation based on zip code prefix distance.
 */

/**
 * Human-readable descriptions for each shipping zone.
 */
const ZONE_DESCRIPTIONS: Record<number, string> = {
  1: 'Local (same metro area)',
  2: 'Regional (within 150 miles)',
  3: 'Regional (150-300 miles)',
  4: 'Regional (300-600 miles)',
  5: 'National (600-1000 miles)',
  6: 'National (1000-1400 miles)',
  7: 'National (1400-1800 miles)',
  8: 'National (1800+ miles)',
};

/**
 * Estimated transit days by zone and service level.
 * Values represent business days for delivery.
 */
const TRANSIT_DAYS: Record<string, Record<number, number>> = {
  ground: {
    1: 1,
    2: 2,
    3: 3,
    4: 3,
    5: 4,
    6: 5,
    7: 5,
    8: 6,
  },
  express: {
    1: 1,
    2: 1,
    3: 1,
    4: 2,
    5: 2,
    6: 2,
    7: 3,
    8: 3,
  },
  priority: {
    1: 1,
    2: 2,
    3: 2,
    4: 2,
    5: 3,
    6: 3,
    7: 3,
    8: 3,
  },
  overnight: {
    1: 1,
    2: 1,
    3: 1,
    4: 1,
    5: 1,
    6: 1,
    7: 1,
    8: 1,
  },
};

/**
 * Zip code prefix to region mapping for zone estimation.
 * Groups US zip code prefixes into geographic regions.
 */
const ZIP_REGIONS: Record<string, number> = {
  // Northeast
  '01': 1, '02': 1, '03': 1, '04': 1, '05': 1, '06': 1,
  '07': 1, '08': 1, '09': 1, '10': 1, '11': 1, '12': 1,
  '13': 1, '14': 1, '15': 1, '16': 1, '17': 1, '18': 1,
  '19': 1,
  // Mid-Atlantic
  '20': 2, '21': 2, '22': 2, '23': 2, '24': 2, '25': 2,
  '26': 2, '27': 2, '28': 2, '29': 2,
  // Southeast
  '30': 3, '31': 3, '32': 3, '33': 3, '34': 3, '35': 3,
  '36': 3, '37': 3, '38': 3, '39': 3,
  // Midwest
  '40': 4, '41': 4, '42': 4, '43': 4, '44': 4, '45': 4,
  '46': 4, '47': 4, '48': 4, '49': 4,
  // Central
  '50': 5, '51': 5, '52': 5, '53': 5, '54': 5, '55': 5,
  '56': 5, '57': 5, '58': 5, '59': 5,
  // Southwest
  '60': 6, '61': 6, '62': 6, '63': 6, '64': 6, '65': 6,
  '66': 6, '67': 6, '68': 6, '69': 6,
  '70': 6, '71': 6, '72': 6, '73': 6, '74': 6, '75': 6,
  '76': 6, '77': 6, '78': 6, '79': 6,
  // Mountain
  '80': 7, '81': 7, '82': 7, '83': 7, '84': 7, '85': 7,
  '86': 7, '87': 7, '88': 7, '89': 7,
  // West Coast
  '90': 8, '91': 8, '92': 8, '93': 8, '94': 8, '95': 8,
  '96': 8, '97': 8, '98': 8, '99': 8,
};

/**
 * Get the region number (1-8) for a given zip code prefix.
 *
 * @param zipCode - 5-digit US zip code
 * @returns Region number (1-8), defaults to 5 for unknown prefixes
 */
function getRegionFromZip(zipCode: string): number {
  const prefix = zipCode.slice(0, 2);
  return ZIP_REGIONS[prefix] ?? 5;
}

/**
 * Estimate shipping zone (1-8) based on the distance between origin and
 * destination zip codes.
 *
 * This is a simplified estimation that uses geographic region mapping.
 * For accurate zone calculations, use carrier-specific APIs.
 *
 * @param fromZip - Origin 5-digit zip code
 * @param toZip - Destination 5-digit zip code
 * @returns Estimated shipping zone (1-8)
 */
export function calculateZone(fromZip: string, toZip: string): number {
  const fromRegion = getRegionFromZip(fromZip);
  const toRegion = getRegionFromZip(toZip);

  // Calculate zone based on region distance
  const regionDistance = Math.abs(fromRegion - toRegion);

  // Map region distance to shipping zone
  if (regionDistance === 0) {
    return 1; // Same region
  }
  if (regionDistance === 1) {
    return 2; // Adjacent region
  }
  if (regionDistance === 2) {
    return 3;
  }
  if (regionDistance === 3) {
    return 4;
  }
  if (regionDistance === 4) {
    return 5;
  }
  if (regionDistance === 5) {
    return 6;
  }
  if (regionDistance === 6) {
    return 7;
  }
  return 8; // Maximum distance
}

/**
 * Get a human-readable description for a shipping zone.
 *
 * @param zone - Shipping zone number (1-8)
 * @returns Description string for the zone
 */
export function getZoneDescription(zone: number): string {
  return ZONE_DESCRIPTIONS[zone] ?? `Zone ${zone}`;
}

/**
 * Estimate transit time in business days based on zone and service level.
 *
 * @param zone - Shipping zone (1-8)
 * @param serviceLevel - Service level ('ground', 'express', 'priority', 'overnight')
 * @returns Estimated transit time in business days
 */
export function estimateTransitTime(
  zone: number,
  serviceLevel: string = 'ground',
): number {
  const normalizedService = serviceLevel.toLowerCase();
  const serviceTransit = TRANSIT_DAYS[normalizedService];

  if (!serviceTransit) {
    // Default to ground transit if service level is unknown
    return TRANSIT_DAYS.ground[zone] ?? 5;
  }

  return serviceTransit[zone] ?? 5;
}
