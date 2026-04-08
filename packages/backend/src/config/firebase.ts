/**
 * Firebase Admin SDK initialization.
 * Gracefully handles missing credentials by logging a warning.
 */

import admin from 'firebase-admin';
import { env } from './environment';

/** Firebase Admin app instance */
let firebaseApp: admin.app.App | null = null;

/**
 * Initialize Firebase Admin SDK.
 * If credentials are not configured, logs a warning and returns null.
 * This allows the server to start for development without Firebase.
 */
export function initializeFirebase(): admin.app.App | null {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    if (env.hasFirebaseCredentials) {
      // Parse the private key (may contain escaped newlines)
      const privateKey = env.firebasePrivateKey.replace(/\\n/g, '\n');

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.firebaseProjectId,
          clientEmail: env.firebaseClientEmail,
          privateKey: privateKey,
        }),
      });
      console.log('[Firebase] Admin SDK initialized with service account credentials');
    } else if (env.firebaseProjectId) {
      // Fall back to Application Default Credentials (ADC)
      // Works with: gcloud auth application-default login, Workload Identity, etc.
      firebaseApp = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: env.firebaseProjectId,
      });
      console.log('[Firebase] Admin SDK initialized with Application Default Credentials');
    } else {
      console.warn(
        '[Firebase] Missing Firebase credentials and project ID. ' +
          'Firebase features will be disabled. ' +
          'Set FIREBASE_PROJECT_ID and either service account credentials or configure ADC.',
      );
      return null;
    }

    return firebaseApp;
  } catch (error) {
    console.error('[Firebase] Failed to initialize Admin SDK:', error);
    return null;
  }
}

/**
 * Get the initialized Firebase Admin app.
 * Returns null if Firebase is not initialized.
 */
export function getFirebaseApp(): admin.app.App | null {
  return firebaseApp;
}

/**
 * Get the Firestore database instance.
 * Returns null if Firebase is not initialized.
 */
export function getFirestore(): admin.firestore.Firestore | null {
  if (!firebaseApp) {
    return null;
  }
  return admin.firestore();
}

/**
 * Get the Firebase Storage bucket instance.
 * Returns null if Firebase is not initialized.
 */
export function getStorage(): admin.storage.Storage | null {
  if (!firebaseApp) {
    return null;
  }
  return admin.storage();
}

// Initialize on module load
initializeFirebase();
