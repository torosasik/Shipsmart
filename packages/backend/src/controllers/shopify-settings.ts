/**
 * Shopify Settings Controller for the ShipSmart shipping platform.
 * Handles API requests for managing Shopify API credentials.
 */

import { Request, Response } from 'express';
import {
  getShopifySettingsInfo,
  getMaskedShopifySettings,
  saveShopifySettings,
  testShopifyConnection,
} from '../services/shopify-settings';

/**
 * GET /api/settings/shopify
 * Get Shopify settings info and masked credentials for the UI.
 */
export async function getShopifySettingsHandler(_req: Request, res: Response): Promise<void> {
  try {
    const [settingsInfo, maskedCredentials] = await Promise.all([
      getShopifySettingsInfo(),
      getMaskedShopifySettings(),
    ]);

    res.json({
      success: true,
      data: {
        ...settingsInfo,
        maskedCredentials,
      },
    });
  } catch (error) {
    console.error('[ShopifySettings] Error getting settings:', error);
    res.status(500).json({ success: false, error: 'Failed to load Shopify settings' });
  }
}

/**
 * PUT /api/settings/shopify
 * Update Shopify settings and credentials.
 */
export async function updateShopifySettings(req: Request, res: Response): Promise<void> {
  try {
    const { storeDomain, accessToken, webhookSecret, apiVersion, enabled } = req.body;

    // Basic validation
    if (typeof enabled !== 'boolean') {
      res.status(400).json({ success: false, error: 'enabled must be a boolean' });
      return;
    }

    if (typeof storeDomain !== 'string' || storeDomain.trim().length === 0) {
      res.status(400).json({ success: false, error: 'storeDomain is required' });
      return;
    }

    if (typeof accessToken !== 'string' || accessToken.trim().length === 0) {
      res.status(400).json({ success: false, error: 'accessToken is required' });
      return;
    }

    if (typeof apiVersion !== 'string' || apiVersion.trim().length === 0) {
      res.status(400).json({ success: false, error: 'apiVersion is required' });
      return;
    }

    // Only pass webhookSecret if it was provided and non-empty (it's optional)
    const settingsPayload: Parameters<typeof saveShopifySettings>[0] = {
      storeDomain: storeDomain.trim(),
      accessToken: accessToken.trim(),
      apiVersion: apiVersion.trim(),
      enabled,
    };

    // Only include webhookSecret if provided
    if (webhookSecret && webhookSecret.trim().length > 0) {
      settingsPayload.webhookSecret = webhookSecret.trim();
    }

    await saveShopifySettings(settingsPayload);

    res.json({ success: true, message: 'Shopify settings updated successfully' });
  } catch (error) {
    console.error('[ShopifySettings] Error updating settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update Shopify settings' });
  }
}

/**
 * POST /api/settings/shopify/test
 * Test Shopify API connection.
 */
export async function testShopifyConnectionHandler(_req: Request, res: Response): Promise<void> {
  try {
    const result = await testShopifyConnection();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[ShopifySettings] Error testing connection:', error);
    res.status(500).json({ success: false, error: 'Failed to test Shopify connection' });
  }
}

/**
 * POST /api/settings/shopify/sync
 * Trigger a manual order sync from Shopify.
 */
export async function triggerShopifySyncHandler(_req: Request, res: Response): Promise<void> {
  try {
    // Reuse the existing sync logic from orders controller
    const { syncFromShopifyHandler } = await import('./orders');

    // Create a mock request/response for the sync handler
    const mockReq = {} as Request;
    const mockRes = {
      json: (data: any) => {
        // Return the sync result
        res.json(data);
      },
      status: (code: number) => {
        mockRes.statusCode = code;
        return mockRes;
      },
      statusCode: 200,
    } as Response;

    await syncFromShopifyHandler(mockReq, mockRes, () => {});
  } catch (error) {
    console.error('[ShopifySettings] Error triggering sync:', error);
    res.status(500).json({ success: false, error: 'Failed to trigger Shopify sync' });
  }
}