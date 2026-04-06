/**
 * Multi-box return shipment service for the ShipSmart shipping platform.
 * Handles return label generation, tracking, and status management.
 */

import {
  CarrierId,
  ReturnEvent,
  ReturnStatus,
  ReturnBoxDetail,
  ReturnBoxLabel,
  LabelRef,
  Address,
  Timestamp,
} from '@shipsmart/shared';

// ============================================================================
// Types
// ============================================================================

/** Request payload for creating a return shipment */
export interface CreateReturnRequest {
  /** Original order ID */
  originalOrderId: string;
  /** Original shipment ID */
  originalShipmentId: string;
  /** Number of boxes being returned */
  boxCount: number;
  /** Details about each return box */
  boxes: ReturnBoxDetail[];
  /** Carrier for the return shipment */
  carrier: CarrierId;
  /** Origin address (customer's address) */
  fromAddress: Address;
  /** Destination address (warehouse address) */
  toAddress: Address;
  /** Additional notes about the return */
  notes?: string;
}

/** Response from creating a return shipment */
export interface CreateReturnResponse {
  /** Created return event */
  returnEvent: ReturnEvent;
  /** Generated labels for each box */
  labels: ReturnBoxLabel[];
  /** Total cost of the return shipment */
  totalCost: number;
}

/** Return status update request */
export interface UpdateReturnStatusRequest {
  /** New return status */
  status: ReturnStatus;
  /** Optional notes */
  notes?: string;
}

// ============================================================================
// Return Service
// ============================================================================

/**
 * Create a return shipment with multi-box support.
 *
 * @param request - Return creation request
 * @returns Created return event with labels
 */
export async function createReturn(
  request: CreateReturnRequest,
): Promise<CreateReturnResponse> {
  // Validate box count matches box details
  if (request.boxCount !== request.boxes.length) {
    throw new Error(
      `Box count (${request.boxCount}) does not match number of box details (${request.boxes.length})`,
    );
  }

  // Validate each box has required fields (trackingNumber is generated, not required in input)
  validateReturnBoxes(request.boxes);

  // Generate return shipment ID
  const returnShipmentId = generateReturnShipmentId();

  // Generate labels for each box
  const labels = await generateReturnLabels(
    request.boxes,
    request.carrier,
    request.fromAddress,
    request.toAddress,
  );

  // Calculate total cost
  const totalCost = calculateReturnCost(labels);

  // Extract tracking numbers from generated labels (not input boxes)
  const trackingNumbers = labels.map((label) => label.trackingNumber);

  // Create label references
  const labelRefs: LabelRef[] = labels.map((label) => ({
    url: label.labelUrl,
    format: 'PDF',
    trackingNumber: label.trackingNumber,
  }));

  // Build return event
  const now = new Date() as unknown as Timestamp;
  const returnEvent: ReturnEvent = {
    id: generateReturnEventId(),
    originalOrderId: request.originalOrderId,
    originalShipmentId: request.originalShipmentId,
    returnShipmentId,
    boxCount: request.boxCount,
    boxes: request.boxes,
    carrier: request.carrier,
    totalCost,
    trackingNumbers,
    labels: labelRefs,
    status: ReturnStatus.LabelsGenerated,
    createdAt: now,
    receivedAt: null,
    notes: request.notes || '',
  };

  // TODO: Save to Firestore returnEvents collection
  // await db.collection('returnEvents').doc(returnEvent.id).set(returnEvent);

  // TODO: Update original order status to 'returned'
  // await db.collection('orders').doc(request.originalOrderId).update({
  //   status: OrderStatus.Returned,
  //   updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  // });

  return {
    returnEvent,
    labels,
    totalCost,
  };
}

/**
 * Generate return labels for each box.
 *
 * @param boxes - Box details
 * @param carrier - Carrier for the return
 * @param fromAddress - Customer's address
 * @param toAddress - Warehouse address
 * @returns Array of generated labels
 */
async function generateReturnLabels(
  boxes: ReturnBoxDetail[],
  carrier: CarrierId,
  fromAddress: Address,
  toAddress: Address,
): Promise<ReturnBoxLabel[]> {
  const labels: ReturnBoxLabel[] = [];

  // Try to use carrier gateway if available
  const { getCarrier } = await import('./carriers/index');
  const carrierGateway = getCarrier(carrier);

  if (carrierGateway) {
    try {
      // Generate labels using carrier gateway
      for (let i = 0; i < boxes.length; i++) {
        const box = boxes[i];

        // Create label request with addresses
        const labelRequest = {
          fromAddress,
          toAddress,
          packages: [
            {
              length: box.length,
              width: box.width,
              height: box.height,
              weight: box.weight,
            },
          ],
          serviceLevel: 'ground',
          shipDate: new Date().toISOString(),
        };

        try {
          const labelResponse = await carrierGateway.createLabel(labelRequest as any);

          labels.push({
            boxIndex: i,
            trackingNumber: labelResponse.trackingNumber,
            labelUrl: labelResponse.labelUrl,
          });
        } catch (err) {
          // Fall back to mock label if carrier API fails
          console.warn(`[Returns] Carrier label generation failed for box ${i + 1}, using mock label:`, err);
          const trackingNumber = generateTrackingNumber(carrier, i);
          labels.push({
            boxIndex: i,
            trackingNumber,
            labelUrl: `gs://shipsmart-labels/returns/${trackingNumber}.pdf`,
          });
        }
      }

      return labels;
    } catch (err) {
      console.warn('[Returns] Carrier gateway error, falling back to mock labels:', err);
    }
  }

  // Fallback: Generate mock labels when carrier gateway is unavailable
  for (let i = 0; i < boxes.length; i++) {
    const trackingNumber = generateTrackingNumber(carrier, i);

    labels.push({
      boxIndex: i,
      trackingNumber,
      labelUrl: `gs://shipsmart-labels/returns/${trackingNumber}.pdf`,
    });
  }

  return labels;
}

/**
 * Calculate total cost of the return shipment.
 *
 * @param labels - Generated labels
 * @returns Total cost in USD
 */
function calculateReturnCost(labels: ReturnBoxLabel[]): number {
  // TODO: Get actual rates from carrier gateway
  // Mock calculation: $8.50 per box base rate
  const baseRatePerBox = 8.5;
  const totalCost = labels.length * baseRatePerBox;

  return Math.round(totalCost * 100) / 100;
}

/**
 * Validate return box details.
 *
 * @param boxes - Box details to validate
 * @throws Error if validation fails
 */
function validateReturnBoxes(boxes: ReturnBoxDetail[]): void {
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i];

    if (!box.length || box.length <= 0) {
      throw new Error(`Box ${i + 1}: Invalid length`);
    }
    if (!box.width || box.width <= 0) {
      throw new Error(`Box ${i + 1}: Invalid width`);
    }
    if (!box.height || box.height <= 0) {
      throw new Error(`Box ${i + 1}: Invalid height`);
    }
    if (!box.weight || box.weight <= 0) {
      throw new Error(`Box ${i + 1}: Invalid weight`);
    }
    // Note: trackingNumber is generated, not required in input
  }
}

/**
 * Update the status of a return event.
 *
 * @param returnEventId - Return event ID
 * @param update - Status update request
 * @returns Updated return event
 */
export async function updateReturnStatus(
  returnEventId: string,
  update: UpdateReturnStatusRequest,
): Promise<ReturnEvent> {
  // TODO: Fetch return event from Firestore
  // const doc = await db.collection('returnEvents').doc(returnEventId).get();
  // if (!doc.exists) {
  //   throw new Error(`Return event not found: ${returnEventId}`);
  // }
  // const returnEvent = doc.data() as ReturnEvent;

  // Mock return event for development
  const now = new Date() as unknown as Timestamp;
  const returnEvent: ReturnEvent = {
    id: returnEventId,
    originalOrderId: '',
    originalShipmentId: '',
    returnShipmentId: '',
    boxCount: 0,
    boxes: [],
    carrier: CarrierId.UPS,
    totalCost: 0,
    trackingNumbers: [],
    labels: [],
    status: update.status,
    createdAt: now,
    receivedAt: update.status === ReturnStatus.Received ? now : null,
    notes: update.notes || '',
  };

  // Update status
  returnEvent.status = update.status;

  // Set receivedAt if status is Received
  if (update.status === ReturnStatus.Received) {
    returnEvent.receivedAt = now;
  }

  // TODO: Save to Firestore
  // await db.collection('returnEvents').doc(returnEventId).update({
  //   status: update.status,
  //   receivedAt: update.status === ReturnStatus.Received
  //     ? admin.firestore.FieldValue.serverTimestamp()
  //     : returnEvent.receivedAt,
  //   notes: update.notes || returnEvent.notes,
  // });

  return returnEvent;
}

/**
 * Get a return event by ID.
 *
 * @param returnEventId - Return event ID
 * @returns Return event or null if not found
 */
export async function getReturnEvent(
  _returnEventId: string,
): Promise<ReturnEvent | null> {
  // TODO: Fetch from Firestore
  // const doc = await db.collection('returnEvents').doc(returnEventId).get();
  // if (!doc.exists) return null;
  // return doc.data() as ReturnEvent;

  // Mock for development
  return null;
}

/**
 * List return events for an order.
 *
 * @param orderId - Order ID
 * @returns Array of return events
 */
export async function listReturnEventsForOrder(
  _orderId: string,
): Promise<ReturnEvent[]> {
  // TODO: Query Firestore
  // const snapshot = await db
  //   .collection('returnEvents')
  //   .where('originalOrderId', '==', orderId)
  //   .orderBy('createdAt', 'desc')
  //   .get();
  // return snapshot.docs.map((doc) => doc.data() as ReturnEvent);

  // Mock for development
  return [];
}

/**
 * Void/cancel a return shipment.
 *
 * @param returnEventId - Return event ID
 * @returns Whether the void was successful
 */
export async function voidReturn(_returnEventId: string): Promise<boolean> {
  // TODO: Fetch return event
  // TODO: Void labels with carrier gateway
  // TODO: Update status in Firestore

  // Mock for development
  return true;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique return shipment ID.
 */
function generateReturnShipmentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ret-${timestamp}-${random}`;
}

/**
 * Generate a unique return event ID.
 */
function generateReturnEventId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `re-${timestamp}-${random}`;
}

/**
 * Generate a tracking number for a return box.
 *
 * @param carrier - Carrier for the return
 * @param boxIndex - Box index
 * @returns Tracking number
 */
function generateTrackingNumber(carrier: CarrierId, boxIndex: number): string {
  const prefix = getCarrierTrackingPrefix(carrier);
  const random = Math.floor(Math.random() * 1000000000)
    .toString()
    .padStart(9, '0');
  return `${prefix}${random}${boxIndex}`;
}

/**
 * Get tracking number prefix for a carrier.
 */
function getCarrierTrackingPrefix(carrier: CarrierId): string {
  switch (carrier) {
    case CarrierId.UPS:
      return '1Z';
    case CarrierId.FedEx:
      return '7946';
    case CarrierId.USPS:
      return '9400';
    case CarrierId.Shippo:
      return 'SH';
    case CarrierId.LTL:
      return 'LTL';
    default:
      return 'RT';
  }
}
