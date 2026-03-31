/**
 * usePayment Hook - Payment state management
 */

import { useCallback, useEffect, useReducer } from "react";
import type { PaymentState, PaymentTransaction, UserType, PaymentMethod, PendingPayment } from "../types/payment";
import {
  simulatePaymentTransaction,
  simulateAdminConfirmation,
  saveTransaction,
  getStoredTransaction,
  getAllTransactions,
  generateTransactionId,
} from "../lib/paymentSimulator";

type PaymentAction =
  | { type: "SET_STATUS"; status: PaymentState["status"] }
  | { type: "SET_TRANSACTION"; transaction: PaymentTransaction }
  | { type: "SET_ERROR"; error: string }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_PENDING_PAYMENTS"; payments: PendingPayment[] }
  | { type: "RESET" };

const initialState: PaymentState = {
  status: "idle",
  currentTransaction: null,
  error: null,
  pendingPayments: [],
};

function paymentReducer(state: PaymentState, action: PaymentAction): PaymentState {
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
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function usePayment(userId: string) {
  const [state, dispatch] = useReducer(paymentReducer, initialState);

  // Load pending payments on mount
  useEffect(() => {
    const pending = getAllTransactions()
      .filter((t) => t.status === "awaiting-confirmation" && t.userId === userId)
      .map<PendingPayment>((t) => ({
        transactionId: t.id,
        userId: t.userId,
        userType: t.userType,
        amount: t.amount,
        method: t.method,
        requestedAt: t.createdAt,
      }));
    dispatch({ type: "SET_PENDING_PAYMENTS", payments: pending });
  }, [userId]);

  const initializePayment = useCallback(
    async (
      paramUserId: string,
      userType: UserType,
      amount: number,
      method: PaymentMethod
    ) => {
      try {
        dispatch({ type: "SET_STATUS", status: "processing" });
        const transactionId = generateTransactionId();

        // Simulate payment processing
        const transaction = await simulatePaymentTransaction(
          transactionId,
          paramUserId,
          userType,
          amount,
          method
        );

        // Save to local storage
        saveTransaction(transaction);
        dispatch({ type: "SET_TRANSACTION", transaction });
        dispatch({ type: "SET_STATUS", status: transaction.status });

        // If cash payment, add to pending payments
        if (method === "cash") {
          const pending: PendingPayment = {
            transactionId: transaction.id,
            userId: paramUserId,
            userType,
            amount,
            method,
            requestedAt: transaction.createdAt,
          };
          dispatch({ type: "SET_PENDING_PAYMENTS", payments: [...state.pendingPayments, pending] });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Payment failed";
        dispatch({ type: "SET_ERROR", error: errorMsg });
      }
    },
    [state.pendingPayments]
  );

  const confirmPayment = useCallback(async (transactionId: string) => {
    try {
      const transaction = getStoredTransaction(transactionId);
      if (!transaction) {
        throw new Error("Transaction not found");
      }

      dispatch({ type: "SET_STATUS", status: "processing" });
      const confirmed = await simulateAdminConfirmation(transactionId);

      if (confirmed) {
        dispatch({ type: "SET_TRANSACTION", transaction: confirmed });
        dispatch({ type: "SET_STATUS", status: "paid" });

        // Remove from pending payments
        const updated = state.pendingPayments.filter(
          (p) => p.transactionId !== transactionId
        );
        dispatch({ type: "SET_PENDING_PAYMENTS", payments: updated });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Confirmation failed";
      dispatch({ type: "SET_ERROR", error: errorMsg });
    }
  }, [state.pendingPayments]);

  const failPayment = useCallback(
    async (transactionId: string, reason: string) => {
      try {
        const transaction = getStoredTransaction(transactionId);
        if (transaction) {
          transaction.status = "failed";
          transaction.failureReason = reason;
          transaction.updatedAt = new Date().toISOString();
          saveTransaction(transaction);
          dispatch({ type: "SET_TRANSACTION", transaction });
          dispatch({ type: "SET_STATUS", status: "failed" });
          // Remove from pending payments when declined/failed
          dispatch({
            type: "SET_PENDING_PAYMENTS",
            payments: state.pendingPayments.filter((p) => p.transactionId !== transactionId),
          });
          dispatch({
            type: "SET_ERROR",
            error: `Payment failed: ${reason}`,
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Error marking payment as failed";
        dispatch({ type: "SET_ERROR", error: errorMsg });
      }
    },
    []
  );

  const confirmCashPayment = useCallback((transactionId: string) => {
    // Trigger confirmation without await for real-time update
    confirmPayment(transactionId);
  }, [confirmPayment]);

  const getPendingPayments = useCallback(() => {
    return state.pendingPayments;
  }, [state.pendingPayments]);

  const getTransactionHistory = useCallback(() => {
    return getAllTransactions().filter((t) => t.userId === userId);
  }, [userId]);

  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  return {
    state,
    initializePayment,
    confirmPayment,
    failPayment,
    confirmCashPayment,
    getPendingPayments,
    getTransactionHistory,
    clearError,
  };
}
