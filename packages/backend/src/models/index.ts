/**
 * Re-export shared types and add backend-specific request/response types.
 */

// Re-export all shared types
export * from '@shipsmart/shared';

/**
 * Standard API response envelope
 */
export interface ApiResponse<T = unknown> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data (present on success) */
  data?: T;
  /** Error message (present on failure) */
  error?: string;
  /** Error details (present on validation failure) */
  details?: Record<string, string[]>;
}

/**
 * Paginated response for list endpoints
 */
export interface PaginatedResponse<T = unknown> {
  /** Items in the current page */
  items: T[];
  /** Total number of items */
  total: number;
  /** Current page number */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Whether there are more pages */
  hasMore: boolean;
}

/**
 * Express request with authenticated user info
 */
export interface AuthenticatedRequest {
  /** Firebase auth UID */
  uid: string;
  /** User email from Firebase auth */
  email?: string;
  /** Whether the user is an admin */
  isAdmin: boolean;
}