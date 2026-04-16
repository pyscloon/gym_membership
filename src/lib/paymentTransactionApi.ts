import { supabase, supabaseConfig } from "./supabaseClient";
import type { PaymentMethod, UserType } from "../types/payment";

export const PAYMENT_TRANSACTIONS_FUNCTION = "payment-transactions";

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

  const edgeFunctionUrl = supabaseConfig.url
    ? `${supabaseConfig.url.replace(/\/$/, "")}/functions/v1/${PAYMENT_TRANSACTIONS_FUNCTION}`
    : "";

  const sessionResult = await supabase.auth.getSession?.();
  const accessToken = sessionResult?.data?.session?.access_token;

  const invokeDirect = async (): Promise<TResponse> => {
    if (!edgeFunctionUrl) {
      throw new Error("Supabase function URL missing");
    }

    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseConfig.anonKey ?? "",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const message = payload?.error || payload?.message || `Edge Function failed with ${response.status}`;
      throw new Error(message);
    }

    return payload as TResponse;
  };

  return invokeDirect();
}
