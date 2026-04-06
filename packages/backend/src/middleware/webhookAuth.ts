/**
 * Webhook signature verification middleware.
 * Validates HMAC signatures for Shopify and carrier webhooks.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/environment';

// ============================================================================
// Types
// ============================================================================

/** Raw body storage for webhook verification */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

// ============================================================================
// Shopify Webhook Verification
// ============================================================================

/**
 * Verify Shopify webhook HMAC signature.
 * Shopify sends X-Shopify-Hmac-Sha256 header computed from the raw request body.
 */
export function verifyShopifyWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const hmacHeader = req.headers['x-shopify-hmac-sha256'] as string;

  if (!hmacHeader) {
    console.warn('[Webhook] Missing Shopify HMAC signature');
    res.status(401).json({
      success: false,
      error: 'Missing Shopify HMAC signature',
    });
    return;
  }

  // Use raw body if available, otherwise fall back to JSON string
  const body = req.rawBody
    ? req.rawBody.toString('utf8')
    : JSON.stringify(req.body);

  const secret = env.shopifySharedSecret;
  if (!secret) {
    console.error('[Webhook] SHOPIFY_SHARED_SECRET not configured');
    res.status(500).json({
      success: false,
      error: 'Webhook verification not configured',
    });
    return;
  }

  const computedHmac = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  // Use timing-safe comparison to prevent timing attacks
  const hmacBuffer = Buffer.from(hmacHeader, 'base64');
  const computedBuffer = Buffer.from(computedHmac, 'base64');

  if (
    hmacBuffer.length !== computedBuffer.length ||
    !crypto.timingSafeEqual(hmacBuffer, computedBuffer)
  ) {
    console.warn('[Webhook] Invalid Shopify HMAC signature');
    res.status(401).json({
      success: false,
      error: 'Invalid Shopify HMAC signature',
    });
    return;
  }

  next();
}

// ============================================================================
// Carrier Webhook Verification
// ============================================================================

/**
 * Verify carrier webhook signature.
 * Checks for X-Carrier-Signature header against configured secret.
 * Falls back to allowing requests if no secret is configured (development mode).
 */
export function verifyCarrierWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const { carrier } = req.params as { carrier: string };
  const signature = req.headers['x-carrier-signature'] as string;

  // Build the environment variable name for the carrier secret
  const secretEnvName = `CARRIER_WEBHOOK_SECRET_${carrier.toUpperCase().replace(/-/g, '_')}`;
  const secret = process.env[secretEnvName];

  if (!secret) {
    // Allow in development mode but log a warning
    console.warn(
      `[Webhook] No webhook secret configured for carrier: ${carrier}. Set ${secretEnvName} in production.`,
    );
    next();
    return;
  }

  if (!signature) {
    res.status(401).json({
      success: false,
      error: 'Missing carrier signature',
    });
    return;
  }

  // Use raw body if available, otherwise fall back to JSON string
  const body = req.rawBody
    ? req.rawBody.toString('utf8')
    : JSON.stringify(req.body);

  const computedHmac = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('hex');

  // Use timing-safe comparison
  if (
    signature.length !== computedHmac.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedHmac))
  ) {
    console.warn(`[Webhook] Invalid carrier signature for carrier: ${carrier}`);
    res.status(401).json({
      success: false,
      error: 'Invalid carrier signature',
    });
    return;
  }

  next();
}
