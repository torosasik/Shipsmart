/**
 * Label routes for the ShipSmart shipping platform.
 * Mounts label generation endpoints.
 */

import { Router } from 'express';
import {
  generateLabelHandler,
  voidLabelHandler,
  reprintLabelHandler,
} from '../controllers/labels';

const router = Router();

/**
 * POST /api/labels/generate
 * Generate a shipping label.
 */
router.post('/generate', generateLabelHandler);

/**
 * POST /api/labels/void
 * Void a shipping label.
 */
router.post('/void', voidLabelHandler);

/**
 * GET /api/labels/:trackingNumber/reprint
 * Reprint a label by tracking number.
 */
router.get('/:trackingNumber/reprint', reprintLabelHandler);

export default router;
