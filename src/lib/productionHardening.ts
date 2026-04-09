/**
 * 🔒 Production Hardening - Input validation, error standardization, and safeguards
 */

/**
 * Standard error response format for all operations
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

/** Input validation schemas */
export const VALIDATORS = {
  uuid: (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
  email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  phone: (value: string) => /^\d{10,15}$/.test(value),
  amount: (value: number) => value > 0 && !isNaN(value),
  date: (value: string) => !isNaN(Date.parse(value)),
  enum: (value: string, allowedValues: string[]) => allowedValues.includes(value),
  nonEmpty: (value: string) => typeof value === "string" && value.trim().length > 0,
};

/**
 * Validate payment tier
 */
export function validateMembershipTier(tier: string): tier is any {
  const VALID_TIERS = ["monthly", "quarterly", "yearly", "walk-in"];
  return VALID_TIERS.includes(tier);
}

/**
 * Validate user ID exists and is valid format
 */
export function validateUserId(userId: string): boolean {
  if (!userId || typeof userId !== "string") return false;
  if (userId.startsWith("walk-in-")) return true; // Walk-in IDs are special
  return VALIDATORS.uuid(userId);
}

/**
 * Validate transaction ID
 */
export function validateTransactionId(txnId: string): boolean {
  return VALIDATORS.uuid(txnId);
}

/**
 * Validate payment amount
 */
export function validatePaymentAmount(amount: number): { valid: boolean; error?: string } {
  if (!amount || typeof amount !== "number") {
    return { valid: false, error: "Amount must be a number" };
  }
  if (amount <= 0) {
    return { valid: false, error: "Amount must be greater than 0" };
  }
  if (amount > 1000000) {
    return { valid: false, error: "Amount exceeds maximum limit" };
  }
  return { valid: true };
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[<>]/g, "") // Remove angle brackets
    .trim()
    .substring(0, 500); // Limit length
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  message: string,
  code?: string,
  details?: Record<string, any>
): ErrorResponse {
  return {
    success: false,
    error: message,
    code: code || "UNKNOWN_ERROR",
    details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(data: T): SuccessResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts: number = 10, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter((t) => now - t < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

/**
 * Operational health checks
 */
export class HealthChecker {
  private checks: Map<string, () => Promise<boolean>> = new Map();

  register(name: string, check: () => Promise<boolean>): void {
    this.checks.set(name, check);
  }

  async runAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const [name, check] of this.checks) {
      try {
        results[name] = await check();
      } catch (err) {
        console.error(`Health check failed for ${name}:`, err);
        results[name] = false;
      }
    }
    
    return results;
  }

  isHealthy(results: Record<string, boolean>): boolean {
    return Object.values(results).every((r) => r === true);
  }
}

/**
 * Idempotency key manager for safe retries
 */
export class IdempotencyManager {
  private cache: Map<string, any> = new Map();
  private expiry: Map<string, number> = new Map();
  private readonly ttlMs: number;

  constructor(ttlMs: number = 300000) { // 5 minutes default
    this.ttlMs = ttlMs;
  }

  set(key: string, value: any): void {
    this.cache.set(key, value);
    this.expiry.set(key, Date.now() + this.ttlMs);
  }

  get(key: string): any {
    const expiryTime = this.expiry.get(key);
    
    if (!expiryTime || Date.now() > expiryTime) {
      this.cache.delete(key);
      this.expiry.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }
}

/**
 * Circuit breaker pattern for external dependencies
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  state: "closed" | "open" | "half-open" = "closed";
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(failureThreshold: number = 5, resetTimeoutMs: number = 60000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
  }

  async execute<T>(
    operation: () => Promise<T>,
    operationName: string = "operation"
  ): Promise<T> {
    if (this.state === "open") {
      if (
        this.lastFailureTime &&
        Date.now() - this.lastFailureTime > this.resetTimeoutMs
      ) {
        this.state = "half-open";
        console.log(`[CircuitBreaker] ${operationName}: Transitioning to half-open`);
      } else {
        throw new Error(`Circuit breaker is open for ${operationName}`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === "half-open") {
      this.state = "closed";
      console.log("[CircuitBreaker] Circuit closed - service recovered");
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = "open";
      console.error(
        `[CircuitBreaker] Circuit opened after ${this.failureCount} failures`
      );
    }
  }

  getState(): { state: string; failureCount: number; lastFailureTime: number | null } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

/**
 * Audit logger for compliance
 */
export class AuditLogger {
  private logs: Array<{
    timestamp: string;
    action: string;
    userId?: string;
    details: Record<string, any>;
    result: "success" | "failure";
  }> = [];

  log(
    action: string,
    result: "success" | "failure",
    details: Record<string, any>,
    userId?: string
  ): void {
    this.logs.push({
      timestamp: new Date().toISOString(),
      action,
      userId,
      details,
      result,
    });
  }

  getSensitiveOperationLogs(action: string): Array<any> {
    return this.logs.filter((log) => log.action === action);
  }

  getLogsForUser(userId: string): Array<any> {
    return this.logs.filter((log) => log.userId === userId);
  }
}
