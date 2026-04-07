/**
 * Label generation service for the ShipSmart shipping platform.
 * Handles creating, voiding, and managing shipping labels across carriers.
 */

import {
  CarrierId,
  LabelRequest,
  LabelResponse,
  LabelRef,
  Shipment,
  ShipmentStatus,
  ShipmentType,
  Timestamp,
  PackageDetail,
  BoxDetail,
} from '@shipsmart/shared';
import { carrierRegistry } from './carriers';
import { logLabelGenerated } from './audit';
import { firestoreService } from './firestore';

// ============================================================================
// Types
// ============================================================================

/** Request to generate a label */
export interface GenerateLabelRequest {
  /** Carrier to use */
  carrier: CarrierId;
  /** Service level */
  serviceLevel: string;
  /** Origin address */
  fromAddress: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone?: string;
    email?: string;
  };
  /** Destination address */
  toAddress: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone?: string;
    email?: string;
  };
  /** Packages to ship */
  packages: PackageDetail[];
  /** Reference number */
  reference?: string;
  /** User ID for audit logging */
  userId: string;
  /** Related order ID */
  orderId?: string;
}

/** Response from label generation */
export interface GenerateLabelResponse {
  /** Generated label details */
  label: LabelResponse;
  /** Shipment record */
  shipment: Shipment;
  /** Label references for storage */
  labelRefs: LabelRef[];
}

/** Void label request */
export interface VoidLabelRequest {
  /** Tracking number to void */
  trackingNumber: string;
  /** Carrier that issued the label */
  carrier: CarrierId;
  /** User ID for audit logging */
  userId: string;
}

// ============================================================================
// Label Service
// ============================================================================

/**
 * Generate a shipping label.
 *
 * @param request - Label generation request
 * @returns Generated label and shipment record
 */
export async function generateLabel(
  request: GenerateLabelRequest,
): Promise<GenerateLabelResponse> {
  // Get carrier gateway
  const carrier = carrierRegistry[request.carrier];
  if (!carrier) {
    throw new Error(`Carrier not found: ${request.carrier}`);
  }

  if (!carrier.enabled) {
    throw new Error(`Carrier ${carrier.name} is not enabled`);
  }

  // Build label request for carrier
  const carrierLabelRequest: LabelRequest = {
    fromAddress: request.fromAddress,
    toAddress: request.toAddress,
    packages: request.packages,
    carrier: request.carrier,
    serviceLevel: request.serviceLevel,
    reference: request.reference,
  };

  // Generate label through carrier
  const labelResponse = await carrier.createLabel(carrierLabelRequest);

  // Build label references
  const labelRefs: LabelRef[] = [
    {
      url: labelResponse.labelUrl,
      format: labelResponse.labelFormat,
      trackingNumber: labelResponse.trackingNumber,
    },
  ];

  // Calculate box details
  const boxes: BoxDetail[] = request.packages.map((pkg) => {
    const dimWeight = carrier.calcDimensionalWeight(
      pkg.length,
      pkg.width,
      pkg.height,
    );
    const billableWeight = Math.max(pkg.weight, dimWeight);

    return {
      length: pkg.length,
      width: pkg.width,
      height: pkg.height,
      weight: pkg.weight,
      dimensionalWeight: dimWeight,
      billableWeight,
    };
  });

  // Build shipment record
  const now = new Date() as unknown as Timestamp;
  const shipment: Shipment = {
    id: generateShipmentId(),
    orderId: request.orderId || '',
    type: ShipmentType.Outbound,
    carrier: request.carrier,
    serviceLevel: request.serviceLevel,
    trackingNumbers: [labelResponse.trackingNumber],
    labels: labelRefs,
    fromAddress: request.fromAddress,
    toAddress: request.toAddress,
    boxes,
    totalCost: labelResponse.charge,
    currency: 'USD',
    status: ShipmentStatus.LabelGenerated,
    createdAt: now,
    shippedAt: null,
    deliveredAt: null,
    shopifySynced: false,
    shopifySyncedAt: null,
  };

  // Save shipment to Firestore
  await firestoreService.saveShipment(shipment);

  // Log audit event
  await logLabelGenerated(request.userId, shipment.id, {
    carrier: request.carrier,
    serviceLevel: request.serviceLevel,
    cost: labelResponse.charge,
    trackingNumber: labelResponse.trackingNumber,
  });

  return {
    label: labelResponse,
    shipment,
    labelRefs,
  };
}

/**
 * Generate labels for multiple packages.
 *
 * @param request - Label generation request
 * @returns Array of generated labels
 */
export async function generateMultipleLabels(
  request: GenerateLabelRequest,
): Promise<GenerateLabelResponse[]> {
  const results: GenerateLabelResponse[] = [];

  for (let i = 0; i < request.packages.length; i++) {
    const pkg = request.packages[i];
    const singlePackageRequest: GenerateLabelRequest = {
      ...request,
      packages: [pkg],
      reference: request.reference
        ? `${request.reference}-${i + 1}`
        : undefined,
    };

    const result = await generateLabel(singlePackageRequest);
    results.push(result);
  }

  return results;
}

/**
 * Void a shipping label.
 *
 * @param request - Void label request
 * @returns Whether the void was successful
 */
export async function voidLabel(request: VoidLabelRequest): Promise<boolean> {
  const carrier = carrierRegistry[request.carrier];
  if (!carrier) {
    throw new Error(`Carrier not found: ${request.carrier}`);
  }

  const success = await carrier.voidLabel(request.trackingNumber);

  if (success) {
    // TODO: Update shipment status in Firestore
    // await db.collection('shipments')
    //   .where('trackingNumbers', 'array-contains', request.trackingNumber)
    //   .get()
    //   .then(snapshot => {
    //     snapshot.docs.forEach(doc => {
    //       doc.ref.update({ status: 'voided' });
    //     });
    //   });
  }

  return success;
}

/**
 * Get a label by tracking number.
 *
 * @param trackingNumber - Tracking number
 * @returns Label reference or null
 */
export async function getLabelByTrackingNumber(
  trackingNumber: string,
): Promise<LabelRef | null> {
  // Query Firestore for shipment with this tracking number
  const shipment = await firestoreService.getShipmentByTrackingNumber(trackingNumber);
  
  if (!shipment) return null;

  return shipment.labels.find(
    (l) => l.trackingNumber === trackingNumber,
  ) || null;
}

/**
 * Get labels for a shipment.
 *
 * @param shipmentId - Shipment ID
 * @returns Array of label references
 */
export async function getLabelsForShipment(
  _shipmentId: string,
): Promise<LabelRef[]> {
  // TODO: Query Firestore
  // const doc = await db.collection('shipments').doc(shipmentId).get();
  // if (!doc.exists) return [];
  //
  // const shipment = doc.data() as Shipment;
  // return shipment.labels;

  return [];
}

/**
 * Reprint a label.
 *
 * @param trackingNumber - Tracking number
 * @returns Label URL or null
 */
export async function reprintLabel(
  trackingNumber: string,
): Promise<string | null> {
  const labelRef = await getLabelByTrackingNumber(trackingNumber);
  return labelRef?.url || null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique shipment ID.
 */
function generateShipmentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `shp-${timestamp}-${random}`;
}

/**
 * Validate label request has required fields.
 */
export function validateLabelRequest(request: GenerateLabelRequest): void {
  if (!request.carrier) {
    throw new Error('Missing carrier');
  }
  if (!request.serviceLevel) {
    throw new Error('Missing service level');
  }
  if (!request.fromAddress) {
    throw new Error('Missing from address');
  }
  if (!request.toAddress) {
    throw new Error('Missing to address');
  }
  if (!request.packages || request.packages.length === 0) {
    throw new Error('Missing packages');
  }
  if (!request.userId) {
    throw new Error('Missing user ID for audit logging');
  }

  // Validate addresses
  validateAddress(request.fromAddress, 'fromAddress');
  validateAddress(request.toAddress, 'toAddress');

  // Validate packages
  for (let i = 0; i < request.packages.length; i++) {
    const pkg = request.packages[i];
    validatePackageData(pkg, i);
  }
}

/**
 * Validate an address.
 */
function validateAddress(
  address: Record<string, unknown>,
  fieldName: string,
): void {
  const requiredFields = ['name', 'street1', 'city', 'state', 'zip', 'country'];

  for (const field of requiredFields) {
    if (!address[field]) {
      throw new Error(`Missing ${fieldName}.${field}`);
    }
  }
}

/**
 * Validate a package.
 */
function validatePackageData(
  pkg: PackageDetail,
  index: number,
): void {
  if (!pkg.weight || pkg.weight < 0) {
    throw new Error(`Package ${index + 1}: Invalid weight`);
  }
  if (!pkg.length || pkg.length < 0) {
    throw new Error(`Package ${index + 1}: Invalid length`);
  }
  if (!pkg.width || pkg.width < 0) {
    throw new Error(`Package ${index + 1}: Invalid width`);
  }
  if (!pkg.height || pkg.height < 0) {
    throw new Error(`Package ${index + 1}: Invalid height`);
  }
  if (!pkg.declaredValue || pkg.declaredValue < 0) {
    throw new Error(`Package ${index + 1}: Invalid declaredValue`);
  }
}
