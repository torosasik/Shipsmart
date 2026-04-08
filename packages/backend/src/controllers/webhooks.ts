/**
 * Webhook handlers for the ShipSmart shipping platform.
 * Handles incoming webhooks from carriers and Shopify.
 */

import { Request, Response, NextFunction } from 'express';
import { CarrierId, ShipmentStatus, Order, OrderStatus, Timestamp } from '@shipsmart/shared';
import { logTrackingSynced } from '../services/audit';
import { firestoreService } from '../services/firestore';

// ============================================================================
// Types
// ============================================================================

/** Carrier webhook payload */
interface CarrierWebhookPayload {
  trackingNumber: string;
  status: string;
  carrier: CarrierId;
  estimatedDelivery?: string;
  events?: Array<{
    timestamp: string;
    description: string;
    location: string;
    statusCode: string;
  }>;
}

/** Shopify webhook payload */
interface ShopifyWebhookPayload {
  id: number;
  order_number: number;
  fulfillments?: Array<{
    id: number;
    status: string;
    tracking_number?: string;
  }>;
}

// ============================================================================
// Carrier Tracking Webhook
// ============================================================================

/**
 * POST /api/webhooks/carriers/:carrier/tracking
 * Handle carrier tracking update webhooks.
 */
export async function handleCarrierTrackingWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { carrier } = req.params as { carrier: string };
    const payload = req.body as CarrierWebhookPayload;

    if (!payload.trackingNumber || !payload.status) {
      res.status(400).json({
        success: false,
        error: 'Missing trackingNumber or status',
      });
      return;
    }

    // Find shipment by tracking number
    const shipment = await firestoreService.getShipmentByTrackingNumber(payload.trackingNumber);

    if (!shipment) {
      console.warn(`[Webhook] Shipment not found for tracking number: ${payload.trackingNumber}`);
      res.status(404).json({
        success: false,
        error: 'Shipment not found',
      });
      return;
    }

    // Map carrier status to shipment status
    const newStatus = mapTrackingStatusToShipmentStatus(payload.status);

    // Update shipment if status changed
    if (newStatus !== shipment.status) {
      await firestoreService.updateShipmentStatus(shipment.id, newStatus);

      // Update deliveredAt if delivered
      if (newStatus === ShipmentStatus.Delivered) {
        await firestoreService.updateDocument('shipments', shipment.id, {
          deliveredAt: new Date(),
        } as Partial<Record<string, unknown>>);
      }

      // Log audit event
      await logTrackingSynced('system', shipment.id, {
        source: 'webhook',
        carrier,
        previousStatus: shipment.status,
        newStatus,
        trackingNumber: payload.trackingNumber,
      });
    }

    res.json({
      success: true,
      data: {
        shipmentId: shipment.id,
        previousStatus: shipment.status,
        newStatus,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// Shopify Order Webhook
// ============================================================================

/**
 * POST /api/webhooks/shopify/orders
 * Handle Shopify order creation/update webhooks.
 */
export async function handleShopifyOrderWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const payload = req.body as ShopifyWebhookPayload;
    const webhookId = req.headers['x-shopify-webhook-id'] as string;

    if (!payload.id) {
      res.status(400).json({
        success: false,
        error: 'Missing order ID',
      });
      return;
    }

    // Idempotency check - prevent duplicate processing of the same webhook
    if (webhookId) {
      const alreadyProcessed = await firestoreService.getDocument('processedWebhooks', webhookId);
      if (alreadyProcessed) {
        console.log(`[Webhook] Duplicate webhook ${webhookId} ignored`);
        res.json({
          success: true,
          data: { orderId: payload.id.toString(), processed: false, reason: 'duplicate' },
        });
        return;
      }
    }

    // Create Shopify service instance with Firestore credentials
    const { ShopifyService } = await import('../services/shopify');
    const shopifyService = await ShopifyService.fromFirestore();

    // Fetch the full order from Shopify using the webhook payload ID
    const fullOrder = await shopifyService.getOrder(payload.id.toString());
    if (!fullOrder) {
      console.warn(`[Webhook] Order ${payload.id} not found in Shopify`);
      res.status(404).json({
        success: false,
        error: 'Order not found in Shopify',
      });
      return;
    }

    // Transform Shopify order to internal format
    const orderData = shopifyService.transformOrder(fullOrder);
    const orderId = orderData.id as string;

    // Check if order already exists
    const existingOrder = await firestoreService.getOrder(orderId);

    if (existingOrder) {
      // Update existing order
      await firestoreService.updateDocument('orders', orderId, {
        ...orderData,
        updatedAt: new Date(),
      } as Partial<Record<string, unknown>>);
      console.log(`[Webhook] Updated existing order: ${orderId}`);
    } else {
      // Create new order
      const order: Order = {
        id: orderId,
        shopifyOrderId: orderData.shopifyOrderId as string,
        customerName: orderData.customerName as string,
        customerEmail: orderData.customerEmail as string,
        shippingAddress: orderData.shippingAddress as Order['shippingAddress'],
        lineItems: orderData.lineItems as Order['lineItems'],
        totalWeight: orderData.totalWeight as number,
        boxCount: orderData.boxCount as number,
        status: (orderData.status as OrderStatus) || OrderStatus.Pending,
        createdAt: orderData.createdAt as unknown as Timestamp,
        updatedAt: orderData.updatedAt as unknown as Timestamp,
        syncedAt: orderData.syncedAt as unknown as Timestamp,
      };
      await firestoreService.saveOrder(order);
      console.log(`[Webhook] Created new order: ${orderId}`);
    }

    // Mark webhook as processed for idempotency
    if (webhookId) {
      await firestoreService.createDocument('processedWebhooks', webhookId, {
        processedAt: new Date(),
        orderId: orderId,
        webhookType: 'orders',
      });
    }

    // Update last sync timestamp
    const { updateLastSyncTimestamp } = await import('../services/shopify-settings');
    await updateLastSyncTimestamp();

    res.json({
      success: true,
      data: {
        orderId: orderId,
        processed: true,
        created: !existingOrder,
      },
    });
  } catch (error) {
    console.error('[Webhook] Error processing Shopify order webhook:', error);
    next(error);
  }
}

/**
 * POST /api/webhooks/shopify/fulfillments
 * Handle Shopify fulfillment update webhooks.
 */
export async function handleShopifyFulfillmentWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const payload = req.body as ShopifyWebhookPayload;
    const webhookId = req.headers['x-shopify-webhook-id'] as string;

    if (!payload.id || !payload.fulfillments?.length) {
      res.status(400).json({
        success: false,
        error: 'Missing order ID or fulfillments',
      });
      return;
    }

    const fulfillment = payload.fulfillments[0];

    // Idempotency check
    if (webhookId) {
      const alreadyProcessed = await firestoreService.getDocument('processedWebhooks', webhookId);
      if (alreadyProcessed) {
        console.log(`[Webhook] Duplicate fulfillment webhook ${webhookId} ignored`);
        res.json({
          success: true,
          data: { processed: false, reason: 'duplicate' },
        });
        return;
      }
    }

    // Only process if there's a tracking number (indicates fulfillment was shipped)
    if (!fulfillment.tracking_number) {
      console.log(`[Webhook] Fulfillment ${fulfillment.id} has no tracking number, skipping`);
      res.json({
        success: true,
        data: { processed: false, reason: 'no_tracking' },
      });
      return;
    }

    // Find shipment by tracking number
    const shipment = await firestoreService.getShipmentByTrackingNumber(fulfillment.tracking_number);
    if (!shipment) {
      console.warn(`[Webhook] Shipment not found for tracking number: ${fulfillment.tracking_number}`);
      res.status(404).json({
        success: false,
        error: 'Shipment not found for tracking number',
      });
      return;
    }

    // Map fulfillment status to shipment status
    const newStatus = mapFulfillmentStatusToShipmentStatus(fulfillment.status);

    // Update shipment if status changed
    if (newStatus && newStatus !== shipment.status) {
      await firestoreService.updateShipmentStatus(shipment.id, newStatus);

      // Update deliveredAt if delivered
      if (newStatus === ShipmentStatus.Delivered) {
        await firestoreService.updateDocument('shipments', shipment.id, {
          deliveredAt: new Date(),
        } as Partial<Record<string, unknown>>);
      }

      // Log audit event
      await logTrackingSynced('shopify', shipment.id, {
        source: 'webhook',
        carrier: shipment.carrier,
        previousStatus: shipment.status,
        newStatus,
        trackingNumber: fulfillment.tracking_number,
      });

      console.log(`[Webhook] Updated shipment ${shipment.id} status from ${shipment.status} to ${newStatus}`);
    }

    // Mark webhook as processed
    if (webhookId) {
      await firestoreService.createDocument('processedWebhooks', webhookId, {
        processedAt: new Date(),
        orderId: payload.id.toString(),
        fulfillmentId: fulfillment.id.toString(),
        webhookType: 'fulfillments',
      });
    }

    res.json({
      success: true,
      data: {
        shipmentId: shipment.id,
        orderId: payload.id.toString(),
        fulfillmentId: fulfillment.id.toString(),
        previousStatus: shipment.status,
        newStatus: newStatus || shipment.status,
        processed: true,
      },
    });
  } catch (error) {
    console.error('[Webhook] Error processing Shopify fulfillment webhook:', error);
    next(error);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map carrier tracking status to shipment status.
 */
function mapTrackingStatusToShipmentStatus(status: string): ShipmentStatus {
  const statusMap: Record<string, ShipmentStatus> = {
    delivered: ShipmentStatus.Delivered,
    in_transit: ShipmentStatus.InTransit,
    out_for_delivery: ShipmentStatus.InTransit,
    label_created: ShipmentStatus.LabelGenerated,
    pending: ShipmentStatus.Created,
    exception: ShipmentStatus.InTransit,
  };

  return statusMap[status.toLowerCase()] || ShipmentStatus.Created;
}

/**
 * Map Shopify fulfillment status to shipment status.
 * Shopify fulfillment statuses: pending, open, success, cancelled, error, failure
 */
function mapFulfillmentStatusToShipmentStatus(status: string): ShipmentStatus | null {
  const statusMap: Record<string, ShipmentStatus> = {
    success: ShipmentStatus.InTransit, // Fulfillment completed successfully - shipment is now in transit
    open: ShipmentStatus.InTransit,     // Fulfillment is in progress
    pending: ShipmentStatus.Created,    // Fulfillment created but not started
    cancelled: ShipmentStatus.Created,  // Cancelled fulfillment - revert to created state
    error: ShipmentStatus.Created,      // Error in fulfillment - revert to created state
    failure: ShipmentStatus.Created,    // Failed fulfillment - revert to created state
  };

  return statusMap[status.toLowerCase()] || null;
}
