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

    // TODO: Call actual service to fetch orders from Firestore
    // const result = await listOrders({ page, limit, status });

    // Mock response
    const mockOrders: Order[] = [];
    res.json({
      success: true,
      data: {
        items: mockOrders,
        total: 0,
        page,
        limit,
        hasMore: false,
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

    // TODO: Call actual service
    // const order = await getOrder(id);
    // if (!order) {
    //   res.status(404).json({ success: false, error: 'Order not found' });
    //   return;
    // }

    // Mock response
    res.json({
      success: true,
      data: null as unknown as Order,
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
    // TODO: Call Shopify API to fetch orders
    // - Use Admin API to get orders since last sync
    // - Transform to Order format
    // - Upsert into Firestore

    // Mock response
    const mockSynced = 0;
    const mockErrors: string[] = [];

    res.json({
      success: true,
      data: {
        synced: mockSynced,
        errors: mockErrors,
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

    // TODO: Call actual service
    // const order = await updateOrderStatus(id, status);

    // Mock response
    const now = new Date() as unknown as Timestamp;
    const mockOrder: Order = {
      id,
      shopifyOrderId: '',
      customerName: '',
      customerEmail: '',
      status,
      lineItems: [],
      shippingAddress: {} as any,
      totalWeight: 0,
      boxCount: 0,
      createdAt: now,
      updatedAt: now,
      syncedAt: now,
    };

    res.json({
      success: true,
      data: mockOrder,
    });
  } catch (error) {
    next(error);
  }
}
