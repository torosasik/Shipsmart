/**
 * Webhook routes for the ShipSmart shipping platform.
 */

import { Router } from 'express';
import {
  handleCarrierTrackingWebhook,
  handleShopifyOrderWebhook,
  handleShopifyFulfillmentWebhook,
} from '../controllers/webhooks';
import { verifyCarrierWebhook, verifyShopifyWebhook } from '../middleware/webhookAuth';

const router = Router();

/**
 * POST /api/webhooks/carriers/:carrier/tracking
 * Handle carrier tracking update webhooks.
 * Verified with X-Carrier-Signature header (HMAC-SHA256).
 */
router.post('/carriers/:carrier/tracking', verifyCarrierWebhook, handleCarrierTrackingWebhook);

/**
 * POST /api/webhooks/shopify/orders
 * Handle Shopify order creation/update webhooks.
 * Verified with X-Shopify-Hmac-Sha256 header.
 */
router.post('/shopify/orders', verifyShopifyWebhook, handleShopifyOrderWebhook);

/**
 * POST /api/webhooks/shopify/fulfillments
 * Handle Shopify fulfillment update webhooks.
 * Verified with X-Shopify-Hmac-Sha256 header.
 */
router.post('/shopify/fulfillments', verifyShopifyWebhook, handleShopifyFulfillmentWebhook);

export default router;
