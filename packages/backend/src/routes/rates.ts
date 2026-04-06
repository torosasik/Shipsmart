/**
 * Rate shopping routes for the ShipSmart shipping platform.
 * Mounts rate shopping endpoints.
 */

import { Router } from 'express';
import { shopRatesHandler } from '../controllers/rates';
import { rateShopLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { rateShopValidation } from '../middleware/validation';

const router = Router();

/**
 * POST /api/rates/shop
 * Shop rates across all enabled carriers.
 * Request body: RateRequest
 * Response: RateComparisonResponse
 */
router.post('/shop', rateShopLimiter, validate(rateShopValidation), shopRatesHandler);

export default router;
