/**
 * Payment System Types - Comprehensive type definitions for payments
 */

import type { MembershipTier } from "./membership";
import { AccessFactory } from "../design-patterns";

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
  discountIdProofUrl?: string;
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
  proofOfPaymentUrl?: string;
  discountIdProofUrl?: string;
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
const monthlyAccess = AccessFactory.create_access("monthly");
const semiYearlyAccess = AccessFactory.create_access("semi-yearly");
const yearlyAccess = AccessFactory.create_access("yearly");

export const MEMBERSHIP_PRICES: Record<UserType, number> = {
  monthly: monthlyAccess.get_price(),
  "semi-yearly": semiYearlyAccess.get_price(),
  yearly: yearlyAccess.get_price(),
  "walk-in": 60,
};

// Display labels for payment methods
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash (Admin Confirmation Required)",
  card: "Card",
  online: "Online Transfer (Photo Proof Required)",
};
