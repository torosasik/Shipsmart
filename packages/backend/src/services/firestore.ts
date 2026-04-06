/**
 * Firestore persistence service for the ShipSmart shipping platform.
 * Provides a unified interface for all database operations.
 */

import { getFirestore } from '../config/firebase';
import {
  Shipment,
  Order,
  ReturnEvent,
  AuditLog,
} from '@shipsmart/shared';

/**
 * Firestore persistence service.
 * Gracefully handles missing Firestore by logging warnings.
 */
export class FirestoreService {
  /**
   * Get a document by ID from a collection.
   */
  async getDocument<T>(collection: string, id: string): Promise<T | null> {
    const db = getFirestore();
    if (!db) {
      console.warn(`[Firestore] Cannot get document: Firestore not initialized`);
      return null;
    }

    try {
      const doc = await db.collection(collection).doc(id).get();
      if (!doc.exists) return null;
      return doc.data() as T;
    } catch (error) {
      console.error(`[Firestore] Error getting document ${collection}/${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a document in a collection.
   */
  async createDocument<T>(collection: string, id: string, data: T): Promise<void> {
    const db = getFirestore();
    if (!db) {
      console.warn(`[Firestore] Cannot create document: Firestore not initialized`);
      return;
    }

    try {
      await db.collection(collection).doc(id).set({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error(`[Firestore] Error creating document ${collection}/${id}:`, error);
      throw error;
    }
  }

  /**
   * Update a document in a collection.
   */
  async updateDocument<T>(collection: string, id: string, data: Partial<T>): Promise<void> {
    const db = getFirestore();
    if (!db) {
      console.warn(`[Firestore] Cannot update document: Firestore not initialized`);
      return;
    }

    try {
      await db.collection(collection).doc(id).update({
        ...data,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error(`[Firestore] Error updating document ${collection}/${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a document from a collection.
   */
  async deleteDocument(collection: string, id: string): Promise<void> {
    const db = getFirestore();
    if (!db) {
      console.warn(`[Firestore] Cannot delete document: Firestore not initialized`);
      return;
    }

    try {
      await db.collection(collection).doc(id).delete();
    } catch (error) {
      console.error(`[Firestore] Error deleting document ${collection}/${id}:`, error);
      throw error;
    }
  }

  /**
   * Query documents with filters and pagination.
   */
  async queryDocuments<T>(
    collection: string,
    filters: Array<{ field: string; op: FirebaseFirestore.WhereFilterOp; value: unknown }>,
    options: {
      orderBy?: { field: string; direction?: FirebaseFirestore.OrderByDirection };
      limit?: number;
      startAfter?: unknown;
    } = {},
  ): Promise<{ items: T[]; lastVisible: unknown | null }> {
    const db = getFirestore();
    if (!db) {
      console.warn(`[Firestore] Cannot query documents: Firestore not initialized`);
      return { items: [], lastVisible: null };
    }

    try {
      let query: FirebaseFirestore.Query = db.collection(collection);

      // Apply filters
      for (const filter of filters) {
        query = query.where(filter.field, filter.op, filter.value);
      }

      // Apply ordering
      if (options.orderBy) {
        query = query.orderBy(options.orderBy.field, options.orderBy.direction || 'desc');
      }

      // Apply cursor-based pagination
      if (options.startAfter) {
        query = query.startAfter(options.startAfter);
      }

      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const snapshot = await query.get();
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as T[];
      const lastVisible = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

      return { items, lastVisible };
    } catch (error) {
      console.error(`[Firestore] Error querying documents in ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Batch write multiple documents.
   */
  async batchWrite(
    collection: string,
    documents: Array<{ id: string; data: Record<string, unknown> }>,
  ): Promise<void> {
    const db = getFirestore();
    if (!db) {
      console.warn(`[Firestore] Cannot batch write: Firestore not initialized`);
      return;
    }

    try {
      const batch = db.batch();
      const now = new Date();

      for (const { id, data } of documents) {
        const docRef = db.collection(collection).doc(id);
        batch.set(docRef, {
          ...data,
          createdAt: data.createdAt || now,
          updatedAt: now,
        });
      }

      await batch.commit();
    } catch (error) {
      console.error(`[Firestore] Error in batch write to ${collection}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // Collection-Specific Methods
  // ============================================================================

  /** Save a shipment */
  async saveShipment(shipment: Shipment): Promise<void> {
    await this.createDocument('shipments', shipment.id, shipment as unknown as Record<string, unknown>);
  }

  /** Get a shipment by ID */
  async getShipment(id: string): Promise<Shipment | null> {
    return this.getDocument<Shipment>('shipments', id);
  }

  /** Update shipment status */
  async updateShipmentStatus(id: string, status: string): Promise<void> {
    await this.updateDocument('shipments', id, { status } as Partial<Record<string, unknown>>);
  }

  /** Save an order */
  async saveOrder(order: Order): Promise<void> {
    await this.createDocument('orders', order.id, order as unknown as Record<string, unknown>);
  }

  /** Get an order by ID */
  async getOrder(id: string): Promise<Order | null> {
    return this.getDocument<Order>('orders', id);
  }

  /** Save a return event */
  async saveReturnEvent(returnEvent: ReturnEvent): Promise<void> {
    await this.createDocument('returnEvents', returnEvent.id, returnEvent as unknown as Record<string, unknown>);
  }

  /** Get a return event by ID */
  async getReturnEvent(id: string): Promise<ReturnEvent | null> {
    return this.getDocument<ReturnEvent>('returnEvents', id);
  }

  /** Save an audit log */
  async saveAuditLog(auditLog: AuditLog): Promise<void> {
    await this.createDocument('auditLogs', auditLog.id, auditLog as unknown as Record<string, unknown>);
  }

  /** List shipments with pagination */
  async listShipments(options: {
    limit?: number;
    startAfter?: unknown;
    status?: string;
    orderId?: string;
  } = {}): Promise<{ items: Shipment[]; lastVisible: unknown | null }> {
    const filters: Array<{ field: string; op: FirebaseFirestore.WhereFilterOp; value: unknown }> = [];

    if (options.status) {
      filters.push({ field: 'status', op: '==', value: options.status });
    }
    if (options.orderId) {
      filters.push({ field: 'orderId', op: '==', value: options.orderId });
    }

    return this.queryDocuments<Shipment>('shipments', filters, {
      orderBy: { field: 'createdAt', direction: 'desc' },
      limit: options.limit || 20,
      startAfter: options.startAfter,
    });
  }

  /** Get a shipment by tracking number */
  async getShipmentByTrackingNumber(trackingNumber: string): Promise<Shipment | null> {
    const db = getFirestore();
    if (!db) {
      console.warn(`[Firestore] Cannot query: Firestore not initialized`);
      return null;
    }

    try {
      // Query shipments where trackingNumbers array contains the tracking number
      const snapshot = await db
        .collection('shipments')
        .where('trackingNumbers', 'array-contains', trackingNumber)
        .limit(1)
        .get();

      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Shipment;
    } catch (error) {
      console.error(`[Firestore] Error querying shipment by tracking number:`, error);
      throw error;
    }
  }

  /** List orders with pagination */
  async listOrders(options: {
    limit?: number;
    startAfter?: unknown;
    status?: string;
  } = {}): Promise<{ items: Order[]; lastVisible: unknown | null }> {
    const filters: Array<{ field: string; op: FirebaseFirestore.WhereFilterOp; value: unknown }> = [];

    if (options.status) {
      filters.push({ field: 'status', op: '==', value: options.status });
    }

    return this.queryDocuments<Order>('orders', filters, {
      orderBy: { field: 'createdAt', direction: 'desc' },
      limit: options.limit || 20,
      startAfter: options.startAfter,
    });
  }

  /** List return events for an order */
  async listReturnEventsForOrder(orderId: string): Promise<ReturnEvent[]> {
    const { items } = await this.queryDocuments<ReturnEvent>('returnEvents', [
      { field: 'originalOrderId', op: '==', value: orderId },
    ], {
      orderBy: { field: 'createdAt', direction: 'desc' },
      limit: 100,
    });
    return items;
  }

  /** Query audit logs with filters */
  async queryAuditLogs(options: {
    action?: string;
    userId?: string;
    shipmentId?: string;
    returnEventId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    startAfter?: unknown;
  } = {}): Promise<{ items: AuditLog[]; lastVisible: unknown | null }> {
    const filters: Array<{ field: string; op: FirebaseFirestore.WhereFilterOp; value: unknown }> = [];

    if (options.action) {
      filters.push({ field: 'action', op: '==', value: options.action });
    }
    if (options.userId) {
      filters.push({ field: 'userId', op: '==', value: options.userId });
    }
    if (options.shipmentId) {
      filters.push({ field: 'shipmentId', op: '==', value: options.shipmentId });
    }
    if (options.returnEventId) {
      filters.push({ field: 'returnEventId', op: '==', value: options.returnEventId });
    }
    if (options.startDate) {
      filters.push({ field: 'timestamp', op: '>=', value: options.startDate });
    }
    if (options.endDate) {
      filters.push({ field: 'timestamp', op: '<=', value: options.endDate });
    }

    return this.queryDocuments<AuditLog>('auditLogs', filters, {
      orderBy: { field: 'timestamp', direction: 'desc' },
      limit: options.limit || 50,
      startAfter: options.startAfter,
    });
  }
}

/** Singleton instance */
export const firestoreService = new FirestoreService();
