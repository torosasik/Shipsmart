/**
 * Shopify API integration service for the ShipSmart shipping platform.
 * Handles order sync, fulfillment updates, and shipping notifications.
 */

import axios, { AxiosInstance } from 'axios';

/** Shopify API configuration */
interface ShopifyConfig {
  /** Shopify store domain (e.g., my-store.myshopify.com) */
  storeDomain: string;
  /** Shopify Admin API access token */
  accessToken: string;
  /** API version (e.g., 2024-01) */
  apiVersion: string;
}

/** Shopify order data */
interface ShopifyOrder {
  id: number;
  order_number: number;
  name: string;
  email: string;
  customer?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  shipping_address?: {
    first_name: string;
    last_name: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    zip: string;
    country: string;
    phone?: string;
  };
  line_items?: Array<{
    id: number;
    product_id: number;
    variant_id: number;
    title: string;
    variant_title: string;
    quantity: number;
    price: string;
    sku: string;
    grams: number;
  }>;
  fulfillments?: Array<{
    id: number;
    status: string;
    tracking_number?: string;
    tracking_urls?: string[];
  }>;
  created_at: string;
  updated_at: string;
}

/** Shopify fulfillment update payload */
interface ShopifyFulfillmentPayload {
  orderId: string;
  trackingNumber: string;
  trackingUrl?: string;
  carrier: string;
  notifyCustomer?: boolean;
}

/**
 * Shopify API service.
 */
export class ShopifyService {
  private config: ShopifyConfig;
  private client: AxiosInstance;

  constructor(config?: Partial<ShopifyConfig>) {
    this.config = {
      storeDomain: process.env.SHOPIFY_STORE_DOMAIN || '',
      accessToken: process.env.SHOPIFY_ACCESS_TOKEN || '',
      apiVersion: process.env.SHOPIFY_API_VERSION || '2024-01',
      ...config,
    };

    this.client = axios.create({
      baseURL: `https://${this.config.storeDomain}/admin/api/${this.config.apiVersion}`,
      headers: {
        'X-Shopify-Access-Token': this.config.accessToken,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Check if Shopify is configured.
   */
  isConfigured(): boolean {
    return !!(this.config.storeDomain && this.config.accessToken);
  }

  /**
   * Static factory method to create a ShopifyService instance from Firestore settings.
   * Falls back to environment variables if Firestore settings are not configured.
   */
  static async fromFirestore(): Promise<ShopifyService> {
    const { getShopifySettings } = await import('./shopify-settings');
    const settings = await getShopifySettings();

    // Use Firestore settings if available, otherwise fall back to env vars
    const config: Partial<ShopifyConfig> = settings ? {
      storeDomain: settings.storeDomain,
      accessToken: settings.accessToken,
      apiVersion: settings.apiVersion,
    } : {
      storeDomain: process.env.SHOPIFY_STORE_DOMAIN || '',
      accessToken: process.env.SHOPIFY_ACCESS_TOKEN || '',
      apiVersion: process.env.SHOPIFY_API_VERSION || '2024-01',
    };

    return new ShopifyService(config);
  }

  /**
   * Fetch orders from Shopify since a given date.
   */
  async getOrdersSince(sinceDate: Date, limit: number = 50): Promise<ShopifyOrder[]> {
    if (!this.isConfigured()) {
      console.warn('[Shopify] Not configured, returning empty array');
      return [];
    }

    try {
      const response = await this.client.get('/orders.json', {
        params: {
          created_at_min: sinceDate.toISOString(),
          limit,
          status: 'any',
          fulfillment_status: 'unfulfilled',
        },
      });

      return response.data.orders || [];
    } catch (error) {
      console.error('[Shopify] Error fetching orders:', error);
      throw error;
    }
  }

  /**
   * Get a single order by ID.
   */
  async getOrder(orderId: string): Promise<ShopifyOrder | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const response = await this.client.get(`/orders/${orderId}.json`);
      return response.data.order || null;
    } catch (error) {
      console.error(`[Shopify] Error fetching order ${orderId}:`, error);
      return null;
    }
  }

  /**
   * Update fulfillment with tracking information.
   */
  async updateFulfillment(payload: ShopifyFulfillmentPayload): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('[Shopify] Not configured, skipping fulfillment update');
      return false;
    }

    try {
      // First, get the fulfillment ID for this order
      const order = await this.getOrder(payload.orderId);
      if (!order) {
        console.warn(`[Shopify] Order ${payload.orderId} not found`);
        return false;
      }

      const fulfillments = order.fulfillments || [];
      if (fulfillments.length === 0) {
        // Create a new fulfillment
        return this.createFulfillment(payload);
      }

      // Update existing fulfillment
      const fulfillmentId = fulfillments[0].id;
      await this.client.post(`/fulfillments/${fulfillmentId}/update_tracking.json`, {
        fulfillment: {
          tracking_info: {
            number: payload.trackingNumber,
            url: payload.trackingUrl,
            company: payload.carrier,
          },
          notify_customer: payload.notifyCustomer ?? true,
        },
      });

      console.log(`[Shopify] Updated fulfillment for order ${payload.orderId}`);
      return true;
    } catch (error) {
      console.error(`[Shopify] Error updating fulfillment for order ${payload.orderId}:`, error);
      return false;
    }
  }

  /**
   * Create a new fulfillment for an order.
   */
  private async createFulfillment(payload: ShopifyFulfillmentPayload): Promise<boolean> {
    try {
      await this.client.post(`/orders/${payload.orderId}/fulfillments.json`, {
        fulfillment: {
          tracking_number: payload.trackingNumber,
          tracking_urls: payload.trackingUrl ? [payload.trackingUrl] : [],
          notify_customer: payload.notifyCustomer ?? true,
        },
      });

      console.log(`[Shopify] Created fulfillment for order ${payload.orderId}`);
      return true;
    } catch (error) {
      console.error(`[Shopify] Error creating fulfillment for order ${payload.orderId}:`, error);
      return false;
    }
  }

  /**
   * Send a shipping notification to the customer.
   */
  async sendShippingNotification(orderId: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      await this.client.post(`/orders/${orderId}/fulfillment_orders.json`);
      return true;
    } catch (error) {
      console.error(`[Shopify] Error sending notification for order ${orderId}:`, error);
      return false;
    }
  }

  /**
   * Transform Shopify order to internal Order format.
   */
  transformOrder(shopifyOrder: ShopifyOrder): Record<string, unknown> {
    return {
      id: shopifyOrder.id.toString(),
      shopifyOrderId: shopifyOrder.id.toString(),
      customerName: shopifyOrder.customer
        ? `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name}`
        : shopifyOrder.name,
      customerEmail: shopifyOrder.email || shopifyOrder.customer?.email || '',
      shippingAddress: shopifyOrder.shipping_address
        ? {
            name: `${shopifyOrder.shipping_address.first_name} ${shopifyOrder.shipping_address.last_name}`,
            street1: shopifyOrder.shipping_address.address1,
            street2: shopifyOrder.shipping_address.address2,
            city: shopifyOrder.shipping_address.city,
            state: shopifyOrder.shipping_address.province,
            zip: shopifyOrder.shipping_address.zip,
            country: shopifyOrder.shipping_address.country,
            phone: shopifyOrder.shipping_address.phone,
          }
        : {},
      lineItems: (shopifyOrder.line_items || []).map((item) => ({
        id: item.id.toString(),
        title: item.title,
        sku: item.sku,
        quantity: item.quantity,
        price: parseFloat(item.price),
        weight: item.grams / 453.592, // Convert grams to lbs
        variantId: item.variant_id.toString(),
        productId: item.product_id.toString(),
      })),
      totalWeight: (shopifyOrder.line_items || []).reduce(
        (sum, item) => sum + item.grams / 453.592,
        0,
      ),
      boxCount: 1,
      status: 'pending',
      createdAt: new Date(shopifyOrder.created_at),
      updatedAt: new Date(shopifyOrder.updated_at),
      syncedAt: new Date(),
    };
  }
}

/** Singleton instance */
export const shopifyService = new ShopifyService();
