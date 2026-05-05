/**
 * 🛡️ Stability Utilities - Core safeguards for error handling and retry logic
 * Prevents crashes and ensures graceful degradation
 */

/**
 * Retry configuration for resilient operations
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

/**
 * Safe async wrapper with error handling and retry logic
 * @param operation - Async function to execute
 * @param operationName - Name for logging
 * @param config - Retry configuration
 * @returns Result or null if all retries failed
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T | null> {
  let lastError: Error | null = null;
  let delay = config.initialDelayMs;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      console.log(`[${operationName}] Attempt ${attempt + 1}/${config.maxRetries + 1}`);
      return await operation();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[${operationName}] Attempt ${attempt + 1} failed:`, lastError.message);

      if (attempt < config.maxRetries) {
        await sleep(delay);
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
      }
    }
  }

  console.error(`[${operationName}] All ${config.maxRetries + 1} retries failed`, lastError?.message);
  return null;
}

/**
 * Safe execution of a function with error catching
 * @param fn - Function to execute
 * @param fallback - Fallback value if error occurs
 * @param context - Context for logging
 */
export function safeExecute<T>(
  fn: () => T,
  fallback: T,
  context: string
): T {
  try {
    return fn();
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[${context}] Error:`, errorMsg);
    return fallback;
  }
}

/**
 * Safe state update handler that prevents "setState on unmounted component" warnings
 * @param isMounted - Is component mounted check from useEffect cleanup
 * @param setState - State setter function
 * @param value - Value to set
 * @param context - Context for logging
 */
export function safeStateUpdate<T>(
  isMounted: boolean,
  setState: (value: T) => void,
  value: T,
  context: string
): void {
  if (!isMounted) {
    console.warn(`[${context}] Attempted state update after unmount, ignored`);
    return;
  }
  try {
    setState(value);
  } catch (err) {
    console.error(`[${context}] State update error:`, err);
  }
}

/**
 * Timeout wrapper for promises
 * @param promise - Promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param timeoutMessage - Error message on timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = "Operation timed out"
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Debounce function to prevent rapid repeated calls
 * @param fn - Function to debounce
 * @param delayMs - Delay in milliseconds
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<T>) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  };
}

/**
 * Throttle function to limit call frequency
 * @param fn - Function to throttle
 * @param intervalMs - Minimum interval between calls
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  intervalMs: number
): (...args: Parameters<T>) => void {
  let lastCallTime = 0;

  return function (...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastCallTime >= intervalMs) {
      fn(...args);
      lastCallTime = now;
    }
  };
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Validates data before use
 * @param data - Data to validate
 * @param schema - Validation schema (key -> type checker)
 * @param context - Context for logging
 */
export function validateData<T extends Record<string, any>>(
  data: unknown,
  schema: Record<keyof T, (val: any) => boolean>,
  context: string
): data is T {
  if (!data || typeof data !== "object") {
    console.error(`[${context}] Data is not an object`);
    return false;
  }

  const obj = data as Record<string, any>;
  for (const [key, validator] of Object.entries(schema)) {
    if (!validator(obj[key])) {
      console.error(`[${context}] Validation failed for key: ${key}`);
      return false;
    }
  }
  return true;
}

/**
 * Attempt to recover from partial operation failure
 * @param operation - Main operation to attempt
 * @param rollback - Rollback function if operation fails
 * @param context - Context for logging
 */
export async function withRollback<T>(
  operation: () => Promise<T>,
  rollback: () => Promise<void>,
  context: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (err) {
    console.error(`[${context}] Operation failed, attempting rollback:`, err);
    try {
      await rollback();
      console.log(`[${context}] Rollback successful`);
    } catch (rollbackErr) {
      console.error(`[${context}] Rollback failed:`, rollbackErr);
    }
    return null;
  }
}
