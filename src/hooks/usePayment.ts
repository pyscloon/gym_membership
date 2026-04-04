import { useCallback, useEffect, useReducer } from "react";
import type {
  PaymentState,
  PaymentTransaction,
  UserType,
  PaymentMethod,
  PendingPayment,
} from "../types/payment";
import { supabase } from "../lib/supabaseClient";

// ─── DB row → frontend type mapper ───────────────────────────────────────────

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

function rowToTransaction(row: TransactionRow): PaymentTransaction {
  return {
    id: row.id,
    userId: row.user_id,
    userType: row.user_type as UserType,
    amount: row.amount,
    method: row.method as PaymentMethod,
    status: row.status as PaymentTransaction["status"],
    proofOfPaymentUrl: row.proof_of_payment_url ?? undefined,
    failureReason: row.failure_reason ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

type ExtendedPaymentState = PaymentState & {
  transactions: PaymentTransaction[];
};

type PaymentAction =
  | { type: "SET_STATUS"; status: PaymentState["status"] }
  | { type: "SET_TRANSACTION"; transaction: PaymentTransaction }
  | { type: "SET_ERROR"; error: string }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_PENDING_PAYMENTS"; payments: PendingPayment[] }
  | { type: "SET_TRANSACTIONS"; transactions: PaymentTransaction[] }
  | { type: "RESET" };

const initialState: ExtendedPaymentState = {
  status: "idle",
  currentTransaction: null,
  error: null,
  pendingPayments: [],
  transactions: [],
};

function paymentReducer(
  state: ExtendedPaymentState,
  action: PaymentAction
): ExtendedPaymentState {
  switch (action.type) {
    case "SET_STATUS":
      return { ...state, status: action.status };
    case "SET_TRANSACTION":
      return { ...state, currentTransaction: action.transaction };
    case "SET_ERROR":
      return { ...state, error: action.error, status: "failed" };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    case "SET_PENDING_PAYMENTS":
      return { ...state, pendingPayments: action.payments };
    case "SET_TRANSACTIONS":
      return { ...state, transactions: action.transactions };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePayment(userId: string) {
  const [state, dispatch] = useReducer(paymentReducer, initialState);

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Re-fetch all transactions from Supabase and sync state. */
  const refreshTransactions = useCallback(async () => {
    if (!supabase) return;

    const query = supabase.from("transactions").select("*").order("created_at", { ascending: false });

    // Admins see everything; regular users only see their own rows.
    if (userId !== "admin") {
      query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Failed to fetch transactions:", error);
      return;
    }

    const transactions = (data as TransactionRow[]).map(rowToTransaction);
    dispatch({ type: "SET_TRANSACTIONS", transactions });

    // Derive pending payments from the fresh data
    const pending: PendingPayment[] = transactions
      .filter(
        (t) =>
          (t.status === "awaiting-confirmation" || t.status === "awaiting-verification") &&
          (userId === "admin" || t.userId === userId)
      )
      .map((t) => ({
        transactionId: t.id,
        userId: t.userId,
        userType: t.userType,
        amount: t.amount,
        method: t.method,
        requestedAt: t.createdAt,
      }));
    dispatch({ type: "SET_PENDING_PAYMENTS", payments: pending });
  }, [userId]);

  /** Fetch a single transaction row by id. */
  const fetchTransaction = useCallback(
    async (transactionId: string): Promise<PaymentTransaction | null> => {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", transactionId)
        .single();

      if (error || !data) {
        console.error("Transaction not found:", error);
        return null;
      }
      return rowToTransaction(data as TransactionRow);
    },
    []
  );

  // ── On mount: load transactions ───────────────────────────────────────────

  useEffect(() => {
    refreshTransactions();
  }, [refreshTransactions]);

  // ── Actions ───────────────────────────────────────────────────────────────

const initializePayment = useCallback(
  async (
    paramUserId: string,
    userType: UserType,
    amount: number,
    method: PaymentMethod,
    proofOfPayment?: string  // base64 string coming in
  ) => {
    if (!supabase) return;
    try {
      dispatch({ type: "SET_STATUS", status: "processing" });

      // Upload proof image to Storage if provided
      let proofUrl: string | null = null;
      if (proofOfPayment && method === "online") {
        const base64Data = proofOfPayment.split(",")[1]; // strip data:image/...;base64,
        const mimeMatch = proofOfPayment.match(/data:(.*?);base64/);
        const mimeType = mimeMatch?.[1] ?? "image/jpeg";
        const extension = mimeType.split("/")[1] ?? "jpg";
        const fileName = `proof_${paramUserId}_${Date.now()}.${extension}`;

        const byteCharacters = atob(base64Data);
        const byteArray = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArray[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteArray], { type: mimeType });

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("payment-proofs") // create this bucket in Supabase
          .upload(fileName, blob, { contentType: mimeType, upsert: false });

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        const { data: urlData } = supabase.storage
          .from("payment-proofs")
          .getPublicUrl(uploadData.path);
        proofUrl = urlData.publicUrl;
      }

      const initialStatus =
        method === "cash"
          ? "awaiting-confirmation"
          : method === "online"
          ? "awaiting-verification"
          : "paid";

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: paramUserId,
          user_type: userType,
          amount,
          method,
          status: initialStatus,
          proof_of_payment_url: proofUrl,
          payment_proof_status: proofUrl ? "pending" : null,
        })
        .select()
        .single();

      if (error || !data) throw new Error(error?.message ?? "Insert failed");

      const transaction = rowToTransaction(data as TransactionRow);
      dispatch({ type: "SET_TRANSACTION", transaction });
      dispatch({ type: "SET_STATUS", status: transaction.status });

      await refreshTransactions();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Payment failed";
      dispatch({ type: "SET_ERROR", error: errorMsg });
    }
  },
  [refreshTransactions]
);

  const confirmPayment = useCallback(
    async (transactionId: string) => {
      if (!supabase) return;
      try {
        dispatch({ type: "SET_STATUS", status: "processing" });

        const { data, error } = await supabase
          .from("transactions")
          .update({
            status: "paid",
            confirmed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", transactionId)
          .select()
          .single();

        if (error || !data) throw new Error(error?.message ?? "Confirm failed");

        const transaction = rowToTransaction(data as TransactionRow);
        dispatch({ type: "SET_TRANSACTION", transaction });
        dispatch({ type: "SET_STATUS", status: "paid" });

        await refreshTransactions();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Confirmation failed";
        dispatch({ type: "SET_ERROR", error: errorMsg });
      }
    },
    [refreshTransactions]
  );

  const failPayment = useCallback(
    async (transactionId: string, reason: string) => {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from("transactions")
          .update({
            status: "failed",
            failure_reason: reason,
            updated_at: new Date().toISOString(),
          })
          .eq("id", transactionId)
          .select()
          .single();

        if (error || !data) throw new Error(error?.message ?? "Fail update failed");

        const transaction = rowToTransaction(data as TransactionRow);
        dispatch({ type: "SET_TRANSACTION", transaction });
        dispatch({ type: "SET_ERROR", error: `Payment failed: ${reason}` });

        await refreshTransactions();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Error marking payment as failed";
        dispatch({ type: "SET_ERROR", error: errorMsg });
      }
    },
    [refreshTransactions]
  );

  const confirmCashPayment = useCallback(
    (transactionId: string) => {
      confirmPayment(transactionId);
    },
    [confirmPayment]
  );

  const verifyOnlinePaymentProof = useCallback(
    async (transactionId: string) => {
      if (!supabase) return;
      try {
        dispatch({ type: "SET_STATUS", status: "processing" });

        const { data, error } = await supabase
          .from("transactions")
          .update({
            status: "paid",
            payment_proof_status: "verified",
            confirmed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", transactionId)
          .select()
          .single();

        if (error || !data) throw new Error(error?.message ?? "Verify failed");

        const transaction = rowToTransaction(data as TransactionRow);
        dispatch({ type: "SET_TRANSACTION", transaction });
        dispatch({ type: "SET_STATUS", status: "paid" });

        await refreshTransactions();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Verification failed";
        dispatch({ type: "SET_ERROR", error: errorMsg });
      }
    },
    [refreshTransactions]
  );

  const rejectOnlinePaymentProof = useCallback(
    async (transactionId: string, reason: string) => {
      if (!supabase) return;
      try {
        dispatch({ type: "SET_STATUS", status: "processing" });

        const { data, error } = await supabase
          .from("transactions")
          .update({
            status: "failed",
            payment_proof_status: "rejected",
            rejection_reason: reason,
            updated_at: new Date().toISOString(),
          })
          .eq("id", transactionId)
          .select()
          .single();

        if (error || !data) throw new Error(error?.message ?? "Reject failed");

        const transaction = rowToTransaction(data as TransactionRow);
        dispatch({ type: "SET_TRANSACTION", transaction });
        dispatch({ type: "SET_STATUS", status: "failed" });

        await refreshTransactions();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Rejection failed";
        dispatch({ type: "SET_ERROR", error: errorMsg });
      }
    },
    [refreshTransactions]
  );

  const getPendingPayments = useCallback(() => {
    return state.pendingPayments;
  }, [state.pendingPayments]);

  /** Returns all loaded transactions from state (already filtered by userId on fetch). */
  const getTransactionHistory = useCallback(() => {
    return state.transactions;
  }, [state.transactions]);

  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  return {
    state,
    initializePayment,
    confirmPayment,
    failPayment,
    confirmCashPayment,
    verifyOnlinePaymentProof,
    rejectOnlinePaymentProof,
    getPendingPayments,
    getTransactionHistory,
    refreshTransactions,
    clearError,
  };
}