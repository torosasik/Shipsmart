/**
 * Rate shopping controller for the ShipSmart shipping platform.
 * Handles POST /rates/shop endpoint.
 */

import { Request, Response, NextFunction } from 'express';
import { shopRates, RateComparisonResponse } from '../services/rate-shop';
import { RateRequest } from '@shipsmart/shared';
import { ApiResponse } from '../models';

/**
 * POST /api/rates/shop
 * Shop rates across all enabled carriers.
 */
export async function shopRatesHandler(
  req: Request,
  res: Response<ApiResponse<RateComparisonResponse>>,
  next: NextFunction,
): Promise<void> {
  try {
    const rateRequest = buildRateRequest(req.body);

    // Validate required fields
    if (!rateRequest.fromAddress || !rateRequest.toAddress) {
      res.status(400).json({
        success: false,
        error: 'Missing fromAddress or toAddress',
      });
      return;
    }

    if (!rateRequest.packages || rateRequest.packages.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Missing packages',
      });
      return;
    }

    const result = await shopRates(rateRequest);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Build a RateRequest from the request body.
 */
function buildRateRequest(body: Record<string, unknown>): RateRequest {
  const fromAddress = body.fromAddress as RateRequest['fromAddress'];
  const toAddress = body.toAddress as RateRequest['toAddress'];
  const packages = body.packages as RateRequest['packages'];
  const shipDate = body.shipDate ? new Date(body.shipDate as string) : new Date();
  const serviceLevels = body.serviceLevels as string[] | undefined;

  return {
    fromAddress,
    toAddress,
    packages,
    shipDate,
    serviceLevels,
  };
}
