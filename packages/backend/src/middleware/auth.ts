/**
 * Firebase authentication middleware.
 * Validates Firebase ID tokens from request headers.
 */

import { Request, Response, NextFunction } from 'express';
import { getFirebaseApp } from '../config/firebase';
import { AppError } from './errorHandler';

/**
 * Firebase auth middleware.
 * Expects Authorization header with Bearer token.
 * Attaches decodeded token to request as `req.user`.
 */
export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const firebaseApp = getFirebaseApp();

  // If Firebase is not initialized, allow requests in dev mode
  if (!firebaseApp) {
    console.warn('[Auth] Firebase not initialized, skipping auth check');
    next();
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
    };
    next();
  } catch (error) {
    console.error('[Auth] Token verification failed:', error);
    next(new AppError('Unauthorized: Invalid token', 401));
  }
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
