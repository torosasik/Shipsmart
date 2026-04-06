/**
 * Webhook handlers for the ShipSmart shipping platform.
 * Handles incoming webhooks from carriers and Shopify.
 */

import { Request, Response, NextFunction } from 'express';
import { CarrierId, ShipmentStatus } from '@shipsmart/shared';
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

    if (!payload.id) {
      res.status(400).json({
        success: false,
        error: 'Missing order ID',
      });
      return;
    }

    // TODO: Transform and upsert order into Firestore
    // const order = shopifyService.transformOrder(payload);
    // await firestoreService.saveOrder(order);

    console.log(`[Webhook] Received Shopify order webhook: ${payload.id}`);

    res.json({
      success: true,
      data: {
        orderId: payload.id.toString(),
      },
    });
  } catch (error) {
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

    if (!payload.id || !payload.fulfillments?.length) {
      res.status(400).json({
        success: false,
        error: 'Missing order ID or fulfillments',
      });
      return;
    }

    const fulfillment = payload.fulfillments[0];

    // TODO: Update shipment tracking if fulfillment status changed
    console.log(`[Webhook] Received Shopify fulfillment webhook: ${payload.id}`);

    res.json({
      success: true,
      data: {
        orderId: payload.id.toString(),
        fulfillmentId: fulfillment.id.toString(),
      },
    });
  } catch (error) {
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
