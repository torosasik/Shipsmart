/**
 * Return routes for the ShipSmart shipping platform.
 * Mounts return processing endpoints.
 */

import { Router } from 'express';
import {
  createReturnHandler,
  listReturnsHandler,
  getReturnHandler,
  updateReturnStatusHandler,
} from '../controllers/returns';

const router = Router();

/**
 * POST /api/returns
 * Create a return shipment.
 */
router.post('/', createReturnHandler);

/**
 * GET /api/returns
 * List return events with pagination.
 * Query params: page, limit, orderId
 */
router.get('/', listReturnsHandler);

/**
 * GET /api/returns/:id
 * Get a return event by ID.
 */
router.get('/:id', getReturnHandler);

/**
 * PATCH /api/returns/:id/status
 * Update return status.
 */
router.patch('/:id/status', updateReturnStatusHandler);

export default router;
