import { supabase } from "./supabaseClient";
import type { PaymentMethod, UserType } from "../types/payment";

export const PAYMENT_TRANSACTIONS_FUNCTION = "payment-transactions";

type FunctionsClient = {
  invoke: (
    name: string,
    options?: { body?: PaymentTransactionAction; headers?: Record<string, string> }
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export type PaymentTransactionAction =
  | {
      action: "submit";
      userType: UserType;
      amount: number;
      method: PaymentMethod;
      proofOfPayment?: string;
      discountIdProof?: string;
    }
  | {
      action: "list_pending";
    }
  | {
      action: "confirm_cash" | "verify_online" | "reject_online" | "fail_payment";
      transactionId: string;
      reason?: string;
    };

export async function invokePaymentTransactions<TResponse>(
  body: PaymentTransactionAction
): Promise<TResponse> {
  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }

  const functions = (supabase as { functions?: FunctionsClient }).functions;
  if (!functions?.invoke) {
    throw new Error("Supabase functions client not available");
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw new Error(sessionError.message || "Unable to read current auth session");
  }

  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error("You must be signed in before performing payment actions");
  }

  const { data, error } = await functions.invoke(PAYMENT_TRANSACTIONS_FUNCTION, {
    body
  });

  if (error) {
    const statusCode = (error as { context?: { status?: number } })?.context?.status;
    if (statusCode === 403) {
      throw new Error("Forbidden: your account is not allowed to perform this payment action");
    }
    throw new Error(error.message || "Payment action failed");
  }

  return data as TResponse;
}