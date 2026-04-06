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

const router = Router();

// Mount routes
router.use('/health', healthRouter);
router.use('/rates', ratesRouter);
router.use('/shipments', shipmentsRouter);
router.use('/returns', returnsRouter);
router.use('/labels', labelsRouter);
router.use('/consolidation', consolidationRouter);
router.use('/orders', ordersRouter);

export default router;
