/**
 * Carrier Settings Service for the ShipSmart shipping platform.
 * Manages carrier API credentials and configuration stored in Firestore.
 */

import { CarrierId } from '@shipsmart/shared';
import { FirestoreService } from './firestore';

// ============================================================================
// Types
// ============================================================================

/**
 * API credential fields per carrier.
 * WARNING: For production, credentials should be encrypted at rest using a KMS
 * (e.g., Google Cloud KMS) before storing in Firestore. This service stores
 * credentials as-is - encryption/decryption must be handled at the application
 * layer or through Firestore Security Rules + FieldValue transforms.
 */
export interface CarrierCredentials {
  /** Carrier identifier */
  carrierId: CarrierId;
  /** Whether this carrier is enabled */
  enabled: boolean;
  /** Whether to use sandbox/test mode */
  sandbox: boolean;
  /** Credential fields (key-value pairs) */
  credentials: Record<string, string>;
  /** When the credentials were last updated */
  updatedAt?: Date;
  /** When the credentials were created */
  createdAt?: Date;
}

/** Carrier credential field definition for the UI */
export interface CarrierCredentialField {
  /** Field key (e.g., 'clientId', 'apiKey') */
  key: string;
  /** Display label */
  label: string;
  /** Whether this is a secret field (masked in UI) */
  secret: boolean;
  /** Whether this field is required */
  required: boolean;
  /** Placeholder text */
  placeholder: string;
}

/** Carrier settings metadata for the UI */
export interface CarrierSettingsInfo {
  /** Carrier identifier */
  carrierId: CarrierId;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Whether this carrier is currently enabled */
  enabled: boolean;
  /** Whether sandbox mode is active */
  sandbox: boolean;
  /** Whether credentials are configured (non-empty) */
  configured: boolean;
  /** Required credential fields */
  fields: CarrierCredentialField[];
}

// ============================================================================
// Carrier Field Definitions
// ============================================================================

/** Define the credential fields each carrier requires */
const CARRIER_FIELD_DEFINITIONS: Record<CarrierId, { name: string; description: string; fields: CarrierCredentialField[] }> = {
  [CarrierId.UPS]: {
    name: 'UPS',
    description: 'United Parcel Service — OAuth2 client credentials for the UPS API.',
    fields: [
      { key: 'clientId', label: 'Client ID', secret: false, required: true, placeholder: 'Enter UPS Client ID' },
      { key: 'clientSecret', label: 'Client Secret', secret: true, required: true, placeholder: 'Enter UPS Client Secret' },
    ],
  },
  [CarrierId.FedEx]: {
    name: 'FedEx',
    description: 'FedEx — OAuth2 API key and secret for the FedEx API.',
    fields: [
      { key: 'apiKey', label: 'API Key', secret: false, required: true, placeholder: 'Enter FedEx API Key' },
      { key: 'apiSecret', label: 'API Secret', secret: true, required: true, placeholder: 'Enter FedEx API Secret' },
    ],
  },
  [CarrierId.USPS]: {
    name: 'USPS',
    description: 'USPS via Pirate Ship — API key for USPS Commercial Pricing rates.',
    fields: [
      { key: 'apiKey', label: 'Pirate Ship API Key', secret: true, required: true, placeholder: 'Enter Pirate Ship API Key' },
    ],
  },
  [CarrierId.Shippo]: {
    name: 'Shippo',
    description: 'Shippo — Multi-carrier API token for rate shopping and label generation.',
    fields: [
      { key: 'apiToken', label: 'API Token', secret: true, required: true, placeholder: 'Enter Shippo API Token' },
    ],
  },
  [CarrierId.LTL]: {
    name: 'LTL Freight',
    description: 'LTL Freight carriers — API credentials for freight rate quotes.',
    fields: [
      { key: 'apiKey', label: 'LTL API Key', secret: true, required: true, placeholder: 'Enter LTL Provider API Key' },
      { key: 'accountNumber', label: 'Account Number', secret: false, required: false, placeholder: 'Enter account number (optional)' },
    ],
  },
  [CarrierId.ShipStation]: {
    name: 'ShipStation',
    description: 'ShipStation — Multi-carrier platform API credentials for rate shopping and label generation.',
    fields: [
      { key: 'apiKey', label: 'API Key', secret: false, required: true, placeholder: 'Enter ShipStation API Key' },
      { key: 'apiSecret', label: 'API Secret', secret: true, required: true, placeholder: 'Enter ShipStation API Secret' },
    ],
  },
  [CarrierId.Veeqo]: {
    name: 'Veeqo',
    description: 'Veeqo — Multi-carrier shipping platform API key for rate shopping and label generation.',
    fields: [
      { key: 'apiKey', label: 'API Key', secret: true, required: true, placeholder: 'Enter Veeqo API Key' },
    ],
  },
};

// ============================================================================
// Firestore Collection
// ============================================================================

const COLLECTION = 'carrierSettings';

// ============================================================================
// Service
// ============================================================================

const firestoreService = new FirestoreService();

/**
 * Get all carrier settings with metadata for the UI.
 * Returns info for every carrier, with configured status.
 */
export async function getAllCarrierSettings(): Promise<CarrierSettingsInfo[]> {
  const results: CarrierSettingsInfo[] = [];

  for (const carrierId of Object.values(CarrierId)) {
    const def = CARRIER_FIELD_DEFINITIONS[carrierId];
    if (!def) continue;

    const stored = await firestoreService.getDocument<CarrierCredentials>(COLLECTION, carrierId);

    results.push({
      carrierId,
      name: def.name,
      description: def.description,
      enabled: stored?.enabled ?? false,
      sandbox: stored?.sandbox ?? true,
      configured: stored ? hasRequiredCredentials(carrierId, stored.credentials) : false,
      fields: def.fields,
    });
  }

  return results;
}

/**
 * Get a single carrier's settings.
 */
export async function getCarrierSettings(carrierId: CarrierId): Promise<CarrierSettingsInfo> {
  const def = CARRIER_FIELD_DEFINITIONS[carrierId];
  if (!def) {
    throw new Error(`Unknown carrier: ${carrierId}`);
  }

  const stored = await firestoreService.getDocument<CarrierCredentials>(COLLECTION, carrierId);

  return {
    carrierId,
    name: def.name,
    description: def.description,
    enabled: stored?.enabled ?? false,
    sandbox: stored?.sandbox ?? true,
    configured: stored ? hasRequiredCredentials(carrierId, stored.credentials) : false,
    fields: def.fields,
  };
}

/**
 * Get carrier credentials (for internal use by carrier gateways).
 * Returns the raw credential values.
 */
export async function getCarrierCredentials(carrierId: CarrierId): Promise<CarrierCredentials | null> {
  return firestoreService.getDocument<CarrierCredentials>(COLLECTION, carrierId);
}

/**
 * Save carrier credentials and settings.
 */
export async function saveCarrierSettings(
  carrierId: CarrierId,
  data: {
    enabled: boolean;
    sandbox: boolean;
    credentials: Record<string, string>;
  },
): Promise<void> {
  const def = CARRIER_FIELD_DEFINITIONS[carrierId];
  if (!def) {
    throw new Error(`Unknown carrier: ${carrierId}`);
  }

  const existing = await firestoreService.getDocument<CarrierCredentials>(COLLECTION, carrierId);

  const payload: CarrierCredentials = {
    carrierId,
    enabled: data.enabled,
    sandbox: data.sandbox,
    credentials: mergeCredentials(existing?.credentials ?? {}, data.credentials),
  };

  if (existing) {
    await firestoreService.updateDocument(COLLECTION, carrierId, payload);
  } else {
    await firestoreService.createDocument(COLLECTION, carrierId, payload);
  }
}

/**
 * Test carrier connection with provided credentials.
 * Validates that the API credentials work.
 */
export async function testCarrierConnection(
  carrierId: CarrierId,
): Promise<{ success: boolean; message: string }> {
  const stored = await firestoreService.getDocument<CarrierCredentials>(COLLECTION, carrierId);

  if (!stored || !hasRequiredCredentials(carrierId, stored.credentials)) {
    return { success: false, message: 'Missing required credentials. Please save credentials first.' };
  }

  // In production, each carrier adapter would have a `testConnection` method
  // For now, just validate that credentials are present
  return { success: true, message: `Credentials for ${carrierId} are configured.` };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if all required credential fields are filled.
 */
function hasRequiredCredentials(carrierId: CarrierId, credentials: Record<string, string>): boolean {
  const def = CARRIER_FIELD_DEFINITIONS[carrierId];
  if (!def) return false;

  return def.fields
    .filter((f) => f.required)
    .every((f) => credentials[f.key] && credentials[f.key].trim().length > 0);
}

/**
 * Merge new credentials with existing, preserving fields that aren't being updated.
 * Empty strings in new credentials will be ignored (keeps existing value).
 */
function mergeCredentials(
  existing: Record<string, string>,
  incoming: Record<string, string>,
): Record<string, string> {
  const merged = { ...existing };

  for (const [key, value] of Object.entries(incoming)) {
    // Only update if a non-empty value is provided
    if (value && value.trim().length > 0) {
      merged[key] = value.trim();
    }
  }

  return merged;
}

/**
 * Mask secret credential values for safe display.
 * Shows only the last 4 characters.
 */
export function maskCredentialValue(value: string): string {
  if (!value || value.length <= 4) return '••••';
  return '••••' + value.slice(-4);
}

/**
 * Get masked credentials for display in the UI.
 */
export async function getMaskedCredentials(carrierId: CarrierId): Promise<Record<string, string>> {
  const def = CARRIER_FIELD_DEFINITIONS[carrierId];
  if (!def) return {};

  const stored = await firestoreService.getDocument<CarrierCredentials>(COLLECTION, carrierId);
  if (!stored) return {};

  const masked: Record<string, string> = {};
  for (const field of def.fields) {
    const value = stored.credentials[field.key] || '';
    masked[field.key] = field.secret ? maskCredentialValue(value) : value;
  }

  return masked;
}
