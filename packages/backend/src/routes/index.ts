/**
 * Route aggregator.
 * Mounts all API routes under /api.
 */

import { Router } from 'express';
import healthRouter from './health';
import ratesRouter from './rates';
import shipmentsRouter from './shipments';
import returnsRouter from './returns';
import labelsRouter from './labels';
import consolidationRouter from './consolidation';
import ordersRouter from './orders';
import webhooksRouter from './webhooks';
import settingsRouter from './settings';

const router = Router();

// Mount routes
router.use('/health', healthRouter);
router.use('/rates', ratesRouter);
router.use('/shipments', shipmentsRouter);
router.use('/returns', returnsRouter);
router.use('/labels', labelsRouter);
router.use('/consolidation', consolidationRouter);
router.use('/orders', ordersRouter);
router.use('/webhooks', webhooksRouter);
router.use('/settings', settingsRouter);

export default router;
