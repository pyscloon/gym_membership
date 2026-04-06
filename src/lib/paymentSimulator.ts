/**
 * Payment Simulator - Simulates async payment processing
 */

import type { PaymentTransaction, PaymentMethod, UserType } from "../types/payment";

// Simulate network delay (ms)
const PAYMENT_DELAY = 2000;
const ADMIN_CONFIRMATION_DELAY = 1000;

/**
 * Simulates an async payment transaction
 * For digital payments: immediate success
 * For cash and online: marks as awaiting-confirmation/verification
 */
export async function simulatePaymentTransaction(
  transactionId: string,
  userId: string,
  userType: UserType,
  amount: number,
  method: PaymentMethod,
  proofOfPayment?: string
): Promise<PaymentTransaction> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const transaction: PaymentTransaction = {
        id: transactionId,
        userId,
        userType,
        amount,
        method,
        status: (method === "cash" || method === "online") ? "awaiting-confirmation" : "paid",
        paymentProofStatus: method === "online" ? "pending" : undefined,
        proofOfPaymentUrl: proofOfPayment,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(method !== "cash" && method !== "online" && { confirmedAt: new Date().toISOString() }),
      };
      resolve(transaction);
    }, PAYMENT_DELAY);
  });
}

/**
 * Simulates admin confirmation of cash payment
 */
export async function simulateAdminConfirmation(
  transactionId: string
): Promise<PaymentTransaction | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const stored = getStoredTransaction(transactionId);
      if (stored && stored.method === "cash") {
        stored.status = "paid";
        stored.confirmedAt = new Date().toISOString();
        stored.updatedAt = new Date().toISOString();
        saveTransaction(stored);
        resolve(stored);
      } else {
        resolve(null);
      }
    }, ADMIN_CONFIRMATION_DELAY);
  });
}

/**
 * Simulates admin verification of online payment with photo proof
 */
export async function verifyOnlinePayment(
  transactionId: string
): Promise<PaymentTransaction | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const stored = getStoredTransaction(transactionId);
      if (stored && stored.method === "online") {
        stored.status = "paid";
        stored.paymentProofStatus = "verified";
        stored.confirmedAt = new Date().toISOString();
        stored.updatedAt = new Date().toISOString();
        saveTransaction(stored);
        resolve(stored);
      } else {
        resolve(null);
      }
    }, ADMIN_CONFIRMATION_DELAY);
  });
}

/**
 * Simulates admin rejection of online payment
 */
export async function rejectOnlinePayment(
  transactionId: string,
  reason: string
): Promise<PaymentTransaction | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const stored = getStoredTransaction(transactionId);
      if (stored && stored.method === "online") {
        stored.status = "failed";
        stored.paymentProofStatus = "rejected";
        stored.rejectionReason = reason;
        stored.updatedAt = new Date().toISOString();
        saveTransaction(stored);
        resolve(stored);
      } else {
        resolve(null);
      }
    }, ADMIN_CONFIRMATION_DELAY);
  });
}

/**
 * Local Storage Management
 */

const TRANSACTIONS_KEY = "gym_payment_transactions";

export function saveTransaction(transaction: PaymentTransaction): void {
  try {
    const transactions = getAllTransactions();
    const index = transactions.findIndex((t) => t.id === transaction.id);
    if (index >= 0) {
      transactions[index] = transaction;
    } else {
      transactions.push(transaction);
    }
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error("Failed to save transaction:", error);
  }
}

export function getStoredTransaction(transactionId: string): PaymentTransaction | null {
  try {
    const transactions = getAllTransactions();
    return transactions.find((t) => t.id === transactionId) || null;
  } catch (error) {
    console.error("Failed to retrieve transaction:", error);
    return null;
  }
}

export function getAllTransactions(): PaymentTransaction[] {
  try {
    const stored = localStorage.getItem(TRANSACTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to parse transactions:", error);
    return [];
  }
}

export function isTransactionPending(transactionId: string): boolean {
  const transaction = getStoredTransaction(transactionId);
  return (
    transaction?.status === "awaiting-confirmation" ||
    transaction?.status === "awaiting-verification" ||
    false
  );
}

export function clearAllTransactions(): void {
  try {
    localStorage.removeItem(TRANSACTIONS_KEY);
  } catch (error) {
    console.error("Failed to clear transactions:", error);
  }
}

/**
 * Generate unique transaction ID
 */
export function generateTransactionId(): string {
  return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
