/**
 * Payment System Types - Comprehensive type definitions for payments
 */

import type { MembershipTier } from "./membership";

export type PaymentMethod = "cash" | "card" | "online";

export type PaymentStatus = "idle" | "processing" | "awaiting-confirmation" | "awaiting-verification" | "paid" | "failed";

export type UserType = MembershipTier;

export interface PaymentTransaction {
  id: string;
  userId: string;
  userType: UserType;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  failureReason?: string;
  // Online payment proof
  proofOfPaymentUrl?: string; // base64 encoded image
  paymentProofStatus?: "pending" | "verified" | "rejected";
  rejectionReason?: string;
}

export interface PendingPayment {
  transactionId: string;
  userId: string;
  userType: UserType;
  amount: number;
  method: PaymentMethod;
  requestedAt: string;
  confirmedAt?: string;
}

export interface PaymentState {
  status: PaymentStatus;
  currentTransaction: PaymentTransaction | null;
  error: string | null;
  pendingPayments: PendingPayment[];
}

export interface PaymentContextType {
  state: PaymentState;
  initializePayment: (
    userId: string,
    userType: UserType,
    amount: number,
    method: PaymentMethod
  ) => Promise<void>;
  confirmPayment: (transactionId: string) => Promise<void>;
  failPayment: (transactionId: string, reason: string) => Promise<void>;
  confirmCashPayment: (transactionId: string) => void;
  getPendingPayments: () => PendingPayment[];
  getTransactionHistory: () => PaymentTransaction[];
  clearError: () => void;
}

// Price mapping for membership tiers
export const MEMBERSHIP_PRICES: Record<UserType, number> = {
  monthly: 499,
  "semi-yearly": 699,
  annual: 1199,
  "walk-in": 60,
};

// Display labels for payment methods
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash (Admin Confirmation Required)",
  card: "Card",
  online: "Online Transfer (Photo Proof Required)",
};
