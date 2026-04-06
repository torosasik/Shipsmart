/**
 * Rate shopping routes for the ShipSmart shipping platform.
 * Mounts rate shopping endpoints.
 */

import { Router } from 'express';
import { shopRatesHandler } from '../controllers/rates';

const router = Router();

/**
 * POST /api/rates/shop
 * Shop rates across all enabled carriers.
 * Request body: RateRequest
 * Response: RateComparisonResponse
 */
router.post('/shop', shopRatesHandler);

export default router;
