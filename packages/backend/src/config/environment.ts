/**
 * Environment variable loader with validation.
 * Fails fast on missing required variables.
 */

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/** Required environment variable names */
const REQUIRED_ENV_VARS = [
  'FIREBASE_PROJECT_ID',
  'PORT',
] as const;

/** Optional environment variable names with defaults */
const OPTIONAL_ENV_VARS = {
  NODE_ENV: 'development',
  ALLOWED_ORIGINS: 'http://localhost:5173',
  FIREBASE_CLIENT_EMAIL: '',
  FIREBASE_PRIVATE_KEY: '',
  API_KEYS: '',
} as const;

/**
 * Validate that all required environment variables are present.
 * Throws an error if any required variable is missing.
 */
function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        `Please copy .env.example to .env and fill in the required values.`,
    );
  }
}

/** Validated environment configuration */
export const env = {
  /** Firebase project ID */
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID!,

  /** Firebase service account client email */
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',

  /** Firebase service account private key */
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY || '',

  /** Server port */
  port: parseInt(process.env.PORT!, 10),

  /** Node environment (development, production, test) */
  nodeEnv: process.env.NODE_ENV || OPTIONAL_ENV_VARS.NODE_ENV,

  /** CORS allowed origins (comma-separated) */
  allowedOrigins: (
    process.env.ALLOWED_ORIGINS || OPTIONAL_ENV_VARS.ALLOWED_ORIGINS
  ).split(','),

  /** Whether Firebase credentials are configured */
  hasFirebaseCredentials: !!(
    process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY
  ),

  /** Whether we're running in development mode */
  isDev: (process.env.NODE_ENV || OPTIONAL_ENV_VARS.NODE_ENV) === 'development',

  /** Whether we're running in production mode */
  isProd: (process.env.NODE_ENV || OPTIONAL_ENV_VARS.NODE_ENV) === 'production',

  /** Shopify shared secret for webhook verification */
  shopifySharedSecret: process.env.SHOPIFY_SHARED_SECRET || '',

  /** API keys for service-to-service auth (format: service:key,service:key) */
  apiKeys: process.env.API_KEYS || OPTIONAL_ENV_VARS.API_KEYS,
} as const;

// Validate on import
validateEnv();
