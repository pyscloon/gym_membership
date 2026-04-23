/**
 * PaymentConfirmation - Displays payment status after transaction
 */

import { useEffect, useRef, useState } from "react";
import type { PaymentTransaction, UserType, PaymentMethod } from "../types/payment";
import { PAYMENT_METHOD_LABELS } from "../types/payment";
import { supabase } from "../lib/supabaseClient";

interface PaymentConfirmationProps {
  transaction: PaymentTransaction | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export default function PaymentConfirmation({
  transaction: initialTransaction,
  isOpen,
  onClose,
  onComplete,
}: PaymentConfirmationProps) {
  const [transaction, setTransaction] = useState<PaymentTransaction | null>(initialTransaction);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync prop changes
  useEffect(() => {
    setTransaction(initialTransaction);
  }, [initialTransaction]);

  // Polling for updates
  useEffect(() => {
    if (!isOpen || !transaction || !supabase) return;

    const isAwaiting =
      transaction.status === "awaiting-confirmation" ||
      transaction.status === "awaiting-verification";

    if (!isAwaiting) return;

    const intervalId = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("id", transaction.id)
          .single();

        if (data && !error) {
          const updatedTx: PaymentTransaction = {
            id: data.id,
            userId: data.user_id,
            userType: data.user_type as UserType,
            amount: data.amount,
            method: data.method as PaymentMethod,
            status: data.status as PaymentTransaction["status"],
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            confirmedAt: data.confirmed_at ?? undefined,
            failureReason: data.failure_reason ?? undefined,
            proofOfPaymentUrl: data.proof_of_payment_url ?? undefined,
            discountIdProofUrl: data.discount_id_proof_url ?? undefined,
            paymentProofStatus: data.payment_proof_status as PaymentTransaction["paymentProofStatus"],
            rejectionReason: data.rejection_reason ?? undefined,
          };
          
          if (updatedTx.status !== transaction.status) {
            setTransaction(updatedTx);
          }
        }
      } catch (err) {
        // ignore polling errors
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [isOpen, transaction?.id, transaction?.status]);

  // Auto-close on paid
  useEffect(() => {
    if (isOpen && transaction?.status === "paid" && !autoCloseTimerRef.current) {
      // Auto-close after 5 seconds for successful payments
      const timer = setTimeout(() => {
        onClose();
        onComplete?.();
      }, 5000);
      autoCloseTimerRef.current = timer;

      return () => {
        if (timer) clearTimeout(timer);
        autoCloseTimerRef.current = null;
      };
    }
  }, [isOpen, transaction?.status, onClose, onComplete]);

  if (!isOpen || !transaction) return null;

  const isPaid = transaction.status === "paid";
  const isAwaiting = transaction.status === "awaiting-confirmation" || transaction.status === "awaiting-verification";
  const isFailed = transaction.status === "failed";

  const statusConfig = {
    paid: {
      icon: "✓",
      title: "Payment Successful",
      color: "bg-green-50 border-green-200",
      textColor: "text-green-800",
      iconBg: "bg-green-100 text-green-600",
    },
    "awaiting-confirmation": {
      icon: "⏳",
      title: "Awaiting Admin Confirmation",
      color: "bg-amber-50 border-amber-200",
      textColor: "text-amber-800",
      iconBg: "bg-amber-100 text-amber-600",
    },
    "awaiting-verification": {
      icon: "⏳",
      title: "Awaiting Payment Verification",
      color: "bg-purple-50 border-purple-200",
      textColor: "text-purple-800",
      iconBg: "bg-purple-100 text-purple-600",
    },
    failed: {
      icon: "✕",
      title: "Payment Failed",
      color: "bg-red-50 border-red-200",
      textColor: "text-red-800",
      iconBg: "bg-red-100 text-red-600",
    },
    processing: {
      icon: "⌚",
      title: "Processing",
      color: "bg-blue-50 border-blue-200",
      textColor: "text-blue-800",
      iconBg: "bg-blue-100 text-blue-600",
    },
    idle: {
      icon: "•",
      title: "Ready",
      color: "bg-gray-50 border-gray-200",
      textColor: "text-gray-800",
      iconBg: "bg-gray-100 text-gray-600",
    },
  };

  const config = statusConfig[transaction.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-2xl border p-6 shadow-xl sm:p-8 ${config.color}`}>
        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <div className={`h-16 w-16 rounded-full ${config.iconBg} flex items-center justify-center text-3xl`}>
            {config.icon}
          </div>
        </div>

        {/* Title */}
        <h2 className={`text-center text-2xl font-bold ${config.textColor} mb-2`}>
          {config.title}
        </h2>

        {/* Details */}
        <div className={`space-y-3 mb-6 ${config.textColor}`}>
          <div className="flex justify-between items-center text-sm">
            <span>Amount</span>
            <span className="font-semibold">₱{transaction.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span>Payment Method</span>
            <span className="font-semibold capitalize">
              {PAYMENT_METHOD_LABELS[transaction.method]}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span>Membership Tier</span>
            <span className="font-semibold capitalize">{transaction.userType}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span>Transaction ID</span>
            <span className="font-mono text-xs truncate">{transaction.id}</span>
          </div>
          {transaction.confirmedAt && (
            <div className="flex justify-between items-center text-sm">
              <span>Confirmed</span>
              <span className="font-semibold">
                {new Date(transaction.confirmedAt).toLocaleString()}
              </span>
            </div>
          )}
          {transaction.failureReason && (
            <div className="flex justify-between items-start text-sm">
              <span>Reason</span>
              <span className="font-semibold text-xs text-right">
                {transaction.failureReason}
              </span>
            </div>
          )}
        </div>

        {/* Status Message */}
        {transaction.status === "awaiting-confirmation" && (
          <div className={`mb-6 p-3 rounded-lg ${config.color} text-sm`}>
            <p className="font-semibold mb-1">What happens next?</p>
            <p className="text-xs">
              An admin will review your payment request and confirm it shortly. You'll receive a notification once confirmed.
            </p>
          </div>
        )}

        {transaction.status === "awaiting-verification" && (
          <div className={`mb-6 p-3 rounded-lg ${config.color} text-sm`}>
            <p className="font-semibold mb-1">Payment Under Review</p>
            <p className="text-xs">
              An admin will verify your payment proof and confirm it shortly. You'll receive a notification once verified.
            </p>
          </div>
        )}

        {isPaid && (
          <div className={`mb-6 p-3 rounded-lg ${config.color} text-sm`}>
            <p className="text-xs">
              Your payment has been successfully processed. Your membership is now active!
            </p>
          </div>
        )}

        {isFailed && (
          <div className={`mb-6 p-3 rounded-lg ${config.color} text-sm`}>
            <p className="text-xs">
              Your payment could not be processed. Please try again with a different payment method.
            </p>
          </div>
        )}

        {/* Loading spinner for awaiting confirmation/verification */}
        {isAwaiting && (
          <div className="mb-6 flex justify-center">
            <div className="relative h-8 w-8">
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-current animate-spin"></div>
            </div>
          </div>
        )}

        {/* Action Button */}
        {isPaid && (
          <button
            onClick={() => {
              onClose();
              onComplete?.();
            }}
            className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700"
          >
            Continue to Dashboard
          </button>
        )}

        {isAwaiting && (
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-amber-300 px-4 py-3 font-semibold text-amber-800 transition hover:bg-amber-100"
          >
            Close
          </button>
        )}

        {isFailed && (
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
