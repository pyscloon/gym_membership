/**
 * 🧪 Production Hardening Tests
 * Tests for input validation, rate limiting, circuit breaker, and audit logging
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
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
} from "../src/lib/productionHardening";

describe("Production Hardening", () => {
  describe("input validation", () => {
    it("should validate email correctly", () => {
      expect(VALIDATORS.email("test@example.com")).toBe(true);
      expect(VALIDATORS.email("invalid-email")).toBe(false);
      expect(VALIDATORS.email("@example.com")).toBe(false);
    });

    it("should validate UUID correctly", () => {
      const validUuid = "550e8400-e29b-41d4-a716-446655440000";
      const invalidUuid = "not-a-uuid";
      expect(VALIDATORS.uuid(validUuid)).toBe(true);
      expect(VALIDATORS.uuid(invalidUuid)).toBe(false);
    });

    it("should validate membership tier", () => {
      expect(validateMembershipTier("monthly")).toBe(true);
      expect(validateMembershipTier("quarterly")).toBe(true);
      expect(validateMembershipTier("yearly")).toBe(true);
      expect(validateMembershipTier("walk-in")).toBe(true);
      expect(validateMembershipTier("invalid")).toBe(false);
    });

    it("should validate user ID", () => {
      const validUuid = "550e8400-e29b-41d4-a716-446655440000";
      expect(validateUserId(validUuid)).toBe(true);
      expect(validateUserId("walk-in-guest")).toBe(true);
      expect(validateUserId("invalid")).toBe(false);
      expect(validateUserId("")).toBe(false);
    });

    it("should validate transaction ID", () => {
      const validUuid = "550e8400-e29b-41d4-a716-446655440000";
      expect(validateTransactionId(validUuid)).toBe(true);
      expect(validateTransactionId("invalid-id")).toBe(false);
    });

    it("should validate payment amount", () => {
      expect(validatePaymentAmount(1000).valid).toBe(true);
      expect(validatePaymentAmount(0).valid).toBe(false);
      expect(validatePaymentAmount(-100).valid).toBe(false);
      expect(validatePaymentAmount(1000001).valid).toBe(false);
    });
  });

  describe("input sanitization", () => {
    it("should remove dangerous characters", () => {
      expect(sanitizeInput("<script>alert('xss')</script>")).not.toContain("<");
      expect(sanitizeInput("<img src=x>")).not.toContain("<");
    });

    it("should trim whitespace", () => {
      expect(sanitizeInput("  hello  ")).toBe("hello");
    });

    it("should limit string length", () => {
      const long = "a".repeat(600);
      const sanitized = sanitizeInput(long);
      expect(sanitized.length).toBeLessThanOrEqual(500);
    });
  });

  describe("response formatting", () => {
    it("should create error response", () => {
      const error = createErrorResponse("Operation failed", "OP_FAILED", { retry: true });
      expect(error.success).toBe(false);
      expect(error.error).toBe("Operation failed");
      expect(error.code).toBe("OP_FAILED");
      expect(error.timestamp).toBeDefined();
    });

    it("should create success response", () => {
      const success = createSuccessResponse({ id: "123", name: "Test" });
      expect(success.success).toBe(true);
      expect(success.data.id).toBe("123");
      expect(success.timestamp).toBeDefined();
    });
  });

  describe("rate limiting", () => {
    let limiter: RateLimiter;

    beforeEach(() => {
      limiter = new RateLimiter(3, 100);
    });

    it("should allow requests within limit", () => {
      expect(limiter.isAllowed("user-1")).toBe(true);
      expect(limiter.isAllowed("user-1")).toBe(true);
      expect(limiter.isAllowed("user-1")).toBe(true);
    });

    it("should block requests exceeding limit", () => {
      expect(limiter.isAllowed("user-1")).toBe(true);
      expect(limiter.isAllowed("user-1")).toBe(true);
      expect(limiter.isAllowed("user-1")).toBe(true);
      expect(limiter.isAllowed("user-1")).toBe(false);
    });

    it("should reset after time window", (done) => {
      expect(limiter.isAllowed("user-2")).toBe(true);
      expect(limiter.isAllowed("user-2")).toBe(true);
      expect(limiter.isAllowed("user-2")).toBe(true);
      expect(limiter.isAllowed("user-2")).toBe(false);

      setTimeout(() => {
        expect(limiter.isAllowed("user-2")).toBe(true);
        done();
      }, 150);
    });

    it("should isolate limits per user", () => {
      expect(limiter.isAllowed("user-1")).toBe(true);
      expect(limiter.isAllowed("user-2")).toBe(true);
      expect(limiter.isAllowed("user-1")).toBe(true);
      expect(limiter.isAllowed("user-2")).toBe(true);
      expect(limiter.isAllowed("user-1")).toBe(true);
      expect(limiter.isAllowed("user-2")).toBe(true);
      
      // user-1 exceeds
      expect(limiter.isAllowed("user-1")).toBe(false);
      // user-2 should still have one left
      expect(limiter.isAllowed("user-2")).toBe(false);
    });
  });

  describe("health checker", () => {
    it("should check health of all components", async () => {
      const checker = new HealthChecker();
      checker.register("db", async () => true);
      checker.register("cache", async () => true);
      checker.register("api", async () => true);

      const results = await checker.runAll();
      expect(results.db).toBe(true);
      expect(results.cache).toBe(true);
      expect(results.api).toBe(true);
      expect(checker.isHealthy(results)).toBe(true);
    });

    it("should detect unhealthy components", async () => {
      const checker = new HealthChecker();
      checker.register("db", async () => true);
      checker.register("cache", async () => false);

      const results = await checker.runAll();
      expect(checker.isHealthy(results)).toBe(false);
    });

    it("should handle check failures", async () => {
      const checker = new HealthChecker();
      checker.register("failing", async () => {
        throw new Error("Check failed");
      });

      const results = await checker.runAll();
      expect(results.failing).toBe(false);
    });
  });

  describe("idempotency manager", () => {
    let manager: IdempotencyManager;

    beforeEach(() => {
      manager = new IdempotencyManager(100);
    });

    it("should store and retrieve idempotency keys", () => {
      manager.set("key-1", { result: "success" });
      expect(manager.has("key-1")).toBe(true);
      expect(manager.get("key-1")).toEqual({ result: "success" });
    });

    it("should expire old keys", (done) => {
      manager.set("key-1", { result: "success" });
      expect(manager.has("key-1")).toBe(true);

      setTimeout(() => {
        expect(manager.has("key-1")).toBe(false);
        done();
      }, 150);
    });

    it("should return null for non-existent keys", () => {
      expect(manager.get("non-existent")).toBeNull();
      expect(manager.has("non-existent")).toBe(false);
    });
  });

  describe("circuit breaker", () => {
    it("should allow operations when closed", async () => {
      const breaker = new CircuitBreaker(3);
      const op = jest.fn(async () => "success");

      const result = await breaker.execute(op);
      expect(result).toBe("success");
      expect(op).toHaveBeenCalledTimes(1);
    });

    it("should open after threshold failures", async () => {
      const breaker = new CircuitBreaker(2);
      const failingOp = jest.fn(async () => {
        throw new Error("Operation failed");
      });

      // Fail twice to hit threshold
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(failingOp);
        } catch {
          // Expected
        }
      }

      expect(breaker.getState().state).toBe("open");

      // Should now reject without calling operation
      await expect(breaker.execute(failingOp)).rejects.toThrow("Circuit breaker is open");
      expect(failingOp).toHaveBeenCalledTimes(2); // No new call
    });

    it("should transition to half-open after timeout", async () => {
      const breaker = new CircuitBreaker(1, 50);
      const failingOp = jest.fn(async () => {
        throw new Error("Operation failed");
      });

      // Fail once to open
      try {
        await breaker.execute(failingOp);
      } catch {
        // Expected
      }

      expect(breaker.getState().state).toBe("open");

      // Wait for reset timeout
      await new Promise((r) => setTimeout(r, 100));

      // Should attempt half-open and fail again
      try {
        await breaker.execute(failingOp);
      } catch {
        // Expected
      }

      expect(breaker.getState().state).toBe("open");
    });

    it("should close after successful operation in half-open", async () => {
      const breaker = new CircuitBreaker(1, 50);
      let attemptCount = 0;

      const intermittentOp = jest.fn(async () => {
        attemptCount++;
        return "success";
      });

      // First success keeps it closed
      const result1 = await breaker.execute(intermittentOp);
      expect(result1).toBe("success");
      expect(breaker.getState().state).toBe("closed");
    });
  });

  describe("audit logger", () => {
    let logger: AuditLogger;

    beforeEach(() => {
      logger = new AuditLogger();
    });

    it("should log actions", () => {
      logger.log("payment.confirm", "success", { amount: 1000 }, "user-1");
      const logs = logger.getSensitiveOperationLogs("payment.confirm");
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe("payment.confirm");
      expect(logs[0].result).toBe("success");
    });

    it("should retrieve logs by user", () => {
      logger.log("login", "success", {}, "user-1");
      logger.log("payment.confirm", "success", {}, "user-1");
      logger.log("login", "failure", {}, "user-2");

      const userLogs = logger.getLogsForUser("user-1");
      expect(userLogs).toHaveLength(2);
      expect(userLogs.every((log) => log.userId === "user-1")).toBe(true);
    });

    it("should retrieve logs by action", () => {
      logger.log("payment.confirm", "success", {}, "user-1");
      logger.log("payment.confirm", "failure", {}, "user-2");
      logger.log("login", "success", {}, "user-1");

      const paymentLogs = logger.getSensitiveOperationLogs("payment.confirm");
      expect(paymentLogs).toHaveLength(2);
      expect(paymentLogs.every((log) => log.action === "payment.confirm")).toBe(true);
    });
  });
});
