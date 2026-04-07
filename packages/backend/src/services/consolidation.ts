/**
 * Order consolidation service for the ShipSmart shipping platform.
 * Identifies orders that can be combined to reduce shipping costs.
 */

import {
  Order,
  OrderStatus,
  Address,
  LineItem,
  ShipmentContext,
  PackageDetail,
} from '@shipsmart/shared';
import { firestoreService } from './firestore';

// ============================================================================
// Types
// ============================================================================

/** A group of orders that can be consolidated */
export interface ConsolidationGroup {
  /** Unique ID for this consolidation group */
  id: string;
  /** Orders in this group */
  orders: Order[];
  /** Combined shipping address (must be the same for all orders) */
  shippingAddress: Address;
  /** Total weight of all orders */
  totalWeight: number;
  /** Total number of boxes if shipped separately */
  separateBoxCount: number;
  /** Estimated box count if consolidated */
  consolidatedBoxCount: number;
  /** Estimated savings in USD */
  estimatedSavings: number;
  /** Whether consolidation is recommended */
  isRecommended: boolean;
  /** Reason for recommendation or warning */
  reason: string;
}

/** Consolidation analysis result */
export interface ConsolidationAnalysis {
  /** Groups of orders that can be consolidated */
  groups: ConsolidationGroup[];
  /** Total estimated savings across all groups */
  totalEstimatedSavings: number;
  /** Number of orders analyzed */
  ordersAnalyzed: number;
  /** Timestamp of analysis */
  analyzedAt: Date;
}

/** Request to consolidate orders */
export interface ConsolidateOrdersRequest {
  /** Order IDs to consolidate */
  orderIds: string[];
  /** New combined box configuration */
  boxes: PackageDetail[];
  /** Notes for the consolidation */
  notes?: string;
}

/** Response from consolidating orders */
export interface ConsolidateOrdersResponse {
  /** Consolidation group ID */
  consolidationId: string;
  /** Orders that were consolidated */
  orderIds: string[];
  /** New shipment context for consolidated order */
  shipmentContext: ShipmentContext;
  /** Estimated cost savings */
  estimatedSavings: number;
}

// ============================================================================
// Consolidation Service
// ============================================================================

/**
 * Analyze pending orders for consolidation opportunities.
 *
 * @param orders - List of pending orders to analyze
 * @param maxDaysApart - Maximum days between order creation to consider consolidation
 * @returns Consolidation analysis with recommended groups
 */
export function analyzeConsolidationOpportunities(
  orders: Order[],
  maxDaysApart: number = 3,
): ConsolidationAnalysis {
  // Filter to pending orders only
  const pendingOrders = orders.filter(
    (o) => o.status === OrderStatus.Pending,
  );

  // Group orders by shipping address
  const addressGroups = groupOrdersByAddress(pendingOrders);

  // Find consolidation opportunities within each address group
  const groups: ConsolidationGroup[] = [];

  for (const addressGroup of addressGroups) {
    // Sort by creation date
    const sorted = [...addressGroup.orders].sort(
      (a, b) =>
        ((a.createdAt as any)?.toMillis?.() ?? 0) -
        ((b.createdAt as any)?.toMillis?.() ?? 0),
    );

    // Find orders within the time window
    const consolidationWindow = findConsolidationWindows(
      sorted,
      maxDaysApart,
    );

    for (const window of consolidationWindow) {
      if (window.length < 2) continue;

      const group = createConsolidationGroup(window);
      if (group.isRecommended) {
        groups.push(group);
      }
    }
  }

  const totalEstimatedSavings = groups.reduce(
    (sum, g) => sum + g.estimatedSavings,
    0,
  );

  return {
    groups,
    totalEstimatedSavings: Math.round(totalEstimatedSavings * 100) / 100,
    ordersAnalyzed: pendingOrders.length,
    analyzedAt: new Date(),
  };
}

/**
 * Create a consolidation group from a set of orders.
 */
function createConsolidationGroup(orders: Order[]): ConsolidationGroup {
  const totalWeight = orders.reduce((sum, o) => sum + o.totalWeight, 0);
  const separateBoxCount = orders.reduce((sum, o) => sum + o.boxCount, 0);

  // Estimate consolidated box count based on weight
  // Assume ~40 lbs per box for optimal shipping
  const consolidatedBoxCount = Math.ceil(totalWeight / 40);

  // Estimate savings
  // Base rate savings: one shipment instead of multiple
  const baseRateSavings = (orders.length - 1) * 8.5;

  // Weight tier savings: heavier single shipment may be cheaper per lb
  const weightTierSavings = estimateWeightTierSavings(orders, totalWeight);

  const estimatedSavings = baseRateSavings + weightTierSavings;

  // Determine if consolidation is recommended
  const isRecommended = estimatedSavings > 5; // Minimum $5 savings threshold

  let reason = '';
  if (isRecommended) {
    reason = `Consolidating ${orders.length} orders saves $${estimatedSavings.toFixed(2)} and reduces boxes from ${separateBoxCount} to ${consolidatedBoxCount}.`;
  } else {
    reason = `Savings of $${estimatedSavings.toFixed(2)} is below the $5 threshold. Orders may still be consolidated if desired.`;
  }

  return {
    id: generateConsolidationId(),
    orders,
    shippingAddress: orders[0].shippingAddress,
    totalWeight,
    separateBoxCount,
    consolidatedBoxCount,
    estimatedSavings: Math.round(estimatedSavings * 100) / 100,
    isRecommended,
    reason,
  };
}

/**
 * Estimate weight tier savings from consolidation.
 */
function estimateWeightTierSavings(
  orders: Order[],
  totalWeight: number,
): number {
  // Calculate individual order costs
  const individualCosts = orders.map((order) => {
    const weight = order.totalWeight;
    return estimateShippingCost(weight, order.boxCount);
  });

  const totalIndividualCost = individualCosts.reduce((sum, c) => sum + c, 0);

  // Calculate consolidated cost
  const consolidatedCost = estimateShippingCost(totalWeight, 1);

  return totalIndividualCost - consolidatedCost;
}

/**
 * Estimate shipping cost based on weight and box count.
 * This is a simplified model for consolidation analysis.
 */
function estimateShippingCost(weight: number, boxCount: number): number {
  const weightPerBox = weight / boxCount;

  // Base rate + weight surcharge
  const baseRate = 8.5;
  const weightSurcharge = weightPerBox * 0.08;

  return (baseRate + weightSurcharge) * boxCount;
}

/**
 * Group orders by shipping address.
 */
function groupOrdersByAddress(orders: Order[]): { address: string; orders: Order[] }[] {
  const groups = new Map<string, Order[]>();

  for (const order of orders) {
    const addressKey = normalizeAddress(order.shippingAddress);

    if (!groups.has(addressKey)) {
      groups.set(addressKey, []);
    }
    groups.get(addressKey)!.push(order);
  }

  return Array.from(groups.entries()).map(([address, orders]) => ({
    address,
    orders,
  }));
}

/**
 * Normalize an address for comparison.
 */
function normalizeAddress(address: Address): string {
  // Exclude street2 (apartment/unit) from the grouping key because two orders
  // at the same building can have different unit numbers but should still be
  // considered for consolidation.
  return `${address.country || ''}-${address.zip}-${address.state || ''}-${address.city || ''}-${address.street1.toLowerCase().replace(/\s+/g, '')}`;
}

/**
 * Find windows of orders within the specified time range.
 */
function findConsolidationWindows(
  orders: Order[],
  maxDaysApart: number,
): Order[][] {
  if (orders.length < 2) return [];

  const windows: Order[][] = [];
  const maxMs = maxDaysApart * 24 * 60 * 60 * 1000;

  let windowStart = 0;

  for (let i = 1; i < orders.length; i++) {
    const startTime =
      (orders[windowStart].createdAt as any)?.toMillis?.() ?? 0;
    const currentTime = (orders[i].createdAt as any)?.toMillis?.() ?? 0;

    if (currentTime - startTime > maxMs) {
      // Current window is complete
      if (i - windowStart >= 2) {
        windows.push(orders.slice(windowStart, i));
      }
      windowStart = i;
    }
  }

  // Don't forget the last window
  if (orders.length - windowStart >= 2) {
    windows.push(orders.slice(windowStart));
  }

  return windows;
}

/**
 * Execute consolidation for a group of orders.
 *
 * @param request - Consolidation request
 * @returns Consolidation response
 */
export async function consolidateOrders(
  request: ConsolidateOrdersRequest,
): Promise<ConsolidateOrdersResponse> {
  // Fetch orders from Firestore
  const orders: Order[] = [];
  for (const orderId of request.orderIds) {
    const order = await firestoreService.getOrder(orderId);
    if (order) {
      orders.push(order);
    }
  }

  if (orders.length === 0) {
    throw new Error('No valid orders found for consolidation');
  }

  // Validate all orders are pending
  const nonPendingOrders = orders.filter(o => o.status !== OrderStatus.Pending);
  if (nonPendingOrders.length > 0) {
    throw new Error(`Cannot consolidate orders with status: ${nonPendingOrders.map(o => o.status).join(', ')}`);
  }

  const totalWeight = request.boxes.reduce((sum, b) => sum + b.weight, 0);
  const declaredValue = request.boxes.reduce(
    (sum, b) => sum + (b.declaredValue ?? 0),
    0,
  );

  // Update order statuses to consolidated
  for (const order of orders) {
    await firestoreService.updateDocument('orders', order.id, {
      status: 'consolidated',
    } as Partial<Order>);
  }

  return {
    consolidationId: generateConsolidationId(),
    orderIds: request.orderIds,
    shipmentContext: {
      fromAddress: {
        name: 'Warehouse',
        street1: '123 Warehouse St',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90001',
        country: 'US',
      },
      toAddress: orders[0].shippingAddress,
      packages: request.boxes,
      totalWeight,
      declaredValue,
    },
    estimatedSavings: request.orderIds.length * 5,
  };
}

/**
 * Get consolidation opportunities for display.
 *
 * @param orders - Orders to analyze
 * @returns Consolidation analysis
 */
export function getConsolidationAlerts(orders: Order[]): ConsolidationAnalysis {
  return analyzeConsolidationOpportunities(orders);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique consolidation ID.
 */
function generateConsolidationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `cons-${timestamp}-${random}`;
}

/**
 * Check if an order is eligible for consolidation.
 */
export function isOrderEligibleForConsolidation(order: Order): boolean {
  return order.status === OrderStatus.Pending;
}

/**
 * Get combined line items from multiple orders.
 */
export function getCombinedLineItems(orders: Order[]): LineItem[] {
  const itemMap = new Map<string, LineItem>();

  for (const order of orders) {
    for (const item of order.lineItems) {
      if (itemMap.has(item.id)) {
        const existing = itemMap.get(item.id)!;
        existing.quantity += item.quantity;
      } else {
        itemMap.set(item.id, { ...item });
      }
    }
  }

  return Array.from(itemMap.values());
}
