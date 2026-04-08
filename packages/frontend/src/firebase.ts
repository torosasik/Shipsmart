/**
 * Firebase configuration for ShipSmart frontend.
 * This file contains the Firebase SDK configuration.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, User } from 'firebase/auth';

// Firebase configuration from Firebase Console
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCbH_WFhmiSz4yoSDClU4XkRw71PuWotYc',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'shipsmart-app-dev.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'shipsmart-app-dev',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'shipsmart-app-dev.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '748557820332',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:748557820332:web:c8815314c1c78688495a09',
};

// Cloud Run backend URL
export const CLOUD_RUN_URL = import.meta.env.VITE_CLOUD_RUN_URL || 'https://shipsmart-api-748557820332.us-central1.run.app';

/**
 * Initialize Firebase app.
 * Returns existing app if already initialized.
 */
let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!firebaseApp) {
    firebaseApp = getApps().find((a) => a.name === '[DEFAULT]') || initializeApp(firebaseConfig);
  }
  return firebaseApp;
}

export function getFirebaseAuth(): Auth {
  if (!firebaseAuth) {
    firebaseAuth = getAuth(getFirebaseApp());
  }
  return firebaseAuth;
}

// Export auth instance for direct use
export const auth = getFirebaseAuth();

/**
 * Sign in with email and password.
 */
export async function signIn(email: string, password: string): Promise<User> {
  const authInstance = getFirebaseAuth();
  const result = await signInWithEmailAndPassword(authInstance, email, password);
  return result.user;
}

/**
 * Sign out.
 */
export async function signOut(): Promise<void> {
  const authInstance = getFirebaseAuth();
  await firebaseSignOut(authInstance);
}

/**
 * Get the current user.
 */
export function getCurrentUser(): User | null {
  return getFirebaseAuth().currentUser;
}

/**
 * Listen to auth state changes.
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  const authInstance = getFirebaseAuth();
  return onAuthStateChanged(authInstance, callback);
}

/**
 * Get Firebase ID token for API authentication.
 * This token is verified by the backend using Firebase Admin SDK.
 */
export async function getIdToken(): Promise<string | null> {
  const user = getCurrentUser();
  if (!user) return null;
  return user.getIdToken();
}
