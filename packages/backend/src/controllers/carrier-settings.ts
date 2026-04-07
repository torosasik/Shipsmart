/**
 * Carrier Settings Controller for the ShipSmart shipping platform.
 * Handles API requests for managing carrier API credentials.
 */

import { Request, Response } from 'express';
import { CarrierId } from '@shipsmart/shared';
import {
  getAllCarrierSettings,
  getCarrierSettings,
  saveCarrierSettings,
  testCarrierConnection,
  getMaskedCredentials,
} from '../services/carrier-settings';

/**
 * GET /api/settings/carriers
 * List all carrier settings with metadata.
 */
export async function listCarrierSettings(_req: Request, res: Response): Promise<void> {
  try {
    const carriers = await getAllCarrierSettings();
    res.json({ success: true, data: carriers });
  } catch (error) {
    console.error('[CarrierSettings] Error listing settings:', error);
    res.status(500).json({ success: false, error: 'Failed to load carrier settings' });
  }
}

/**
 * GET /api/settings/carriers/:carrierId
 * Get a single carrier's settings and masked credentials.
 */
export async function getCarrierSettingsHandler(req: Request, res: Response): Promise<void> {
  try {
    const carrierId = req.params.carrierId as CarrierId;

    if (!Object.values(CarrierId).includes(carrierId)) {
      res.status(400).json({ success: false, error: `Invalid carrier ID: ${carrierId}` });
      return;
    }

    const settings = await getCarrierSettings(carrierId);
    const maskedCredentials = await getMaskedCredentials(carrierId);

    res.json({
      success: true,
      data: {
        ...settings,
        maskedCredentials,
      },
    });
  } catch (error) {
    console.error('[CarrierSettings] Error getting settings:', error);
    res.status(500).json({ success: false, error: 'Failed to load carrier settings' });
  }
}

/**
 * PUT /api/settings/carriers/:carrierId
 * Update a carrier's settings and credentials.
 */
export async function updateCarrierSettings(req: Request, res: Response): Promise<void> {
  try {
    const carrierId = req.params.carrierId as CarrierId;

    if (!Object.values(CarrierId).includes(carrierId)) {
      res.status(400).json({ success: false, error: `Invalid carrier ID: ${carrierId}` });
      return;
    }

    const { enabled, sandbox, credentials } = req.body;

    if (typeof enabled !== 'boolean') {
      res.status(400).json({ success: false, error: 'enabled must be a boolean' });
      return;
    }

    if (typeof sandbox !== 'boolean') {
      res.status(400).json({ success: false, error: 'sandbox must be a boolean' });
      return;
    }

    if (!credentials || typeof credentials !== 'object') {
      res.status(400).json({ success: false, error: 'credentials must be an object' });
      return;
    }

    await saveCarrierSettings(carrierId, { enabled, sandbox, credentials });

    res.json({ success: true, message: `${carrierId} settings updated successfully` });
  } catch (error) {
    console.error('[CarrierSettings] Error updating settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update carrier settings' });
  }
}

/**
 * POST /api/settings/carriers/:carrierId/test
 * Test a carrier's API connection.
 */
export async function testCarrierConnectionHandler(req: Request, res: Response): Promise<void> {
  try {
    const carrierId = req.params.carrierId as CarrierId;

    if (!Object.values(CarrierId).includes(carrierId)) {
      res.status(400).json({ success: false, error: `Invalid carrier ID: ${carrierId}` });
      return;
    }

    const result = await testCarrierConnection(carrierId);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[CarrierSettings] Error testing connection:', error);
    res.status(500).json({ success: false, error: 'Failed to test carrier connection' });
  }
}
