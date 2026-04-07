/**
 * Shipment CRUD controller for the ShipSmart shipping platform.
 * Handles list, get, create, and update status endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { Shipment, ShipmentStatus, ShipmentType, CarrierId, Timestamp } from '@shipsmart/shared';
import { ApiResponse, PaginatedResponse } from '../models';
import { firestoreService } from '../services/firestore';

/**
 * GET /api/shipments
 * List shipments with pagination.
 */
export async function listShipmentsHandler(
  req: Request,
  res: Response<ApiResponse<PaginatedResponse<Shipment>>>,
  next: NextFunction,
): Promise<void> {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const status = req.query.status as string | undefined;
    const orderId = req.query.orderId as string | undefined;

    const result = await firestoreService.listShipments({
      limit,
      status,
      orderId,
    });

    // Calculate pagination metadata
    const hasMore = result.items.length === limit;
    const total = hasMore ? page * limit + 1 : (page - 1) * limit + result.items.length;

    res.json({
      success: true,
      data: {
        items: result.items,
        total,
        page,
        limit,
        hasMore,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/shipments/:id
 * Get a single shipment by ID.
 */
export async function getShipmentHandler(
  req: Request,
  res: Response<ApiResponse<Shipment>>,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Missing shipment ID',
      });
      return;
    }

    const shipment = await firestoreService.getShipment(id);
    if (!shipment) {
      res.status(404).json({
        success: false,
        error: 'Shipment not found',
      });
      return;
    }

    res.json({
      success: true,
      data: shipment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/shipments
 * Create a new shipment.
 */
export async function createShipmentHandler(
  req: Request,
  res: Response<ApiResponse<Shipment>>,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      orderId,
      type,
      carrier,
      serviceLevel,
      trackingNumbers,
      labels,
      fromAddress,
      toAddress,
      boxes,
      totalCost,
      currency,
    } = req.body;

    // Validate required fields
    if (!orderId) {
      res.status(400).json({
        success: false,
        error: 'Missing orderId',
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

    if (!boxes || boxes.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Missing boxes',
      });
      return;
    }

    // Build shipment object
    const now = new Date();
    const shipment: Shipment = {
      id: `shp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      orderId,
      type: type || ShipmentType.Outbound,
      carrier: carrier || CarrierId.UPS,
      serviceLevel: serviceLevel || 'GROUND',
      trackingNumbers: trackingNumbers || [],
      labels: labels || [],
      fromAddress,
      toAddress,
      boxes,
      totalCost: totalCost || 0,
      currency: currency || 'USD',
      status: ShipmentStatus.Created,
      createdAt: now as unknown as Timestamp,
      shippedAt: null,
      deliveredAt: null,
      shopifySynced: false,
      shopifySyncedAt: null,
    };

    // Save to Firestore
    await firestoreService.saveShipment(shipment);

    res.status(201).json({
      success: true,
      data: shipment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/shipments/:id/status
 * Update shipment status.
 */
export async function updateShipmentStatusHandler(
  req: Request,
  res: Response<ApiResponse<Shipment>>,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Missing shipment ID',
      });
      return;
    }

    if (!status || !Object.values(ShipmentStatus).includes(status)) {
      res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${Object.values(ShipmentStatus).join(', ')}`,
      });
      return;
    }

    // Get existing shipment
    const existingShipment = await firestoreService.getShipment(id);
    if (!existingShipment) {
      res.status(404).json({
        success: false,
        error: 'Shipment not found',
      });
      return;
    }

    // Calculate timestamps based on status
    const now = new Date();
    let shippedAt = existingShipment.shippedAt;
    let deliveredAt = existingShipment.deliveredAt;

    if (status === ShipmentStatus.InTransit && !shippedAt) {
      shippedAt = now as unknown as Timestamp;
    }
    if (status === ShipmentStatus.Delivered && !deliveredAt) {
      deliveredAt = now as unknown as Timestamp;
    }

    // Update in Firestore
    await firestoreService.updateDocument('shipments', id, {
      status,
      shippedAt,
      deliveredAt,
    } as Partial<Shipment>);

    // Fetch updated shipment
    const updatedShipment = await firestoreService.getShipment(id);
    if (!updatedShipment) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve updated shipment',
      });
      return;
    }

    res.json({
      success: true,
      data: updatedShipment,
    });
  } catch (error) {
    next(error);
  }
}
