import { describe, it, expect, beforeEach, beforeAll, jest } from "@jest/globals";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import {
  generateTransactionId,
  saveTransaction,
  getStoredTransaction,
  clearAllTransactions,
  isTransactionPending,
} from "../src/lib/paymentSimulator";
import type { PaymentTransaction } from "../src/types/payment";

dotenv.config();

const REQUIRED_ENV = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"] as const;

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`Missing required env variable: ${key}`);
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase    = createClient(supabaseUrl, supabaseKey);

// ── localStorage mock ──────────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem:    (key: string)              => (key in store ? store[key] : null),
    setItem:    (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string)              => { delete store[key]; },
    clear:      ()                         => { store = {}; },
  };
})();

Object.assign(global, { localStorage: localStorageMock });

// ── Fixtures ───────────────────────────────────────────────────────────────────

function makeTx(overrides: Partial<PaymentTransaction> = {}): PaymentTransaction {
  return {
    id:          generateTransactionId(),
    userId:      "user-1",
    userType:    "monthly",
    amount:      499,
    method:      "card",
    status:      "paid",
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
    confirmedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe("paymentSimulator unit tests", () => {
  beforeAll(async () => {
    const { error } = await supabase.from("walk_ins").select("id").limit(1);
    const isReachable =
      !error ||
      error.message.includes("permission") ||
      error.code === "PGRST301";

    if (!isReachable) {
      throw new Error(`Supabase unreachable: ${error?.message}`);
    }
  });

  beforeEach(() => {
    clearAllTransactions();
    jest.restoreAllMocks();
  });

  // ── generateTransactionId ────────────────────────────────────────────────────

  describe("generateTransactionId — Happy Path", () => {
    it("generates an ID in the expected txn_<timestamp>_<random> format", () => {
      const id = generateTransactionId();
      expect(id).toMatch(/^txn_\d+_[a-z0-9]+$/);
    });

    it("generates unique IDs on successive calls", () => {
      const ids = new Set(Array.from({ length: 10 }, generateTransactionId));
      expect(ids.size).toBe(10);
    });
  });

  // ── saveTransaction / getStoredTransaction ───────────────────────────────────

  describe("saveTransaction / getStoredTransaction — Happy Path", () => {
    it("saves and retrieves a paid card transaction", () => {
      const tx = makeTx();
      saveTransaction(tx);
      expect(getStoredTransaction(tx.id)).toEqual(tx);
    });

    it("saves and retrieves a cash awaiting-confirmation transaction", () => {
      const tx = makeTx({
        method:      "cash",
        status:      "awaiting-confirmation",
        confirmedAt: undefined,
      });
      saveTransaction(tx);
      expect(getStoredTransaction(tx.id)).toEqual(tx);
    });

    it("saves and retrieves an online awaiting-verification transaction", () => {
      const tx = makeTx({
        method:      "online",
        status:      "awaiting-verification",
        confirmedAt: undefined,
      });
      saveTransaction(tx);
      expect(getStoredTransaction(tx.id)).toEqual(tx);
    });

    it("overwrites an existing transaction when saved again with the same id", () => {
      const tx      = makeTx({ status: "awaiting-confirmation" });
      const updated = { ...tx, status: "paid" as const, confirmedAt: new Date().toISOString() };

      saveTransaction(tx);
      saveTransaction(updated);

      expect(getStoredTransaction(tx.id)?.status).toBe("paid");
    });
  });

  describe("saveTransaction / getStoredTransaction — Sad Path", () => {
    it("returns null for a transaction ID that was never saved", () => {
      expect(getStoredTransaction("txn_does_not_exist")).toBeNull();
    });

    it("returns null after all transactions are cleared", () => {
      const tx = makeTx();
      saveTransaction(tx);
      clearAllTransactions();
      expect(getStoredTransaction(tx.id)).toBeNull();
    });
  });

  // ── isTransactionPending ─────────────────────────────────────────────────────

  describe("isTransactionPending — Happy Path", () => {
    it("returns true for a cash awaiting-confirmation transaction", () => {
      const tx = makeTx({ method: "cash", status: "awaiting-confirmation", confirmedAt: undefined });
      saveTransaction(tx);
      expect(isTransactionPending(tx.id)).toBe(true);
    });

    it("returns true for an online awaiting-verification transaction", () => {
      const tx = makeTx({ method: "online", status: "awaiting-verification", confirmedAt: undefined });
      saveTransaction(tx);
      expect(isTransactionPending(tx.id)).toBe(true);
    });
  });

  describe("isTransactionPending — Sad Path", () => {
    it("returns false for a completed paid transaction", () => {
      const tx = makeTx({ method: "card", status: "paid" });
      saveTransaction(tx);
      expect(isTransactionPending(tx.id)).toBe(false);
    });

    it("returns false for a failed transaction", () => {
      const tx = makeTx({ status: "failed", confirmedAt: undefined });
      saveTransaction(tx);
      expect(isTransactionPending(tx.id)).toBe(false);
    });

    it("returns false for a transaction ID that does not exist", () => {
      expect(isTransactionPending("txn_ghost_000")).toBe(false);
    });
  });

  // ── Supabase live check ──────────────────────────────────────────────────────

  describe("Supabase — memberships table", () => {
    it("confirms the memberships table is accessible", async () => {
      const { error } = await supabase
        .from("memberships")
        .select("id, status")
        .limit(1);

      const isAccessible =
        !error ||
        error.message.includes("permission") ||
        error.code === "PGRST301";

      expect(isAccessible).toBe(true);
    });
  });
});