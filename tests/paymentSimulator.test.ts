import { describe, it, expect, beforeEach, jest } from "@jest/globals";

type TransactionRow = {
  id: string;
  user_id: string;
  user_type: string;
  amount: number;
  method: string;
  status: string;
  payment_proof_status: string | null;
  proof_of_payment_url: string | null;
  rejection_reason: string | null;
  failure_reason: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

const transactionStore = new Map<string, TransactionRow>();

const mockSupabase = {
  from(table: string) {
    if (table !== "transactions") {
      throw new Error(`Unexpected table: ${table}`);
    }

    return {
      upsert(row: TransactionRow) {
        return {
          select() {
            return {
              async single() {
                transactionStore.set(row.id, row);
                return { data: row, error: null };
              },
            };
          },
        };
      },
      select() {
        return {
          async order(_column: string, _options: { ascending: boolean }) {
            const data = Array.from(transactionStore.values()).sort((left, right) =>
              right.created_at.localeCompare(left.created_at)
            );
            return { data, error: null };
          },
          eq(column: string, value: string) {
            return {
              async maybeSingle() {
                if (column !== "id") {
                  return { data: null, error: null };
                }

                return {
                  data: transactionStore.get(value) ?? null,
                  error: null,
                };
              },
            };
          },
        };
      },
      delete() {
        return {
          async neq(column: string, value: string) {
            if (column === "id" && value === "") {
              transactionStore.clear();
            }
            return { data: null, error: null };
          },
        };
      },
    };
  },
};

jest.mock("../src/lib/supabaseClient", () => ({
  supabase: mockSupabase,
  isSupabaseConfigured: true,
}));

import {
  generateTransactionId,
  saveTransaction,
  getStoredTransaction,
  clearAllTransactions,
  isTransactionPending,
  simulatePaymentTransaction,
  simulateAdminConfirmation,
  verifyOnlinePayment,
  rejectOnlinePayment,
} from "../src/lib/paymentSimulator";
import type { PaymentTransaction } from "../src/types/payment";

function makeTx(overrides: Partial<PaymentTransaction> = {}): PaymentTransaction {
  return {
    id: generateTransactionId(),
    userId: "11111111-1111-4111-8111-111111111111",
    userType: "monthly",
    amount: 499,
    method: "card",
    status: "paid",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    confirmedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("paymentSimulator unit tests", () => {
  beforeEach(async () => {
    await clearAllTransactions();
    jest.restoreAllMocks();
  });

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

  describe("saveTransaction / getStoredTransaction — Happy Path", () => {
    it("saves and retrieves a paid card transaction", async () => {
      const tx = makeTx();
      await saveTransaction(tx);
      await expect(getStoredTransaction(tx.id)).resolves.toEqual(tx);
    });

    it("saves and retrieves a cash awaiting-confirmation transaction", async () => {
      const tx = makeTx({
        method: "cash",
        status: "awaiting-confirmation",
        confirmedAt: undefined,
      });
      await saveTransaction(tx);
      await expect(getStoredTransaction(tx.id)).resolves.toEqual(tx);
    });

    it("saves and retrieves an online awaiting-verification transaction", async () => {
      const tx = makeTx({
        method: "online",
        status: "awaiting-verification",
        confirmedAt: undefined,
      });
      await saveTransaction(tx);
      await expect(getStoredTransaction(tx.id)).resolves.toEqual(tx);
    });

    it("overwrites an existing transaction when saved again with the same id", async () => {
      const tx = makeTx({ status: "awaiting-confirmation" });
      const updated = { ...tx, status: "paid" as const, confirmedAt: new Date().toISOString() };

      await saveTransaction(tx);
      await saveTransaction(updated);

      await expect(getStoredTransaction(tx.id)).resolves.toMatchObject({ status: "paid" });
    });
  });

  describe("saveTransaction / getStoredTransaction — Sad Path", () => {
    it("returns null for a transaction ID that was never saved", async () => {
      await expect(getStoredTransaction("txn_does_not_exist")).resolves.toBeNull();
    });

    it("returns null after all transactions are cleared", async () => {
      const tx = makeTx();
      await saveTransaction(tx);
      await clearAllTransactions();
      await expect(getStoredTransaction(tx.id)).resolves.toBeNull();
    });
  });

  describe("isTransactionPending — Happy Path", () => {
    it("returns true for a cash awaiting-confirmation transaction", async () => {
      const tx = makeTx({ method: "cash", status: "awaiting-confirmation", confirmedAt: undefined });
      await saveTransaction(tx);
      await expect(isTransactionPending(tx.id)).resolves.toBe(true);
    });

    it("returns true for an online awaiting-verification transaction", async () => {
      const tx = makeTx({ method: "online", status: "awaiting-verification", confirmedAt: undefined });
      await saveTransaction(tx);
      await expect(isTransactionPending(tx.id)).resolves.toBe(true);
    });
  });

  describe("isTransactionPending — Sad Path", () => {
    it("returns false for a completed paid transaction", async () => {
      const tx = makeTx({ method: "card", status: "paid" });
      await saveTransaction(tx);
      await expect(isTransactionPending(tx.id)).resolves.toBe(false);
    });

    it("returns false for a failed transaction", async () => {
      const tx = makeTx({ status: "failed", confirmedAt: undefined });
      await saveTransaction(tx);
      await expect(isTransactionPending(tx.id)).resolves.toBe(false);
    });

    it("returns false for a transaction ID that does not exist", async () => {
      await expect(isTransactionPending("txn_ghost_000")).resolves.toBe(false);
    });
  });

  describe("simulatePaymentTransaction", () => {
    it("creates and persists a paid card transaction", async () => {
      const transaction = await simulatePaymentTransaction(
        "txn_card_1",
        "11111111-1111-4111-8111-111111111222",
        "monthly",
        499,
        "card"
      );

      expect(transaction.status).toBe("paid");
      expect(transaction.method).toBe("card");
      await expect(getStoredTransaction(transaction.id)).resolves.toMatchObject({
        status: "paid",
        method: "card",
      });
    });

    it("creates and persists a cash transaction awaiting confirmation", async () => {
      const transaction = await simulatePaymentTransaction(
        "txn_cash_1",
        "11111111-1111-4111-8111-111111111223",
        "monthly",
        499,
        "cash"
      );

      expect(transaction.status).toBe("awaiting-confirmation");
      await expect(getStoredTransaction(transaction.id)).resolves.toMatchObject({
        status: "awaiting-confirmation",
        method: "cash",
      });
    });
  });

  describe("simulateAdmin flows", () => {
    it("confirms a cash payment", async () => {
      const tx = makeTx({
        id: "txn_cash_confirm",
        userId: "11111111-1111-4111-8111-111111111224",
        method: "cash",
        status: "awaiting-confirmation",
        confirmedAt: undefined,
      });

      await saveTransaction(tx);
      const confirmed = await simulateAdminConfirmation(tx.id);

      expect(confirmed).not.toBeNull();
      expect(confirmed?.status).toBe("paid");
      await expect(getStoredTransaction(tx.id)).resolves.toMatchObject({ status: "paid" });
    });

    it("verifies an online payment", async () => {
      const tx = makeTx({
        id: "txn_online_verify",
        userId: "11111111-1111-4111-8111-111111111225",
        method: "online",
        status: "awaiting-verification",
        paymentProofStatus: "pending",
        confirmedAt: undefined,
      });

      await saveTransaction(tx);
      const verified = await verifyOnlinePayment(tx.id);

      expect(verified).not.toBeNull();
      expect(verified?.paymentProofStatus).toBe("verified");
      expect(verified?.status).toBe("paid");
    });

    it("rejects an online payment", async () => {
      const tx = makeTx({
        id: "txn_online_reject",
        userId: "11111111-1111-4111-8111-111111111226",
        method: "online",
        status: "awaiting-verification",
        paymentProofStatus: "pending",
        confirmedAt: undefined,
      });

      await saveTransaction(tx);
      const rejected = await rejectOnlinePayment(tx.id, "Photo unclear");

      expect(rejected).not.toBeNull();
      expect(rejected?.status).toBe("failed");
      expect(rejected?.rejectionReason).toBe("Photo unclear");
    });
  });
});
