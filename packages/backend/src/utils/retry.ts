/**
 * Retry logic with exponential backoff and circuit breaker pattern.
 * Protects against cascading failures when calling external carrier APIs.
 */

/** Retry configuration */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay in milliseconds */
  initialDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Exponential backoff multiplier */
  backoffMultiplier: number;
  /** Which HTTP status codes to retry on */
  retryableStatuses: number[];
}

/** Default retry configuration */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableStatuses: [429, 500, 502, 503, 504],
};

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic and exponential backoff.
 *
 * @param fn - Function to execute
 * @param config - Retry configuration
 * @returns Result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const { maxRetries, initialDelayMs, maxDelayMs, backoffMultiplier, retryableStatuses } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: Error | null = null;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      const shouldRetry = shouldRetryError(error, retryableStatuses);

      if (!shouldRetry || attempt >= maxRetries) {
        throw error;
      }

      // Exponential backoff with jitter (computed before sleep)
      delay = Math.min(delay * backoffMultiplier + Math.random() * 1000, maxDelayMs);
      console.warn(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
      await sleep(delay);
    }
  }

  throw lastError || new Error('Unknown error during retry');
}

/**
 * Check if an error is retryable.
 */
function shouldRetryError(error: unknown, retryableStatuses: number[]): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // Retry on network errors and rate limits
    if (message.includes('fetch') || message.includes('network') || message.includes('econnrefused')) {
      return true;
    }
    // Retry on specific HTTP status codes
    for (const status of retryableStatuses) {
      if (message.includes(status.toString())) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Circuit breaker state.
 */
export enum CircuitState {
  /** Circuit is closed, requests flow normally */
  CLOSED = 'closed',
  /** Circuit is open, requests fail immediately */
  OPEN = 'open',
  /** Circuit is half-open, allowing a test request */
  HALF_OPEN = 'half_open',
}

/** Circuit breaker configuration */
export interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Time in milliseconds before attempting to close the circuit */
  resetTimeoutMs: number;
}

/** Default circuit breaker configuration */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 60000, // 1 minute
};

/**
 * Circuit breaker for protecting against cascading failures.
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime: Date | null = null;
  private config: CircuitBreakerConfig;
  readonly name: string;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
  }

  /**
   * Execute a function through the circuit breaker.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.checkState();

    if (this.state === CircuitState.OPEN) {
      throw new Error(`Circuit breaker '${this.name}' is open`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Get the current state of the circuit breaker.
   */
  getState(): CircuitState {
    this.checkState();
    return this.state;
  }

  /**
   * Check if the circuit should transition states.
   */
  private checkState(): void {
    if (this.state === CircuitState.OPEN && this.lastFailureTime) {
      const timeSinceFailure = Date.now() - this.lastFailureTime.getTime();
      if (timeSinceFailure >= this.config.resetTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        console.log(`[CircuitBreaker] '${this.name}' transitioning to half-open`);
      }
    }
  }

  /**
   * Handle a successful request.
   */
  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.failureCount = 0;
      this.lastFailureTime = null;
      console.log(`[CircuitBreaker] '${this.name}' transitioning to closed`);
    }
  }

  /**
   * Handle a failed request.
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      console.warn(`[CircuitBreaker] '${this.name}' transitioning to open after ${this.failureCount} failures`);
    }
  }

  /**
   * Reset the circuit breaker to closed state.
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    console.log(`[CircuitBreaker] '${this.name}' manually reset to closed`);
  }
}

/**
 * Create circuit breakers for each carrier.
 */
export function createCarrierCircuitBreakers(): Record<string, CircuitBreaker> {
  return {
    ups: new CircuitBreaker('ups'),
    fedex: new CircuitBreaker('fedex'),
    usps: new CircuitBreaker('usps'),
    shippo: new CircuitBreaker('shippo'),
    ltl: new CircuitBreaker('ltl'),
    shipstation: new CircuitBreaker('shipstation'),
    veeqo: new CircuitBreaker('veeqo'),
  };
}

/** Global circuit breakers for carriers */
export const carrierCircuitBreakers = createCarrierCircuitBreakers();
