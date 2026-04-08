/**
 * Shopify Settings Service for the ShipSmart shipping platform.
 * Manages Shopify API credentials and configuration stored in Firestore.
 */

import { FirestoreService } from './firestore';

// ============================================================================
// Types
// ============================================================================

/**
 * Shopify settings stored in Firestore.
 * WARNING: For production, credentials should be encrypted at rest using a KMS
 * (e.g., Google Cloud KMS) before storing in Firestore. This service stores
 * credentials as-is - encryption/decryption must be handled at the application
 * layer or through Firestore Security Rules + FieldValue transforms.
 */
export interface ShopifySettings {
  /** Shopify store domain (e.g., my-store.myshopify.com) */
  storeDomain: string;
  /** Shopify Admin API access token */
  accessToken: string;
  /** Shopify webhook shared secret for HMAC verification */
  webhookSecret: string;
  /** API version (e.g., 2024-01) */
  apiVersion: string;
  /** Whether Shopify integration is active */
  enabled: boolean;
  /** Last successful sync timestamp */
  lastSyncAt?: Date;
  /** Whether webhooks have been registered */
  webhookRegistered?: boolean;
  /** When the credentials were last updated */
  updatedAt?: Date;
  /** When the credentials were created */
  createdAt?: Date;
}

/** Shopify settings info for the UI */
export interface ShopifySettingsInfo {
  /** Whether this integration is currently enabled */
  enabled: boolean;
  /** Whether credentials are configured (non-empty) */
  configured: boolean;
  /** Whether webhooks are registered */
  webhookRegistered: boolean;
  /** Last sync timestamp */
  lastSyncAt?: Date;
  /** API version */
  apiVersion: string;
}

// ============================================================================
// Firestore Document Path
// ============================================================================

const DOCUMENT_PATH = 'settings/shopify';

// ============================================================================
// Service
// ============================================================================

const firestoreService = new FirestoreService();

/**
 * Get Shopify settings from Firestore.
 */
export async function getShopifySettings(): Promise<ShopifySettings | null> {
  return firestoreService.getDocument<ShopifySettings>(DOCUMENT_PATH, 'shopify');
}

/**
 * Save Shopify settings to Firestore.
 */
export async function saveShopifySettings(settings: Partial<ShopifySettings>): Promise<void> {
  const existing = await getShopifySettings();

  const payload: ShopifySettings = {
    storeDomain: settings.storeDomain ?? existing?.storeDomain ?? '',
    accessToken: settings.accessToken ?? existing?.accessToken ?? '',
    webhookSecret: settings.webhookSecret ?? existing?.webhookSecret ?? '',
    apiVersion: settings.apiVersion ?? existing?.apiVersion ?? '2024-01',
    enabled: settings.enabled ?? existing?.enabled ?? false,
    lastSyncAt: settings.lastSyncAt ?? existing?.lastSyncAt,
    webhookRegistered: settings.webhookRegistered ?? existing?.webhookRegistered ?? false,
    updatedAt: new Date(),
    createdAt: existing?.createdAt ?? new Date(),
  };

  if (existing) {
    await firestoreService.updateDocument(DOCUMENT_PATH, 'shopify', payload);
  } else {
    await firestoreService.createDocument(DOCUMENT_PATH, 'shopify', payload);
  }
}

/**
 * Get Shopify settings info for the UI (with masked credentials).
 */
export async function getShopifySettingsInfo(): Promise<ShopifySettingsInfo> {
  const settings = await getShopifySettings();

  return {
    enabled: settings?.enabled ?? false,
    configured: settings ? !!(settings.storeDomain && settings.accessToken) : false,
    webhookRegistered: settings?.webhookRegistered ?? false,
    lastSyncAt: settings?.lastSyncAt,
    apiVersion: settings?.apiVersion ?? '2024-01',
  };
}

/**
 * Get masked Shopify settings for display in the UI.
 * Access token and webhook secret are masked.
 */
export async function getMaskedShopifySettings(): Promise<Record<string, string>> {
  const settings = await getShopifySettings();

  if (!settings) {
    return {
      storeDomain: '',
      accessToken: '',
      webhookSecret: '',
      apiVersion: '2024-01',
    };
  }

  return {
    storeDomain: settings.storeDomain,
    accessToken: maskCredentialValue(settings.accessToken),
    webhookSecret: maskCredentialValue(settings.webhookSecret),
    apiVersion: settings.apiVersion,
  };
}

/**
 * Test Shopify connection with stored credentials.
 */
export async function testShopifyConnection(): Promise<{ success: boolean; message: string }> {
  const settings = await getShopifySettings();

  if (!settings || !settings.storeDomain || !settings.accessToken) {
    return { success: false, message: 'Missing required credentials. Please save credentials first.' };
  }

  try {
    // Use the ShopifyService to test the connection
    const { ShopifyService } = await import('./shopify');
    const shopifyService = new ShopifyService({
      storeDomain: settings.storeDomain,
      accessToken: settings.accessToken,
      apiVersion: settings.apiVersion,
    });

    // Try to fetch shop info as a connectivity test
    const response = await shopifyService['client'].get('/shop.json');
    const shopName = response.data.shop?.name;

    return {
      success: true,
      message: `Successfully connected to ${shopName || 'Shopify store'}`,
    };
  } catch (error: any) {
    console.error('[ShopifySettings] Connection test failed:', error);
    return {
      success: false,
      message: `Connection failed: ${error.response?.data?.errors || error.message || 'Unknown error'}`,
    };
  }
}

/**
 * Update the last sync timestamp.
 */
export async function updateLastSyncTimestamp(): Promise<void> {
  const existing = await getShopifySettings();
  if (existing) {
    await firestoreService.updateDocument(DOCUMENT_PATH, 'shopify', {
      lastSyncAt: new Date(),
    });
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Mask secret credential values for safe display.
 * Shows only the last 4 characters.
 */
function maskCredentialValue(value: string): string {
  if (!value || value.length <= 4) return '••••';
  return '••••' + value.slice(-4);
}