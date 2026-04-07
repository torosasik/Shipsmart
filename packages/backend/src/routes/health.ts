/**
 * Health check route.
 * Returns detailed server and service status.
 */

import { Router, Request, Response } from 'express';
import { getFirebaseApp } from '../config/firebase';

const router = Router();

type ServiceStatus = 'healthy' | 'unhealthy' | 'unconfigured';

interface ServiceInfo {
  status: ServiceStatus;
  message: string;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    api: ServiceInfo;
    firebase: ServiceInfo;
    carriers: Record<string, ServiceInfo>;
  };
  version: string;
}

/**
 * GET /api/health
 * Returns server health status with detailed service checks.
 */
router.get('/', (_req: Request, res: Response): void => {
  // Check Firebase
  const firebaseApp = getFirebaseApp();
  const firebaseStatus: ServiceInfo = firebaseApp
    ? { status: 'healthy', message: 'Firebase Admin SDK initialized' }
    : { status: 'unhealthy', message: 'Firestore not initialized' };

  // Check carriers via env vars
  const carrierChecks: Record<string, { envVars: string[] }> = {
    fedex: { envVars: ['FEDEX_API_KEY', 'FEDEX_API_SECRET'] },
    ups: { envVars: ['UPS_CLIENT_ID', 'UPS_CLIENT_SECRET'] },
    usps: { envVars: ['USPS_API_KEY'] },
    shippo: { envVars: ['SHIPPO_API_KEY'] },
    shipstation: { envVars: ['SHIPSTATION_API_KEY', 'SHIPSTATION_API_SECRET'] },
    veeqo: { envVars: ['VEEQO_API_KEY'] },
  };

  const carriers: Record<string, ServiceInfo> = {};
  for (const [carrier, { envVars }] of Object.entries(carrierChecks)) {
    const configured = envVars.some((v) => !!process.env[v]);
    carriers[carrier] = configured
      ? { status: 'healthy', message: 'API key configured' }
      : { status: 'unconfigured', message: 'No API key configured' };
  }

  // Determine overall status
  const isCriticalDown = firebaseStatus.status === 'unhealthy';
  const anyCarrierConfigured = Object.values(carriers).some(
    (c) => c.status === 'healthy',
  );
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (isCriticalDown) {
    overallStatus = 'degraded'; // API is still up so not fully unhealthy
  } else if (!anyCarrierConfigured) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services: {
      api: { status: 'healthy', message: 'Backend API running' },
      firebase: firebaseStatus,
      carriers,
    },
    version: '0.1.0',
  };

  res.json(response);
});

export default router;
