/**
 * Consolidation controller for the ShipSmart shipping platform.
 * Handles find consolidation opportunities and apply consolidation endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import {
  Order,
} from '@shipsmart/shared';
import {
  analyzeConsolidationOpportunities,
  consolidateOrders,
  ConsolidationAnalysis,
  ConsolidateOrdersRequest,
  ConsolidateOrdersResponse,
} from '../services/consolidation';
import { ApiResponse } from '../models';

/**
 * POST /api/consolidation/opportunities
 * Find consolidation opportunities for orders.
 */
export async function findOpportunitiesHandler(
  req: Request,
  res: Response<ApiResponse<ConsolidationAnalysis>>,
  next: NextFunction,
): Promise<void> {
  try {
    const { orders, maxDaysApart } = req.body;

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid orders array',
      });
      return;
    }

    const maxDays = maxDaysApart ? parseInt(maxDaysApart as string, 10) : 3;

    const analysis = analyzeConsolidationOpportunities(orders as Order[], maxDays);

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/consolidation/apply
 * Apply consolidation to selected orders.
 */
export async function applyConsolidationHandler(
  req: Request,
  res: Response<ApiResponse<ConsolidateOrdersResponse>>,
  next: NextFunction,
): Promise<void> {
  try {
    const { orderIds, boxes, notes } = req.body as ConsolidateOrdersRequest;

    // Validate required fields
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length < 2) {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid orderIds. At least 2 orders required.',
      });
      return;
    }

    if (!boxes || !Array.isArray(boxes) || boxes.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid boxes',
      });
      return;
    }

    const result = await consolidateOrders({
      orderIds,
      boxes,
      notes,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/consolidation/opportunities
 * Get consolidation opportunities (query params version).
 */
export async function getOpportunitiesHandler(
  req: Request,
  res: Response<ApiResponse<ConsolidationAnalysis>>,
  next: NextFunction,
): Promise<void> {
  try {
    const maxDaysApart = req.query.maxDaysApart
      ? parseInt(req.query.maxDaysApart as string, 10)
      : 3;

    // TODO: Fetch pending orders from Firestore
    // const orders = await getPendingOrders();

    // Mock empty response for now
    const mockOrders: Order[] = [];
    const analysis = analyzeConsolidationOpportunities(mockOrders, maxDaysApart);

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
}
