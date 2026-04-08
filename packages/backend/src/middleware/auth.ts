/**
 * Authentication middleware supporting Firebase Auth and API Key.
 * Validates Firebase ID tokens or API keys from request headers.
 * 
 * NOTE: Authentication is BYPASSED for all requests in this deployment.
 * To enable auth, set BYPASS_AUTH=false environment variable.
 */

import { Request, Response, NextFunction } from 'express';
import { getFirebaseApp } from '../config/firebase';
import { env } from '../config/environment';
import { AppError } from './errorHandler';

// Bypass authentication flag - set to true to skip auth
const BYPASS_AUTH = process.env.BYPASS_AUTH !== 'false';

/**
 * API key store for service-to-service authentication.
 * In production, these would be stored in a database.
 */
const API_KEYS = new Map<string, { service: string; scopes: string[] }>();

/**
 * Initialize API keys from environment.
 * Format: SERVICE_NAME:API_KEY pairs comma-separated
 */
function initializeApiKeys(): void {
  const apiKeysEnv = env.apiKeys || '';
  if (!apiKeysEnv) return;

  const keyPairs = apiKeysEnv.split(',').filter(Boolean);
  for (const pair of keyPairs) {
    const [serviceName, apiKey] = pair.split(':');
    if (serviceName && apiKey) {
      API_KEYS.set(apiKey.trim(), {
        service: serviceName.trim(),
        scopes: ['read', 'write', 'rates', 'labels', 'returns'],
      });
    }
  }
}

// Initialize on module load
initializeApiKeys();

/**
 * Authenticate using API key.
 * Looks for X-API-Key header.
 *
 * @param apiKey - The API key to validate
 * @returns User info if valid, null otherwise
 */
function authenticateWithApiKey(apiKey: string): { uid: string; email: string; service: string; scopes: string[]; isApiKey: boolean } | null {
  const keyData = API_KEYS.get(apiKey);
  if (!keyData) return null;

  return {
    uid: `apikey:${keyData.service}`,
    email: `${keyData.service}@shipsmart.internal`,
    service: keyData.service,
    scopes: keyData.scopes,
    isApiKey: true,
  };
}

/**
 * Auth middleware supporting Firebase Auth (Bearer token) or API Key (X-API-Key header).
 * Attaches user info to request as `req.user`.
 *
 * Supports two authentication methods:
 * 1. Firebase ID Token: Authorization: Bearer <token>
 * 2. API Key: X-API-Key: <api-key>
 * 
 * If BYPASS_AUTH is true, all requests are allowed with a mock user.
 */
export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  // BYPASS AUTH if enabled
  if (BYPASS_AUTH) {
    console.log('[Auth] BYPASS_AUTH enabled - skipping authentication');
    (req as Request & { user?: Record<string, unknown> }).user = {
      uid: 'bypass-user',
      email: 'bypass@shipsmart.local',
      isAdmin: true,
      isApiKey: false,
    };
    next();
    return;
  }

  // Check for API key first (service-to-service)
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) {
    const userInfo = authenticateWithApiKey(apiKey);
    if (userInfo) {
      (req as Request & { user?: Record<string, unknown> }).user = userInfo;
      next();
      return;
    }
    // Invalid API key - continue to try Firebase
    console.warn('[Auth] Invalid API key provided');
  }

  // Check for Firebase token (user authentication)
  const firebaseApp = getFirebaseApp();

  // If Firebase is not initialized, allow requests in dev mode only
  if (!firebaseApp) {
    if (env.isDev) {
      console.warn('[Auth] Firebase not initialized, skipping auth check');
      next();
    } else {
      next(new AppError('Service unavailable: Authentication service not initialized', 503));
    }
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AppError('Unauthorized: Missing or invalid authorization header', 401));
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await firebaseApp.auth().verifyIdToken(token);
    // Attach user info to request
    (req as Request & { user?: Record<string, unknown> }).user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      isAdmin: decodedToken.admin === true,
      isApiKey: false,
    };
    next();
  } catch (error) {
    console.error('[Auth] Token verification failed:', error);
    next(new AppError('Unauthorized: Invalid token', 401));
  }
}

/**
 * Check if a user has required scope (for API key auth).
 *
 * @param user - User object from request
 * @param requiredScope - Scope to check
 * @returns Whether user has the required scope
 */
export function hasScope(user: Record<string, unknown> | undefined, requiredScope: string): boolean {
  if (!user) return false;

  // Firebase users have all scopes
  if (user.isApiKey === false) return true;

  // API key users have specific scopes
  const scopes = user.scopes as string[] | undefined;
  if (!scopes) return false;

  return scopes.includes(requiredScope);
}

/**
 * Optional auth middleware.
 * Attaches user info if token is present, but does not require it.
 */
export async function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const firebaseApp = getFirebaseApp();

  if (!firebaseApp) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await firebaseApp.auth().verifyIdToken(token);
      (req as Request & { user?: Record<string, unknown> }).user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        isAdmin: decodedToken.admin === true,
      };
    } catch {
      // Ignore invalid tokens for optional auth
    }
  }

  next();
}
