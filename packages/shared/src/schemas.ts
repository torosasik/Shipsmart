/**
 * Shared Firestore schema interfaces for the American Tile Depot Shipping Platform.
 * These types are used by both frontend and backend packages.
 *
 * Note: We use `any` for Timestamp to avoid requiring firebase-admin as a dependency
 * in the shared package. Consumers should cast to the appropriate Timestamp type.
 */

/**
 * Opaque type representing a Firestore Timestamp.
 * Consumers should cast this to `admin.firestore.Timestamp` or `firebase.firestore.Timestamp`
 * depending on their context.
 */
export type Timestamp = any;

// ============================================================================
// Enums
// ============================================================================

/** Status of an order in the system */
export enum OrderStatus {
  /** Order received, awaiting shipment */
  Pending = 'pending',
  /** Order has been shipped */
  Shipped = 'shipped',
  /** Order has been returned */
  Returned = 'returned',
  /** Order has been consolidated with others */
  Consolidated = 'consolidated',
}

/** Type of shipment */
export enum ShipmentType {
  /** Outbound shipment to customer */
  Outbound = 'outbound',
  /** Return shipment from customer */
  Return = 'return',
}

/** Status of a shipment */
export enum ShipmentStatus {
  /** Shipment record created */
  Created = 'created',
  /** Labels have been generated */
  LabelGenerated = 'label_generated',
  /** Package is in transit */
  InTransit = 'in_transit',
  /** Package has been delivered */
  Delivered = 'delivered',
}

/** Status of a return event */
export enum ReturnStatus {
  /** Return is pending */
  Pending = 'pending',
  /** Return labels have been generated */
  LabelsGenerated = 'labels_generated',
  /** Return is in transit */
  InTransit = 'in_transit',
  /** Return has been received */
  Received = 'received',
}

/** Supported carrier identifiers */
export enum CarrierId {
  /** United Parcel Service */
  UPS = 'ups',
  /** Federal Express */
  FedEx = 'fedex',
  /** United States Postal Service (via Pirate Ship) */
  USPS = 'usps',
  /** Shippo/ShipEngine multi-carrier */
  Shippo = 'shippo',
  /** Less-Than-Truckload freight */
  LTL = 'ltl',
  /** ShipStation multi-carrier platform */
  ShipStation = 'shipstation',
  /** Veeqo multi-carrier platform */
  Veeqo = 'veeqo',
}

/** Audit log action types */
export enum AuditAction {
  /** Rate shopping performed */
  RateShop = 'rate_shop',
  /** Shipping label generated */
  LabelGenerated = 'label_generated',
  /** Return shipment created */
  ReturnCreated = 'return_created',
  /** Orders consolidated */
  Consolidation = 'consolidation',
  /** Tracking information synced */
  TrackingSynced = 'tracking_synced',
}

// ============================================================================
// Core Address & Line Item Types
// ============================================================================

/** Physical address for shipping */
export interface Address {
  /** Recipient or sender name */
  name: string;
  /** Street address line 1 */
  street1: string;
  /** Street address line 2 (optional) */
  street2?: string;
  /** City */
  city: string;
  /** State/province code (e.g., 'CA') */
  state: string;
  /** ZIP/postal code */
  zip: string;
  /** Two-letter country code (e.g., 'US') */
  country: string;
  /** Phone number for delivery contact */
  phone?: string;
  /** Email for delivery notifications */
  email?: string;
}

/** A line item within an order */
export interface LineItem {
  /** Shopify line item ID */
  id: string;
  /** Product title */
  title: string;
  /** SKU or variant SKU */
  sku: string;
  /** Quantity ordered */
  quantity: number;
  /** Price per unit in USD */
  price: number;
  /** Weight per unit in lbs */
  weight: number;
  /** Variant ID from Shopify */
  variantId?: string;
  /** Product ID from Shopify */
  productId?: string;
}

// ============================================================================
// Order Schema
// ============================================================================

/**
 * Represents a Shopify order imported into the system.
 * Stored in the 'orders' Firestore collection.
 */
export interface Order {
  /** Firestore document ID (same as shopifyOrderId) */
  id: string;
  /** Original Shopify order ID */
  shopifyOrderId: string;
  /** Customer's full name */
  customerName: string;
  /** Customer's email address */
  customerEmail: string;
  /** Shipping destination address */
  shippingAddress: Address;
  /** Items in the order */
  lineItems: LineItem[];
  /** Total weight of all items in lbs */
  totalWeight: number;
  /** Number of boxes in the original shipment */
  boxCount: number;
  /** Current order status */
  status: OrderStatus;
  /** When the order was created in our system */
  createdAt: Timestamp;
  /** When the order was last updated */
  updatedAt: Timestamp;
  /** Last time the order was synced with Shopify */
  syncedAt: Timestamp;
}

// ============================================================================
// Shipment Schema
// ============================================================================

/** Reference to a label file stored in Firebase Storage */
export interface LabelRef {
  /** URL to the label file in Firebase Storage */
  url: string;
  /** Format of the label (e.g., 'PDF', 'PNG', 'ZPL') */
  format: string;
  /** Tracking number associated with this label */
  trackingNumber: string;
}

/** Details about a single box in a shipment */
export interface BoxDetail {
  /** Box length in inches */
  length: number;
  /** Box width in inches */
  width: number;
  /** Box height in inches */
  height: number;
  /** Actual weight in lbs */
  weight: number;
  /** Dimensional weight in lbs (calculated) */
  dimensionalWeight?: number;
  /** Billable weight in lbs (greater of actual vs dimensional) */
  billableWeight: number;
  /** Carrier-assigned package ID (if applicable) */
  packageId?: string;
}

/**
 * Represents a shipment (outbound or return).
 * Stored in the 'shipments' Firestore collection.
 */
export interface Shipment {
  /** Auto-generated Firestore document ID */
  id: string;
  /** Reference to the orders collection */
  orderId: string;
  /** Type of shipment */
  type: ShipmentType;
  /** Carrier used for this shipment */
  carrier: CarrierId;
  /** Service level (e.g., 'GROUND', '2DAY', 'PRIORITY') */
  serviceLevel: string;
  /** Tracking numbers for all packages in this shipment */
  trackingNumbers: string[];
  /** References to label files in Firebase Storage */
  labels: LabelRef[];
  /** Origin address */
  fromAddress: Address;
  /** Destination address */
  toAddress: Address;
  /** Box details for multi-box shipments */
  boxes: BoxDetail[];
  /** Total cost of the shipment in USD */
  totalCost: number;
  /** Currency code (e.g., 'USD') */
  currency: string;
  /** Current shipment status */
  status: ShipmentStatus;
  /** When the shipment was created */
  createdAt: Timestamp;
  /** When the shipment was picked up/shipped */
  shippedAt: Timestamp | null;
  /** When the shipment was delivered */
  deliveredAt: Timestamp | null;
  /** Whether tracking has been synced to Shopify */
  shopifySynced: boolean;
  /** When tracking was last synced to Shopify */
  shopifySyncedAt: Timestamp | null;
}

// ============================================================================
// Return Event Schema
// ============================================================================

/** Details about a single box in a return shipment */
export interface ReturnBoxDetail {
  /** Box length in inches */
  length: number;
  /** Box width in inches */
  width: number;
  /** Box height in inches */
  height: number;
  /** Actual weight in lbs */
  weight: number;
  /** Tracking number for this specific box */
  trackingNumber: string;
  /** RMA or return authorization number */
  rmaNumber?: string;
}

/** Details about return box labels */
export interface ReturnBoxLabel {
  /** Box index in the return */
  boxIndex: number;
  /** Tracking number for this box */
  trackingNumber: string;
  /** URL to the label file */
  labelUrl: string;
}

/**
 * Represents a return event for an order.
 * Stored in the 'returnEvents' Firestore collection.
 */
export interface ReturnEvent {
  /** Auto-generated Firestore document ID */
  id: string;
  /** Reference to the original order */
  originalOrderId: string;
  /** Reference to the original shipment */
  originalShipmentId: string;
  /** Reference to the return shipment record */
  returnShipmentId: string;
  /** Number of boxes being returned */
  boxCount: number;
  /** Details about each return box */
  boxes: ReturnBoxDetail[];
  /** Carrier handling the return */
  carrier: CarrierId;
  /** Total cost of the return shipment in USD */
  totalCost: number;
  /** Tracking numbers for all return boxes */
  trackingNumbers: string[];
  /** References to return label files */
  labels: LabelRef[];
  /** Current return status */
  status: ReturnStatus;
  /** When the return was created */
  createdAt: Timestamp;
  /** When the return was received at the warehouse */
  receivedAt: Timestamp | null;
  /** Additional notes about the return */
  notes: string;
}

// ============================================================================
// Rate Quote Schema
// ============================================================================

/** Details about a package for rate calculation */
export interface PackageDetail {
  /** Actual weight in lbs */
  weight: number;
  /** Length in inches */
  length: number;
  /** Width in inches */
  width: number;
  /** Height in inches */
  height: number;
  /** Declared value in USD */
  declaredValue: number;
}

/** Context information for a rate shopping session */
export interface ShipmentContext {
  /** Origin address */
  fromAddress: Address;
  /** Destination address */
  toAddress: Address;
  /** Package details for rate calculation */
  packages: PackageDetail[];
  /** Total weight in lbs */
  totalWeight: number;
  /** Declared value in USD */
  declaredValue: number;
}

/** A rate quote from a specific carrier */
export interface CarrierQuote {
  /** Carrier that provided this quote */
  carrier: CarrierId;
  /** Service level name (e.g., 'GROUND', '2DAY') */
  serviceLevel: string;
  /** Quoted rate in USD */
  rate: number;
  /** Currency code */
  currency: string;
  /** Estimated delivery days */
  estimatedDays: number;
  /** Calculated dimensional weight in lbs */
  dimensionalWeight: number;
  /** Billable weight used for pricing in lbs */
  billableWeight: number;
  /** Shipping zone (if applicable) */
  zone: number | null;
  /** Whether this is the cheapest option */
  isCheapest: boolean;
  /** Whether this is the fastest option */
  isFastest: boolean;
  /** Whether this is the best value option */
  isBestValue: boolean;
  /** Whether LTL freight is recommended */
  requiresLTL: boolean;
  /** Additional carrier-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Represents a rate shopping session result.
 * Stored in the 'rateQuotes' Firestore collection.
 */
export interface RateQuote {
  /** Auto-generated Firestore document ID */
  id: string;
  /** Context of the shipment being quoted */
  shipmentContext: ShipmentContext;
  /** All quotes received from carriers */
  quotes: CarrierQuote[];
  /** Carrier selected by the user */
  selectedCarrier: CarrierId | null;
  /** Index of the selected quote in the quotes array */
  selectedQuoteIndex: number | null;
  /** Cost delta vs the cheapest option */
  costDelta: number;
  /** When this rate quote was created */
  createdAt: Timestamp;
  /** Session ID to group related quotes */
  sessionId: string;
}

// ============================================================================
// Carrier Config Schema
// ============================================================================

/**
 * Configuration for a carrier in the system.
 * Stored in the 'carrierConfigs' Firestore collection.
 */
export interface CarrierConfig {
  /** Carrier ID (matches CarrierId enum) */
  id: CarrierId;
  /** Whether this carrier is enabled for rate shopping */
  enabled: boolean;
  /** Display name for the carrier */
  name: string;
  /** Display order in rate comparison UI */
  priority: number;
  /** Maximum weight this carrier can handle in lbs */
  weightLimit: number;
  /** Last time rates were successfully fetched */
  lastRateFetch: Timestamp | null;
  /** Number of consecutive errors */
  errorCount: number;
}

// ============================================================================
// Audit Log Schema
// ============================================================================

/**
 * Audit log entry for tracking system actions.
 * Stored in the 'auditLogs' Firestore collection.
 */
export interface AuditLog {
  /** Auto-generated Firestore document ID */
  id: string;
  /** Action that was performed */
  action: AuditAction;
  /** Firebase auth UID of the user who performed the action */
  userId: string;
  /** Related shipment ID (if applicable) */
  shipmentId: string | null;
  /** Related return event ID (if applicable) */
  returnEventId: string | null;
  /** Additional details about the action */
  details: Record<string, unknown>;
  /** When the action occurred */
  timestamp: Timestamp;
}

// ============================================================================
// Carrier Gateway Types
// ============================================================================

/**
 * Request payload for getting rate quotes from carriers.
 * Used by the CarrierGateway interface.
 */
export interface RateRequest {
  /** Origin address */
  fromAddress: Address;
  /** Destination address */
  toAddress: Address;
  /** Packages to ship */
  packages: PackageDetail[];
  /** Date of shipment */
  shipDate: Date;
  /** Optional filter for specific service levels */
  serviceLevels?: string[];
}

/** Request payload for generating a shipping label */
export interface LabelRequest {
  /** Origin address */
  fromAddress: Address;
  /** Destination address */
  toAddress: Address;
  /** Package details */
  packages: PackageDetail[];
  /** Carrier to use */
  carrier: CarrierId;
  /** Service level */
  serviceLevel: string;
  /** Reference number for the label */
  reference?: string;
}

/** Response from a carrier label generation request */
export interface LabelResponse {
  /** Tracking number for the shipment */
  trackingNumber: string;
  /** URL or base64 content of the label */
  labelUrl: string;
  /** Label format (PDF, PNG, ZPL) */
  labelFormat: string;
  /** Total cost charged */
  charge: number;
  /** Carrier-specific metadata */
  metadata?: Record<string, unknown>;
}

/** Tracking status information */
export interface TrackingStatus {
  /** Tracking number */
  trackingNumber: string;
  /** Current status (e.g., 'in_transit', 'delivered') */
  status: string;
  /** Estimated delivery date */
  estimatedDelivery: Date | null;
  /** Last tracking event timestamp */
  lastUpdate: Timestamp;
  /** Detailed tracking events */
  events: TrackingEvent[];
}

/** Individual tracking event */
export interface TrackingEvent {
  /** Event timestamp */
  timestamp: Timestamp;
  /** Event description */
  description: string;
  /** Location of the event */
  location: string;
  /** Event status code */
  statusCode: string;
}
