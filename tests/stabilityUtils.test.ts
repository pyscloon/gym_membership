/**
 * 🧪 Stability Utilities Tests
 * Tests for error handling, retries, and safe state updates
 */

import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import {
  executeWithRetry,
  safeExecute,
  withTimeout,
  debounce,
  throttle,
  sleep,
  validateData,
} from "../src/lib/stabilityUtils";

describe("stabilityUtils", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  type Person = {
    name: string;
    age: number;
  };

  const personSchema = {
    name: (value: unknown): value is Person["name"] => typeof value === "string",
    age: (value: unknown): value is Person["age"] => typeof value === "number",
  };

  describe("executeWithRetry", () => {
    it("should execute successfully on first try", async () => {
      const fn = () => Promise.resolve("success");
      const result = await executeWithRetry(fn, "test", {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      });
      expect(result).toBe("success");
    });

    it("should retry on failure and succeed", async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 2) throw new Error("First attempt fails");
        return "success";
      };

      const result = await executeWithRetry(fn, "test", {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      });
      expect(result).toBe("success");
      expect(attempts).toBe(2);
    });

    it("should return null after max retries exhausted", async () => {
      const fn = () => Promise.reject(new Error("Always fails"));
      const result = await executeWithRetry(fn, "test", {
        maxRetries: 1,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      });
      expect(result).toBeNull();
    });

    it("should handle different error types", async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts === 1) throw new Error("Network error");
        if (attempts === 2) throw new TypeError("Type error");
        return "success";
      };

      const result = await executeWithRetry(fn, "test", {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      });
      expect(result).toBe("success");
      expect(attempts).toBe(3);
    });
  });

  describe("safeExecute", () => {
    it("should execute successfully", () => {
      const result = safeExecute(() => "value", "fallback", "test");
      expect(result).toBe("value");
    });

    it("should return fallback on error", () => {
      const result = safeExecute(() => {
        throw new Error("Oops");
      }, "fallback", "test");
      expect(result).toBe("fallback");
    });

    it("should return typed fallback", () => {
      const fallback = [1, 2, 3];
      const result = safeExecute(
        () => {
          throw new Error("Array operation failed");
        },
        fallback,
        "test"
      );
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe("withTimeout", () => {
    it("should resolve before timeout", async () => {
      const promise = sleep(10).then(() => "success");
      const result = await withTimeout(promise, 100);
      expect(result).toBe("success");
    });

    it("should timeout if operation is too slow", async () => {
      const promise = sleep(100).then(() => "success");
      await expect(withTimeout(promise, 10)).rejects.toThrow(
        "Operation timed out"
      );
    });

    it("should use custom timeout message", async () => {
      const promise = sleep(100).then(() => "success");
      await expect(withTimeout(promise, 10, "Custom timeout")).rejects.toThrow(
        "Custom timeout"
      );
    });
  });

  describe("debounce", () => {
    it("should debounce rapid calls", (done) => {
      let count = 0;
      const fn = () => {
        count++;
      };
      const debounced = debounce(fn, 50);

      debounced();
      debounced();
      debounced();

      expect(count).toBe(0);

      setTimeout(() => {
        expect(count).toBe(1);
        done();
      }, 100);
    });

    it("should call function after delay", (done) => {
      let count = 0;
      const fn = () => {
        count++;
      };
      const debounced = debounce(fn, 30);

      debounced();
      setTimeout(() => {
        expect(count).toBe(1);
        done();
      }, 100);
    });
  });

  describe("throttle", () => {
    it("should throttle rapid calls", (done) => {
      let count = 0;
      const fn = () => {
        count++;
      };
      const throttled = throttle(fn, 50);

      throttled();
      throttled();
      throttled();

      expect(count).toBe(1); // Only first call executes immediately

      setTimeout(() => {
        throttled();
        expect(count).toBe(2);
        done();
      }, 100);
    });
  });

  describe("validateData", () => {
    it("should validate correct data", () => {
      const data = { name: "John", age: 30 };
      expect(validateData<Person>(data, personSchema, "test")).toBe(true);
    });

    it("should reject invalid data", () => {
      const data = { name: "John", age: "30" };
      expect(validateData<Person>(data, personSchema, "test")).toBe(false);
    });

    it("should handle null/undefined", () => {
      expect(validateData(null, {}, "test")).toBe(false);
      expect(validateData(undefined, {}, "test")).toBe(false);
    });
  });

  describe("sleep", () => {
    it("should delay execution", async () => {
      const start = Date.now();
      await sleep(30);
      const elapsed = Date.now() - start;
      // Allow for small timing variations (e.g. 29ms instead of 30ms) in test environments
      expect(elapsed).toBeGreaterThanOrEqual(28);
    });
  });
});
