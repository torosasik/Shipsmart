/**
 * Return processing controller for the ShipSmart shipping platform.
 * Handles create return, get returns, and update status endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import {
  ReturnEvent,
  ReturnStatus,
} from '@shipsmart/shared';
import {
  createReturn,
  getReturnEvent,
  listReturnEventsForOrder,
  updateReturnStatus,
  CreateReturnRequest,
  UpdateReturnStatusRequest,
} from '../services/returns';
import { ApiResponse, PaginatedResponse } from '../models';

/**
 * POST /api/returns
 * Create a return shipment.
 */
export async function createReturnHandler(
  req: Request,
  res: Response<ApiResponse<ReturnEvent>>,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      originalOrderId,
      originalShipmentId,
      boxCount,
      boxes,
      carrier,
      fromAddress,
      toAddress,
      notes,
    } = req.body as CreateReturnRequest;

    // Validate required fields
    if (!originalOrderId || !originalShipmentId) {
      res.status(400).json({
        success: false,
        error: 'Missing originalOrderId or originalShipmentId',
      });
      return;
    }

    if (!boxCount || !boxes || boxes.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Missing boxCount or boxes',
      });
      return;
    }

    if (!carrier || !fromAddress || !toAddress) {
      res.status(400).json({
        success: false,
        error: 'Missing carrier, fromAddress, or toAddress',
      });
      return;
    }

    const result = await createReturn({
      originalOrderId,
      originalShipmentId,
      boxCount,
      boxes,
      carrier,
      fromAddress,
      toAddress,
      notes,
    });

    res.status(201).json({
      success: true,
      data: result.returnEvent,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/returns
 * List return events with pagination.
 */
export async function listReturnsHandler(
  req: Request,
  res: Response<ApiResponse<PaginatedResponse<ReturnEvent>>>,
  next: NextFunction,
): Promise<void> {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const orderId = req.query.orderId as string | undefined;

    // If orderId is provided, filter by order
    let returns: ReturnEvent[] = [];
    if (orderId) {
      returns = await listReturnEventsForOrder(orderId);
    }

    // TODO: Implement full pagination support
    res.json({
      success: true,
      data: {
        items: returns,
        total: returns.length,
        page,
        limit,
        hasMore: false,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/returns/:id
 * Get a return event by ID.
 */
export async function getReturnHandler(
  req: Request,
  res: Response<ApiResponse<ReturnEvent>>,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Missing return ID',
      });
      return;
    }

    const returnEvent = await getReturnEvent(id);

    if (!returnEvent) {
      res.status(404).json({
        success: false,
        error: 'Return event not found',
      });
      return;
    }

    res.json({
      success: true,
      data: returnEvent,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/returns/:id/status
 * Update return status.
 */
export async function updateReturnStatusHandler(
  req: Request,
  res: Response<ApiResponse<ReturnEvent>>,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const { status, notes } = req.body as UpdateReturnStatusRequest;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Missing return ID',
      });
      return;
    }

    if (!status || !Object.values(ReturnStatus).includes(status)) {
      res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${Object.values(ReturnStatus).join(', ')}`,
      });
      return;
    }

    const returnEvent = await updateReturnStatus(id, { status, notes });

    res.json({
      success: true,
      data: returnEvent,
    });
  } catch (error) {
    next(error);
  }
}
