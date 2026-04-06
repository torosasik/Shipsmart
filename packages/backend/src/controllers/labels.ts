/**
 * Label generation controller for the ShipSmart shipping platform.
 * Handles generate label, void label, and reprint label endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import {
  LabelResponse,
} from '@shipsmart/shared';
import {
  generateLabel,
  voidLabel,
  reprintLabel,
  GenerateLabelRequest,
  VoidLabelRequest,
} from '../services/label';
import { ApiResponse } from '../models';

/**
 * POST /api/labels/generate
 * Generate a shipping label.
 */
export async function generateLabelHandler(
  req: Request,
  res: Response<ApiResponse<LabelResponse>>,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      carrier,
      serviceLevel,
      fromAddress,
      toAddress,
      packages,
      reference,
      userId,
      orderId,
    } = req.body as GenerateLabelRequest;

    // Validate required fields
    if (!carrier || !serviceLevel) {
      res.status(400).json({
        success: false,
        error: 'Missing carrier or serviceLevel',
      });
      return;
    }

    if (!fromAddress || !toAddress) {
      res.status(400).json({
        success: false,
        error: 'Missing fromAddress or toAddress',
      });
      return;
    }

    if (!packages || packages.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Missing packages',
      });
      return;
    }

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'Missing userId for audit logging',
      });
      return;
    }

    const result = await generateLabel({
      carrier,
      serviceLevel,
      fromAddress,
      toAddress,
      packages,
      reference,
      userId,
      orderId,
    });

    res.status(201).json({
      success: true,
      data: result.label,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/labels/void
 * Void a shipping label.
 */
export async function voidLabelHandler(
  req: Request,
  res: Response<ApiResponse<{ success: boolean }>>,
  next: NextFunction,
): Promise<void> {
  try {
    const { trackingNumber, carrier, userId } = req.body as VoidLabelRequest;

    // Validate required fields
    if (!trackingNumber || !carrier) {
      res.status(400).json({
        success: false,
        error: 'Missing trackingNumber or carrier',
      });
      return;
    }

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'Missing userId for audit logging',
      });
      return;
    }

    const success = await voidLabel({
      trackingNumber,
      carrier,
      userId,
    });

    if (!success) {
      res.status(400).json({
        success: false,
        error: 'Failed to void label',
      });
      return;
    }

    res.json({
      success: true,
      data: { success },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/labels/:trackingNumber/reprint
 * Reprint a label by tracking number.
 */
export async function reprintLabelHandler(
  req: Request,
  res: Response<ApiResponse<{ labelUrl: string }>>,
  next: NextFunction,
): Promise<void> {
  try {
    const { trackingNumber } = req.params;

    if (!trackingNumber) {
      res.status(400).json({
        success: false,
        error: 'Missing tracking number',
      });
      return;
    }

    const labelUrl = await reprintLabel(trackingNumber);

    if (!labelUrl) {
      res.status(404).json({
        success: false,
        error: 'Label not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { labelUrl },
    });
  } catch (error) {
    next(error);
  }
}
