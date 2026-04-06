/**
 * Shipment CRUD controller for the ShipSmart shipping platform.
 * Handles list, get, create, and update status endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { Shipment, ShipmentStatus, ShipmentType, CarrierId, Timestamp } from '@shipsmart/shared';
import { ApiResponse, PaginatedResponse } from '../models';

// TODO: Replace with actual Firestore service
// import { listShipments, getShipment, createShipment, updateShipmentStatus } from '../services/shipment';

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

    // TODO: Call actual service
    // const result = await listShipments({ page, limit, status, orderId });

    // Mock response
    const mockShipments: Shipment[] = [];
    res.json({
      success: true,
      data: {
        items: mockShipments,
        total: 0,
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

    // TODO: Call actual service
    // const shipment = await getShipment(id);
    // if (!shipment) {
    //   res.status(404).json({ success: false, error: 'Shipment not found' });
    //   return;
    // }

    // Mock response
    res.json({
      success: true,
      data: null as unknown as Shipment,
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

    // TODO: Call actual service
    // const shipment = await createShipment({ ... });

    // Mock response
    const now = new Date() as unknown as Timestamp;
    const mockShipment: Shipment = {
      id: `shp-${Date.now()}`,
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
      createdAt: now,
      shippedAt: null,
      deliveredAt: null,
      shopifySynced: false,
      shopifySyncedAt: null,
    };

    res.status(201).json({
      success: true,
      data: mockShipment,
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

    // TODO: Call actual service
    // const shipment = await updateShipmentStatus(id, status);

    // Mock response
    const now = new Date() as unknown as Timestamp;
    const mockShipment: Shipment = {
      id,
      orderId: '',
      type: ShipmentType.Outbound,
      carrier: CarrierId.UPS,
      serviceLevel: '',
      trackingNumbers: [],
      labels: [],
      fromAddress: {} as any,
      toAddress: {} as any,
      boxes: [],
      totalCost: 0,
      currency: 'USD',
      status,
      createdAt: now,
      shippedAt: status === ShipmentStatus.InTransit ? now : null,
      deliveredAt: status === ShipmentStatus.Delivered ? now : null,
      shopifySynced: false,
      shopifySyncedAt: null,
    };

    res.json({
      success: true,
      data: mockShipment,
    });
  } catch (error) {
    next(error);
  }
}
