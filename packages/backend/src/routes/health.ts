/**
 * Health check route.
 * Returns server status and timestamp.
 */

import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /api/health
 * Returns server health status.
 */
router.get('/', (_req: Request, res: Response): void => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;
