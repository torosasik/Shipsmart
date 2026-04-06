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
import { labelLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { labelGenerationValidation, voidLabelValidation } from '../middleware/validation';

const router = Router();

/**
 * POST /api/labels/generate
 * Generate a shipping label.
 */
router.post('/generate', labelLimiter, validate(labelGenerationValidation), generateLabelHandler);

/**
 * POST /api/labels/void
 * Void a shipping label.
 */
router.post('/void', validate(voidLabelValidation), voidLabelHandler);

/**
 * GET /api/labels/:trackingNumber/reprint
 * Reprint a label by tracking number.
 */
router.get('/:trackingNumber/reprint', reprintLabelHandler);

export default router;
