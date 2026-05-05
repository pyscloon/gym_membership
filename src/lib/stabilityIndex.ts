/**
 * 📋 Stability Utilities Index
 * Centralized exports and documentation of all stability features
 */

// Core error handling & retries
export {
  executeWithRetry,
  safeExecute,
  safeStateUpdate,
  withTimeout,
  debounce,
  throttle,
  sleep,
  validateData,
  withRollback,
  DEFAULT_RETRY_CONFIG,
  type RetryConfig,
} from "./stabilityUtils";

// React hooks for safe async operations
export {
  useSafeAsync,
  useMultipleSafeAsync,
  type UseSafeAsyncState,
} from "../hooks/useSafeAsync";

// Production hardening: validation, rate limiting, circuit breaker
export {
  VALIDATORS,
  validateMembershipTier,
  validateUserId,
  validateTransactionId,
  validatePaymentAmount,
  sanitizeInput,
  createErrorResponse,
  createSuccessResponse,
  RateLimiter,
  HealthChecker,
  IdempotencyManager,
  CircuitBreaker,
  AuditLogger,
  type ErrorResponse,
  type SuccessResponse,
  type ApiResponse,
} from "./productionHardening";

// Error boundary component
export {
  ErrorBoundary,
  ErrorFallback,
} from "../components/ErrorBoundary";

/**
 * ✅ Stability Feature Checklist
 * 
 * IMPLEMENTED:
 * ✓ Retry logic with exponential backoff
 * ✓ Safe state updates (prevents "setState on unmounted component")
 * ✓ Timeout handling for async operations
 * ✓ Error boundaries for React components
 * ✓ Loading and error state management
 * ✓ Input validation and sanitization
 * ✓ Rate limiting
 * ✓ Circuit breaker pattern
 * ✓ Idempotency key management
 * ✓ Health checks
 * ✓ Audit logging
 * ✓ Debounce and throttle utilities
 * ✓ Rollback support for failed operations
 * 
 * INTEGRATION POINTS:
 * - AdminDashboard.tsx: Uses useSafeAsync, ErrorBoundary, safe state updates
 * - AdminPaymentPanel.tsx: Benefits from retry logic and error handling
 * - All async operations: Protected by executeWithRetry
 * 
 * BEST PRACTICES:
 * 1. Always use useSafeAsync for component async operations
 * 2. Wrap critical sections with ErrorBoundary
 * 3. Use executeWithRetry for external API calls
 * 4. Validate all user inputs before processing
 * 5. Use circuit breaker for external dependencies
 * 6. Log sensitive operations with AuditLogger
 * 7. Implement rate limiting for user actions
 * 8. Use idempotency keys for payment operations
 */

/**
 * Common usage patterns
 */
export const STABILITY_PATTERNS = {
  /**
   * Safe async data fetching in React component
   */
  useSafeAsyncExample: `
    import { useSafeAsync } from '@/lib/stabilityUtils';
    
    const { data, loading, error, refetch } = useSafeAsync(
      async () => fetchingFunction(),
      [dependency1, dependency2],
      { retryConfig, timeoutMs: 30000 }
    );
  `,

  /**
   * Safe async operation with retry
   */
  executeSafelyExample: `
    import { executeWithRetry } from '@/lib/stabilityUtils';
    
    const result = await executeWithRetry(
      async () => riskyOperation(),
      "operationName",
      { maxRetries: 3 }
    );
  `,

  /**
   * Error boundary wrapping
   */
  errorBoundaryExample: `
    import { ErrorBoundary, ErrorFallback } from '@/components/ErrorBoundary';
    
    <ErrorBoundary fallback={<ErrorFallback message="Something went wrong" />}>
      <CriticalComponent />
    </ErrorBoundary>
  `,

  /**
   * Input validation
   */
  validationExample: `
    import { validatePaymentAmount, sanitizeInput } from '@/lib/productionHardening';
    
    const validation = validatePaymentAmount(amount);
    if (!validation.valid) {
      handleError(validation.error);
    }
    
    const safe = sanitizeInput(userInput);
  `,

  /**
   * Circuit breaker for external service
   */
  circuitBreakerExample: `
    import { CircuitBreaker } from '@/lib/productionHardening';
    
    const breaker = new CircuitBreaker(5, 60000);
    try {
      const result = await breaker.execute(() => externalApi.call());
    } catch (err) {
      // Service is down, show fallback UI
    }
  `,

  /**
   * Rate limiting user actions
   */
  rateLimitingExample: `
    import { RateLimiter } from '@/lib/productionHardening';
    
    const limiter = new RateLimiter(10, 60000);
    
    const handleAction = () => {
      if (!limiter.isAllowed(userId)) {
        return showError("Too many requests");
      }
      executeAction();
    }
  `,
};
