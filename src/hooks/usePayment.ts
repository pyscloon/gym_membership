import { useCallback, useEffect, useReducer } from "react";
import type {
  PaymentState,
  PaymentTransaction,
  UserType,
  PaymentMethod,
  PendingPayment,
} from "../types/payment";
import { supabase } from "../lib/supabaseClient";
import { usePaymentState } from "../design-patterns/state/useStatePatterns";
import { invokePaymentTransactions } from "../lib/paymentTransactionApi";

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

function rowToTransaction(row: TransactionRow): PaymentTransaction {
  return {
    id: row.id,
    userId: row.user_id,
    userType: row.user_type as UserType,
    amount: row.amount,
    method: row.method as PaymentMethod,
    status: row.status as PaymentTransaction["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    confirmedAt: row.confirmed_at ?? undefined,
    failureReason: row.failure_reason ?? undefined,
    proofOfPaymentUrl: row.proof_of_payment_url ?? undefined,
    discountIdProofUrl: row.discount_id_proof_url ?? undefined,
    paymentProofStatus: row.payment_proof_status as PaymentTransaction["paymentProofStatus"],
    rejectionReason: row.rejection_reason ?? undefined,
  };
}

type PaymentDataState = Omit<PaymentState, "status"> & {
  transactions: PaymentTransaction[];
};

type PaymentAction =
  | { type: "SET_TRANSACTION"; transaction: PaymentTransaction | null }
  | { type: "SET_ERROR"; error: string }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_PENDING_PAYMENTS"; payments: PendingPayment[] }
  | { type: "SET_TRANSACTIONS"; transactions: PaymentTransaction[] }
  | { type: "RESET" };

const initialState: PaymentDataState = {
  currentTransaction: null,
  error: null,
  pendingPayments: [],
  transactions: [],
};

function paymentReducer(state: PaymentDataState, action: PaymentAction): PaymentDataState {
  switch (action.type) {
    case "SET_TRANSACTION":
      return { ...state, currentTransaction: action.transaction };
    case "SET_ERROR":
      return { ...state, error: action.error };
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

export function usePayment(userId?: string) {
  const [state, dispatch] = useReducer(paymentReducer, initialState);
  const paymentLifecycle = usePaymentState();

  const commitTransaction = useCallback(
    (transaction: PaymentTransaction) => {
      dispatch({ type: "SET_TRANSACTION", transaction });
      paymentLifecycle.hydrate(transaction.status, {
        failureReason: transaction.failureReason,
        rejectionReason: transaction.rejectionReason,
      });
    },
    [paymentLifecycle]
  );

  const restoreLifecycle = useCallback(
    (transaction: PaymentTransaction | null) => {
      if (!transaction) {
        paymentLifecycle.hydrate("idle");
        return;
      }

      paymentLifecycle.hydrate(transaction.status, {
        failureReason: transaction.failureReason,
        rejectionReason: transaction.rejectionReason,
      });
    },
    [paymentLifecycle]
  );

  const refreshTransactions = useCallback(async () => {
    if (!supabase) return;
    if (!userId || userId === "") return;

    let query = supabase.from("transactions").select("*").order("created_at", { ascending: false });

    if (userId !== "admin") {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Failed to fetch transactions:", error);
      return;
    }

    const transactions = (data as TransactionRow[]).map(rowToTransaction);
    dispatch({ type: "SET_TRANSACTIONS", transactions });

    const pending: PendingPayment[] = transactions
      .filter(
        (transaction) =>
          (transaction.status === "awaiting-confirmation" ||
            transaction.status === "awaiting-verification") &&
          (userId === "admin" || transaction.userId === userId)
      )
      .map((transaction) => ({
        transactionId: transaction.id,
        userId: transaction.userId,
        userType: transaction.userType,
        amount: transaction.amount,
        method: transaction.method,
        requestedAt: transaction.createdAt,
        proofOfPaymentUrl: transaction.proofOfPaymentUrl,
      }));

    dispatch({ type: "SET_PENDING_PAYMENTS", payments: pending });
  }, [userId]);

  const fetchTransaction = useCallback(async (transactionId: string): Promise<PaymentTransaction | null> => {
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
  }, []);

  useEffect(() => {
    if (!userId) return;
    refreshTransactions();
  }, [refreshTransactions, userId]);

  const hydrateTransactionState = useCallback(
    async (transactionId: string) => {
      const transaction = await fetchTransaction(transactionId);
      if (!transaction) {
        throw new Error("Transaction not found");
      }

      restoreLifecycle(transaction);
      return transaction;
    },
    [fetchTransaction, restoreLifecycle]
  );

  const initializePayment = useCallback(
    async (
      _paramUserId: string,
      userType: UserType,
      amount: number,
      method: PaymentMethod,
      proofOfPayment?: string,
      discountIdProof?: string
    ): Promise<PaymentTransaction | null> => {
      if (!supabase) return null;

      try {
        dispatch({ type: "SET_TRANSACTION", transaction: null });
        paymentLifecycle.hydrate("idle");
        paymentLifecycle.initiate();
        const { transaction: submittedTransaction } = await invokePaymentTransactions<{ transaction: TransactionRow }>({
          action: "submit",
          userType,
          amount,
          method,
          proofOfPayment,
          discountIdProof,
        });

        const transaction = rowToTransaction(submittedTransaction);
        commitTransaction(transaction);

        await refreshTransactions();
        return transaction;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Payment failed";
        paymentLifecycle.hydrate("failed", { failureReason: errorMsg });
        dispatch({ type: "SET_TRANSACTION", transaction: null });
        dispatch({ type: "SET_ERROR", error: errorMsg });
        return null;
      }
    },
    [commitTransaction, paymentLifecycle, refreshTransactions]
  );

  const confirmPayment = useCallback(
    async (transactionId: string) => {
      if (!supabase) return;

      let originalTransaction: PaymentTransaction | null = null;

      try {
        paymentLifecycle.hydrate("processing");
        originalTransaction = await hydrateTransactionState(transactionId);

        if (!paymentLifecycle.state.canPerformAction("confirm")) {
          throw new Error(`Cannot confirm payment while in ${paymentLifecycle.state.getStateName()} state`);
        }

        paymentLifecycle.confirm();

        const { transaction: updatedTransaction } = await invokePaymentTransactions<{ transaction: TransactionRow }>({
          action: "confirm_cash",
          transactionId,
        });

        const transaction = rowToTransaction(updatedTransaction);
        commitTransaction(transaction);

        await refreshTransactions();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Confirmation failed";
        restoreLifecycle(originalTransaction);
        dispatch({ type: "SET_TRANSACTION", transaction: originalTransaction });
        dispatch({ type: "SET_ERROR", error: errorMsg });
      }
    },
    [commitTransaction, hydrateTransactionState, paymentLifecycle, refreshTransactions, restoreLifecycle]
  );

  const failPayment = useCallback(
    async (transactionId: string, reason: string) => {
      if (!supabase) return;

      let originalTransaction: PaymentTransaction | null = null;

      try {
        paymentLifecycle.hydrate("processing");
        originalTransaction = await hydrateTransactionState(transactionId);

        paymentLifecycle.fail(reason);

        const { transaction: updatedTransaction } = await invokePaymentTransactions<{ transaction: TransactionRow }>({
          action: "fail_payment",
          transactionId,
          reason,
        });

        const transaction = rowToTransaction(updatedTransaction);
        commitTransaction(transaction);

        await refreshTransactions();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Error marking payment as failed";
        restoreLifecycle(originalTransaction);
        dispatch({ type: "SET_TRANSACTION", transaction: originalTransaction });
        dispatch({ type: "SET_ERROR", error: errorMsg });
      }
    },
    [commitTransaction, hydrateTransactionState, paymentLifecycle, refreshTransactions, restoreLifecycle]
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

      let originalTransaction: PaymentTransaction | null = null;

      try {
        paymentLifecycle.hydrate("processing");
        originalTransaction = await hydrateTransactionState(transactionId);

        if (!paymentLifecycle.state.canPerformAction("confirm")) {
          throw new Error(`Cannot verify payment while in ${paymentLifecycle.state.getStateName()} state`);
        }

        paymentLifecycle.confirm();

        const { transaction: updatedTransaction } = await invokePaymentTransactions<{ transaction: TransactionRow }>({
          action: "verify_online",
          transactionId,
        });

        const transaction = rowToTransaction(updatedTransaction);
        commitTransaction(transaction);

        await refreshTransactions();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Verification failed";
        restoreLifecycle(originalTransaction);
        dispatch({ type: "SET_TRANSACTION", transaction: originalTransaction });
        dispatch({ type: "SET_ERROR", error: errorMsg });
      }
    },
    [commitTransaction, hydrateTransactionState, paymentLifecycle, refreshTransactions, restoreLifecycle]
  );

  const rejectOnlinePaymentProof = useCallback(
    async (transactionId: string, reason: string) => {
      if (!supabase) return;

      let originalTransaction: PaymentTransaction | null = null;

      try {
        paymentLifecycle.hydrate("processing");
        originalTransaction = await hydrateTransactionState(transactionId);

        if (!paymentLifecycle.state.canPerformAction("reject")) {
          throw new Error(`Cannot reject payment while in ${paymentLifecycle.state.getStateName()} state`);
        }

        paymentLifecycle.reject(reason);

        const { transaction: updatedTransaction } = await invokePaymentTransactions<{ transaction: TransactionRow }>({
          action: "reject_online",
          transactionId,
          reason,
        });

        const transaction = rowToTransaction(updatedTransaction);
        commitTransaction(transaction);

        await refreshTransactions();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Rejection failed";
        restoreLifecycle(originalTransaction);
        dispatch({ type: "SET_TRANSACTION", transaction: originalTransaction });
        dispatch({ type: "SET_ERROR", error: errorMsg });
      }
    },
    [commitTransaction, hydrateTransactionState, paymentLifecycle, refreshTransactions, restoreLifecycle]
  );

  const getPendingPayments = useCallback(() => {
    return state.pendingPayments;
  }, [state.pendingPayments]);

  const getTransactionHistory = useCallback(() => {
    return state.transactions;
  }, [state.transactions]);

  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  const paymentState: PaymentState = {
    status: paymentLifecycle.state.getStateName() as PaymentState["status"],
    currentTransaction: state.currentTransaction,
    error: state.error,
    pendingPayments: state.pendingPayments,
  };

  return {
    state: paymentState,
    initializePayment,
    confirmPayment,
    failPayment,
    confirmCashPayment,
    verifyOnlinePaymentProof,
    rejectOnlinePaymentProof,
    getPendingPayments,
    getTransactionHistory,
    fetchTransaction,
    refreshTransactions,
    clearError,
  };
}
