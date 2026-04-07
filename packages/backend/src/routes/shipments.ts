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
import { validate } from '../middleware/validate';
import { createShipmentValidation, idParamValidation } from '../middleware/validation';
import { shipmentLimiter } from '../middleware/rateLimiter';

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
router.get('/:id', validate(idParamValidation), getShipmentHandler);

/**
 * POST /api/shipments
 * Create a new shipment.
 */
router.post('/', shipmentLimiter, validate(createShipmentValidation), createShipmentHandler);

/**
 * PATCH /api/shipments/:id/status
 * Update shipment status.
 */
router.patch('/:id/status', validate(idParamValidation), updateShipmentStatusHandler);

export default router;
