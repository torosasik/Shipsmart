/**
 * Order routes for the ShipSmart shipping platform.
 * Mounts order management endpoints.
 */

import { Router } from 'express';
import {
  listOrdersHandler,
  getOrderHandler,
  syncFromShopifyHandler,
  updateOrderStatusHandler,
} from '../controllers/orders';

const router = Router();

/**
 * GET /api/orders
 * List orders with pagination.
 * Query params: page, limit
 */
router.get('/', listOrdersHandler);

/**
 * GET /api/orders/:id
 * Get a single order by ID.
 */
router.get('/:id', getOrderHandler);

/**
 * POST /api/orders/sync
 * Sync orders from Shopify.
 */
router.post('/sync', syncFromShopifyHandler);

/**
 * PATCH /api/orders/:id/status
 * Update order status.
 */
router.patch('/:id/status', updateOrderStatusHandler);

export default router;
