/**
 * Formatting utilities for shipping labels, addresses, and display.
 */

import { CarrierId } from '@shipsmart/shared';
import type { Address } from '@shipsmart/shared';

/**
 * Carrier tracking URL patterns.
 * Each carrier has a specific URL format for tracking packages.
 */
const TRACKING_URLS: Record<CarrierId, (trackingNumber: string) => string> = {
  [CarrierId.UPS]: (trackingNumber) =>
    `https://www.ups.com/track?tracknum=${encodeURIComponent(trackingNumber)}`,
  [CarrierId.FedEx]: (trackingNumber) =>
    `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(trackingNumber)}`,
  [CarrierId.USPS]: (trackingNumber) =>
    `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(trackingNumber)}`,
  [CarrierId.Shippo]: (trackingNumber) =>
    `https://goshippo.com/track/${encodeURIComponent(trackingNumber)}`,
  [CarrierId.LTL]: (trackingNumber) =>
    `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(trackingNumber)}`,
};

/**
 * Format a monetary amount as currency string.
 *
 * @param amount - Amount in cents or dollars (e.g., 12.99 or 1299)
 * @param currency - Currency code (defaults to 'USD')
 * @param isInCents - Whether the amount is in cents (default: false)
 * @returns Formatted currency string (e.g., "$12.99")
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  isInCents: boolean = false,
): string {
  const value = isInCents ? amount / 100 : amount;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format an address for label printing.
 *
 * @param address - Address object
 * @returns Formatted address string suitable for label printing
 */
export function formatAddress(address: Address): string {
  const lines: string[] = [];

  if (address.name) {
    lines.push(address.name);
  }

  // Combine street lines
  const streetParts = [address.street1, address.street2].filter(Boolean);
  if (streetParts.length > 0) {
    lines.push(streetParts.join(', '));
  }

  // City, State ZIP
  const cityStateZip = [address.city, address.state, address.zip].filter(Boolean).join(', ');
  if (cityStateZip) {
    lines.push(cityStateZip);
  }

  if (address.country && address.country !== 'US') {
    lines.push(address.country);
  }

  return lines.join('\n');
}

/**
 * Generate a carrier tracking URL for a given tracking number.
 *
 * @param carrier - Carrier identifier
 * @param trackingNumber - Tracking number
 * @returns Full tracking URL for the carrier
 */
export function formatTrackingUrl(
  carrier: CarrierId,
  trackingNumber: string,
): string {
  const urlGenerator = TRACKING_URLS[carrier];

  if (!urlGenerator) {
    // Fallback to a generic tracking search
    return `https://www.google.com/search?q=${encodeURIComponent(trackingNumber)}`;
  }

  return urlGenerator(trackingNumber);
}

/**
 * Format weight with units.
 *
 * @param weight - Weight in lbs
 * @returns Formatted weight string (e.g., "5.5 lbs")
 */
export function formatWeight(weight: number): string {
  return `${weight.toFixed(1)} lbs`;
}

/**
 * Format a date for display.
 *
 * @param date - Date object, timestamp, or date string
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export function formatDate(date: Date | string | number): string {
  const dateObj = typeof date === 'string' || typeof date === 'number'
    ? new Date(date)
    : date;

  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date and time for display.
 *
 * @param date - Date object, timestamp, or date string
 * @returns Formatted date and time string (e.g., "Jan 15, 2024 3:30 PM")
 */
export function formatDateTime(date: Date | string | number): string {
  const dateObj = typeof date === 'string' || typeof date === 'number'
    ? new Date(date)
    : date;

  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
