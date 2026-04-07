/**
 * Tracking sync service for the ShipSmart shipping platform.
 * Handles tracking status updates and Shopify synchronization.
 */

import {
  CarrierId,
  TrackingStatus,
  Shipment,
  ShipmentStatus,
  Timestamp,
} from '@shipsmart/shared';
import { carrierRegistry } from './carriers';
import { logTrackingSynced } from './audit';
import { firestoreService } from './firestore';

// ============================================================================
// Types
// ============================================================================

/** Tracking update result */
export interface TrackingUpdate {
  /** Shipment ID */
  shipmentId: string;
  /** Tracking number */
  trackingNumber: string;
  /** Current status */
  status: string;
  /** Whether the status changed */
  statusChanged: boolean;
  /** Previous status */
  previousStatus: string | null;
  /** Updated timestamp */
  updatedAt: Date;
}

/** Shopify sync result */
export interface ShopifySyncResult {
  /** Shipment ID */
  shipmentId: string;
  /** Whether the sync was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Sync timestamp */
  syncedAt: Date;
}

// ============================================================================
// Tracking Service
// ============================================================================

/**
 * Get tracking status for a shipment.
 *
 * @param carrier - Carrier ID
 * @param trackingNumber - Tracking number
 * @returns Tracking status
 */
export async function getTrackingStatus(
  carrier: CarrierId,
  trackingNumber: string,
): Promise<TrackingStatus> {
  const carrierGateway = carrierRegistry[carrier];
  if (!carrierGateway) {
    throw new Error(`Carrier not found: ${carrier}`);
  }

  return carrierGateway.trackPackage(trackingNumber);
}

/**
 * Update tracking status for a shipment.
 *
 * @param shipment - Shipment record
 * @param userId - User ID for audit logging
 * @returns Tracking update result
 */
export async function updateTrackingStatus(
  shipment: Shipment,
  userId: string,
): Promise<TrackingUpdate> {
  const trackingNumber = shipment.trackingNumbers[0];
  if (!trackingNumber) {
    throw new Error('No tracking number found for shipment');
  }

  // Get current tracking status from carrier
  const trackingStatus = await getTrackingStatus(
    shipment.carrier,
    trackingNumber,
  );

  // Determine previous status
  const previousStatus = mapShipmentStatusToTrackingStatus(shipment.status);

  // Check if status changed
  const statusChanged = trackingStatus.status !== previousStatus;

  // Update deliveredAt if delivered
  let deliveredAt = shipment.deliveredAt;
  if (trackingStatus.status === 'delivered' && !deliveredAt) {
    deliveredAt = new Date() as unknown as Timestamp;
  }

  // Update shipment in Firestore
  await firestoreService.updateDocument('shipments', shipment.id, {
    status: mapTrackingStatusToShipmentStatus(trackingStatus.status),
    deliveredAt,
  } as Partial<Shipment>);

  // Log audit event
  await logTrackingSynced(userId, shipment.id, {
    trackingNumber,
    previousStatus,
    newStatus: trackingStatus.status,
    statusChanged,
  });

  return {
    shipmentId: shipment.id,
    trackingNumber,
    status: trackingStatus.status,
    statusChanged,
    previousStatus,
    updatedAt: new Date(),
  };
}

/**
 * Sync tracking information to Shopify.
 *
 * @param shipment - Shipment record
 * @param userId - User ID for audit logging
 * @returns Shopify sync result
 */
export async function syncTrackingToShopify(
  shipment: Shipment,
  userId: string,
): Promise<ShopifySyncResult> {
  try {
    // TODO: Implement Shopify API integration
    // - Get order from Shopify using orderId
    // - Update fulfillment with tracking number
    // - Send shipping notification to customer

    // Mock implementation
    const now = new Date();

    // Update shipment in Firestore
    await firestoreService.updateDocument('shipments', shipment.id, {
      shopifySynced: true,
      shopifySyncedAt: now,
    } as Partial<Shipment>);

    // Log audit event
    await logTrackingSynced(userId, shipment.id, {
      action: 'shopify_sync',
      trackingNumbers: shipment.trackingNumbers,
    });

    return {
      shipmentId: shipment.id,
      success: true,
      syncedAt: now,
    };
  } catch (error) {
    return {
      shipmentId: shipment.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      syncedAt: new Date(),
    };
  }
}

/**
 * Batch sync tracking for multiple shipments.
 *
 * @param shipments - Array of shipments to sync
 * @param userId - User ID for audit logging
 * @returns Array of sync results
 */
export async function batchSyncTracking(
  shipments: Shipment[],
  userId: string,
): Promise<ShopifySyncResult[]> {
  const results: ShopifySyncResult[] = [];

  for (const shipment of shipments) {
    const result = await syncTrackingToShopify(shipment, userId);
    results.push(result);
  }

  return results;
}

/**
 * Get shipments that need tracking updates.
 *
 * @param daysSinceUpdate - Number of days since last update
 * @returns Array of shipments needing updates
 */
export async function getStaleShipments(_daysSinceUpdate: number = 3): Promise<Shipment[]> {
  // TODO: Query Firestore for shipments that haven't been updated recently
  // const cutoffDate = new Date();
  // cutoffDate.setDate(cutoffDate.getDate() - daysSinceUpdate);
  //
  // const snapshot = await db
  //   .collection('shipments')
  //   .where('status', 'in', ['created', 'label_generated', 'in_transit'])
  //   .where('updatedAt', '<', cutoffDate)
  //   .get();
  //
  // return snapshot.docs.map((doc) => doc.data() as Shipment);

  return [];
}

/**
 * Run tracking update job for all active shipments.
 *
 * @param userId - User ID for audit logging (system user)
 * @returns Array of tracking updates
 */
export async function runTrackingUpdateJob(
  userId: string,
): Promise<TrackingUpdate[]> {
  const staleShipments = await getStaleShipments();
  const updates: TrackingUpdate[] = [];

  for (const shipment of staleShipments) {
    try {
      const update = await updateTrackingStatus(shipment, userId);
      updates.push(update);
    } catch (error) {
      console.error(
        `[Tracking] Failed to update tracking for shipment ${shipment.id}:`,
        error,
      );
    }
  }

  return updates;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map shipment status to tracking status string.
 */
function mapShipmentStatusToTrackingStatus(status: ShipmentStatus): string {
  switch (status) {
    case ShipmentStatus.Created:
      return 'pending';
    case ShipmentStatus.LabelGenerated:
      return 'label_created';
    case ShipmentStatus.InTransit:
      return 'in_transit';
    case ShipmentStatus.Delivered:
      return 'delivered';
    default:
      return 'unknown';
  }
}

/**
 * Map tracking status string to shipment status.
 */
export function mapTrackingStatusToShipmentStatus(
  trackingStatus: string,
): ShipmentStatus {
  switch (trackingStatus) {
    case 'delivered':
      return ShipmentStatus.Delivered;
    case 'in_transit':
    case 'out_for_delivery':
      return ShipmentStatus.InTransit;
    case 'label_created':
    case 'pending':
      return ShipmentStatus.LabelGenerated;
    default:
      return ShipmentStatus.Created;
  }
}

/**
 * Format tracking status for display.
 */
export function formatTrackingStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    label_created: 'Label Created',
    in_transit: 'In Transit',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    exception: 'Exception',
    unknown: 'Unknown',
  };

  return statusMap[status] || status;
}

/**
 * Calculate estimated delivery date.
 *
 * @param shippedAt - Date shipment was shipped
 * @param estimatedDays - Estimated transit days
 * @returns Estimated delivery date
 */
export function calculateEstimatedDelivery(
  shippedAt: Date,
  estimatedDays: number,
): Date {
  const deliveryDate = new Date(shippedAt);
  deliveryDate.setDate(deliveryDate.getDate() + estimatedDays);
  return deliveryDate;
}
