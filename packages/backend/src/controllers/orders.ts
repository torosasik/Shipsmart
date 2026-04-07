/**
 * Order management controller for the ShipSmart shipping platform.
 * Handles list orders, get order, and sync from Shopify endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import {
  Order,
  OrderStatus,
  Timestamp,
} from '@shipsmart/shared';
import { ApiResponse, PaginatedResponse } from '../models';
import { firestoreService } from '../services/firestore';
import { shopifyService } from '../services/shopify';

/**
 * GET /api/orders
 * List orders with pagination.
 */
export async function listOrdersHandler(
  req: Request,
  res: Response<ApiResponse<PaginatedResponse<Order>>>,
  next: NextFunction,
): Promise<void> {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const status = req.query.status as string | undefined;

    // Validate status if provided
    if (status && !Object.values(OrderStatus).includes(status as OrderStatus)) {
      res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${Object.values(OrderStatus).join(', ')}`,
      });
      return;
    }

    const result = await firestoreService.listOrders({
      limit,
      status: status as OrderStatus | undefined,
    });

    // Calculate pagination metadata
    // Note: Firestore cursor-based pagination doesn't provide exact total counts
    // hasMore is true if we received a full page (there may be more results)
    const hasMore = result.items.length === limit;
    const total = hasMore ? page * limit + 1 : (page - 1) * limit + result.items.length;

    res.json({
      success: true,
      data: {
        items: result.items,
        total,
        page,
        limit,
        hasMore,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/orders/:id
 * Get a single order by ID.
 */
export async function getOrderHandler(
  req: Request,
  res: Response<ApiResponse<Order>>,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Missing order ID',
      });
      return;
    }

    const order = await firestoreService.getOrder(id);
    if (!order) {
      res.status(404).json({
        success: false,
        error: 'Order not found',
      });
      return;
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/orders/sync
 * Sync orders from Shopify.
 */
export async function syncFromShopifyHandler(
  _req: Request,
  res: Response<ApiResponse<{ synced: number; errors: string[] }>>,
  next: NextFunction,
): Promise<void> {
  try {
    // Determine the last sync date
    // Default to 24 hours ago if no previous sync timestamp is available
    const lastSyncDate = new Date();
    lastSyncDate.setHours(lastSyncDate.getHours() - 24);

    // Fetch orders from Shopify
    const shopifyOrders = await shopifyService.getOrdersSince(lastSyncDate, 50);

    const errors: string[] = [];
    let synced = 0;

    // Transform and upsert each order into Firestore
    for (const shopifyOrder of shopifyOrders) {
      try {
        const orderData = shopifyService.transformOrder(shopifyOrder);
        const orderId = orderData.id as string;

        // Check if order already exists
        const existingOrder = await firestoreService.getOrder(orderId);

        if (existingOrder) {
          // Update existing order
          await firestoreService.updateDocument('orders', orderId, {
            ...orderData,
            updatedAt: new Date(),
          } as Partial<Order>);
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
        }

        synced++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Failed to sync order ${shopifyOrder.id}: ${errorMessage}`);
      }
    }

    res.json({
      success: true,
      data: {
        synced,
        errors,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/orders/:id/status
 * Update order status.
 */
export async function updateOrderStatusHandler(
  req: Request,
  res: Response<ApiResponse<Order>>,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Missing order ID',
      });
      return;
    }

    if (!status || !Object.values(OrderStatus).includes(status)) {
      res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${Object.values(OrderStatus).join(', ')}`,
      });
      return;
    }

    // Check if order exists
    const existingOrder = await firestoreService.getOrder(id);
    if (!existingOrder) {
      res.status(404).json({
        success: false,
        error: 'Order not found',
      });
      return;
    }

    // Update the order status
    await firestoreService.updateDocument('orders', id, {
      status,
      updatedAt: new Date(),
    } as Partial<Order>);

    // Fetch the updated order
    const updatedOrder = await firestoreService.getOrder(id);
    if (!updatedOrder) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve updated order',
      });
      return;
    }

    res.json({
      success: true,
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
}
