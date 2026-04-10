/**
 * Payment Simulator - Simulates async payment processing
 */

import type { PaymentMethod, PaymentTransaction, UserType } from "../types/payment";
import { supabase } from "./supabaseClient";

// Simulate network delay (ms)
const PAYMENT_DELAY = 2000;
const ADMIN_CONFIRMATION_DELAY = 1000;
const TRANSACTIONS_TABLE = "transactions";
const GUEST_USER_ID = "00000000-0000-0000-0000-000000000000";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type TransactionRow = {
  id: string;
  user_id: string;
  user_type: string;
  amount: number;
  method: string;
  status: string;
  payment_proof_status: string | null;
  proof_of_payment_url: string | null;
  discount_id_proof_url: string | null;
  rejection_reason: string | null;
  failure_reason: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

function transactionToRow(transaction: PaymentTransaction): TransactionRow {
  return {
    id: transaction.id,
    user_id: UUID_PATTERN.test(transaction.userId) ? transaction.userId : GUEST_USER_ID,
    user_type: transaction.userType,
    amount: transaction.amount,
    method: transaction.method === "card" ? "online" : transaction.method,
    status: transaction.status,
    payment_proof_status: transaction.paymentProofStatus ?? null,
    proof_of_payment_url: transaction.proofOfPaymentUrl ?? null,
    discount_id_proof_url: transaction.discountIdProofUrl ?? null,
    rejection_reason: transaction.rejectionReason ?? null,
    failure_reason: transaction.failureReason ?? null,
    confirmed_at: transaction.confirmedAt ?? null,
    created_at: transaction.createdAt,
    updated_at: transaction.updatedAt,
  };
}

function rowToTransaction(row: TransactionRow): PaymentTransaction {
  const isGuest = row.user_id === GUEST_USER_ID;
  const isCardPayment =
    row.method === "online" &&
    row.payment_proof_status === null &&
    row.proof_of_payment_url === null &&
    row.status === "paid";

  return {
    id: row.id,
    userId: isGuest ? "guest" : row.user_id,
    userType: row.user_type as UserType,
    amount: row.amount,
    method: (isCardPayment ? "card" : row.method) as PaymentMethod,
    status: row.status as PaymentTransaction["status"],
    paymentProofStatus:
      row.payment_proof_status === null
        ? undefined
        : (row.payment_proof_status as PaymentTransaction["paymentProofStatus"]),
    proofOfPaymentUrl: row.proof_of_payment_url ?? undefined,
    discountIdProofUrl: row.discount_id_proof_url ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    failureReason: row.failure_reason ?? undefined,
    confirmedAt: row.confirmed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function upsertTransaction(transaction: PaymentTransaction): Promise<PaymentTransaction | null> {
  if (!supabase) {
    console.error("Supabase is not configured.");
    return null;
  }

  const { data, error } = await supabase
    .from(TRANSACTIONS_TABLE)
    .upsert(transactionToRow(transaction), { onConflict: "id" })
    .select("*")
    .single();

  if (error || !data) {
    console.error("Failed to save transaction:", error);
    return null;
  }

  return rowToTransaction(data as TransactionRow);
}

async function fetchTransaction(transactionId: string): Promise<PaymentTransaction | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(TRANSACTIONS_TABLE)
    .select("*")
    .eq("id", transactionId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("Failed to retrieve transaction:", error);
    }
    return null;
  }

  return rowToTransaction(data as TransactionRow);
}

async function fetchAllTransactionsFromDb(): Promise<PaymentTransaction[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(TRANSACTIONS_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch transactions:", error);
    return [];
  }

  return (data ?? []).map((row: unknown) => rowToTransaction(row as TransactionRow));
}

async function deleteAllTransactionsFromDb(): Promise<void> {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from(TRANSACTIONS_TABLE).delete().neq("id", "");
  if (error) {
    console.error("Failed to clear transactions:", error);
  }
}

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
  await sleep(PAYMENT_DELAY);

  const now = new Date().toISOString();
  const status =
    method === "cash"
      ? "awaiting-confirmation"
      : method === "online"
        ? "awaiting-verification"
        : "paid";

  const transaction: PaymentTransaction = {
    id: transactionId,
    userId,
    userType,
    amount,
    method,
    status,
    paymentProofStatus: method === "online" ? "pending" : undefined,
    proofOfPaymentUrl: proofOfPayment,
    createdAt: now,
    updatedAt: now,
    ...(status === "paid" && { confirmedAt: now }),
  };

  const saved = await saveTransaction(transaction);
  return saved ?? transaction;
}

/**
 * Simulates admin confirmation of cash payment
 */
export async function simulateAdminConfirmation(
  transactionId: string
): Promise<PaymentTransaction | null> {
  await sleep(ADMIN_CONFIRMATION_DELAY);

  const stored = await getStoredTransaction(transactionId);
  if (stored && stored.method === "cash") {
    stored.status = "paid";
    stored.confirmedAt = new Date().toISOString();
    stored.updatedAt = new Date().toISOString();
    return saveTransaction(stored);
  }

  return null;
}

/**
 * Simulates admin verification of online payment with photo proof
 */
export async function verifyOnlinePayment(
  transactionId: string
): Promise<PaymentTransaction | null> {
  await sleep(ADMIN_CONFIRMATION_DELAY);

  const stored = await getStoredTransaction(transactionId);
  if (stored && stored.method === "online") {
    stored.status = "paid";
    stored.paymentProofStatus = "verified";
    stored.confirmedAt = new Date().toISOString();
    stored.updatedAt = new Date().toISOString();
    return saveTransaction(stored);
  }

  return null;
}

/**
 * Simulates admin rejection of online payment
 */
export async function rejectOnlinePayment(
  transactionId: string,
  reason: string
): Promise<PaymentTransaction | null> {
  await sleep(ADMIN_CONFIRMATION_DELAY);

  const stored = await getStoredTransaction(transactionId);
  if (stored && stored.method === "online") {
    stored.status = "failed";
    stored.paymentProofStatus = "rejected";
    stored.rejectionReason = reason;
    stored.updatedAt = new Date().toISOString();
    return saveTransaction(stored);
  }

  return null;
}

/**
 * Supabase persistence
 */

export async function saveTransaction(
  transaction: PaymentTransaction
): Promise<PaymentTransaction | null> {
  const saved = await upsertTransaction(transaction);
  return saved;
}

export async function getStoredTransaction(
  transactionId: string
): Promise<PaymentTransaction | null> {
  return fetchTransaction(transactionId);
}

export async function getAllTransactions(): Promise<PaymentTransaction[]> {
  return fetchAllTransactionsFromDb();
}

export async function isTransactionPending(transactionId: string): Promise<boolean> {
  const transaction = await getStoredTransaction(transactionId);
  return (
    transaction?.status === "awaiting-confirmation" ||
    transaction?.status === "awaiting-verification" ||
    false
  );
}

export async function clearAllTransactions(): Promise<void> {
  await deleteAllTransactionsFromDb();
}

/**
 * Generate unique transaction ID
 */
export function generateTransactionId(): string {
  return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
