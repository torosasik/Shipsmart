/**
 * Shipment routes for the ShipSmart shipping platform.
 * Mounts shipment CRUD endpoints.
 */

import { Router } from 'express';
import {
  listShipmentsHandler,
  getShipmentHandler,
  createShipmentHandler,
  updateShipmentStatusHandler,
} from '../controllers/shipments';

const router = Router();

/**
 * GET /api/shipments
 * List shipments with pagination.
 * Query params: page, limit, status, orderId
 */
router.get('/', listShipmentsHandler);

/**
 * GET /api/shipments/:id
 * Get a single shipment by ID.
 */
router.get('/:id', getShipmentHandler);

/**
 * POST /api/shipments
 * Create a new shipment.
 */
router.post('/', createShipmentHandler);

/**
 * PATCH /api/shipments/:id/status
 * Update shipment status.
 */
router.patch('/:id/status', updateShipmentStatusHandler);

export default router;
