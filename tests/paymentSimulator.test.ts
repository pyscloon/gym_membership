import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  generateTransactionId,
  saveTransaction,
  getStoredTransaction,
  clearAllTransactions,
  isTransactionPending,
} from "../src/lib/paymentSimulator";
import type { PaymentTransaction } from "../src/types/payment";

const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.assign(global, { localStorage: localStorageMock });

describe("paymentSimulator unit tests", () => {
  beforeEach(() => {
    clearAllTransactions();
    jest.restoreAllMocks();
  });

  it("generates transaction IDs in expected format", () => {
    const id = generateTransactionId();

    expect(id).toMatch(/^txn_\d+_[a-z0-9]+$/);
  });

  it("saves and retrieves a transaction", () => {
    const tx: PaymentTransaction = {
      id: "txn_123456_abc123",
      userId: "user-1",
      userType: "monthly",
      amount: 499,
      method: "card",
      status: "paid",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
    };

    saveTransaction(tx);

    expect(getStoredTransaction(tx.id)).toEqual(tx);
  });

  it("marks cash pending transactions as pending", () => {
    const tx: PaymentTransaction = {
      id: "txn_123457_def456",
      userId: "user-2",
      userType: "walk-in",
      amount: 100,
      method: "cash",
      status: "awaiting-confirmation",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveTransaction(tx);

    expect(isTransactionPending(tx.id)).toBe(true);
  });
});
