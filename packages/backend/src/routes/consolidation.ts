/**
 * Consolidation routes for the ShipSmart shipping platform.
 * Mounts consolidation endpoints.
 */

import { Router } from 'express';
import {
  findOpportunitiesHandler,
  applyConsolidationHandler,
  getOpportunitiesHandler,
} from '../controllers/consolidation';
import { validate } from '../middleware/validate';
import { consolidateOrdersValidation } from '../middleware/validation';

const router = Router();

/**
 * GET /api/consolidation/opportunities
 * Get consolidation opportunities (query params version).
 * Query params: maxDaysApart
 */
router.get('/opportunities', getOpportunitiesHandler);

/**
 * POST /api/consolidation/opportunities
 * Find consolidation opportunities for orders.
 * Body: { orders: Order[], maxDaysApart?: number }
 */
router.post('/opportunities', findOpportunitiesHandler);

/**
 * POST /api/consolidation/apply
 * Apply consolidation to selected orders.
 * Body: { orderIds: string[], boxes: PackageDetail[], notes?: string }
 */
router.post('/apply', validate(consolidateOrdersValidation), applyConsolidationHandler);

export default router;
