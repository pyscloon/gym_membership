/**
 * AdminPaymentPanel - Admin interface for confirming pending cash payments
 */

import { useEffect, useState } from "react";
import type { PendingPayment, UserType } from "../types/payment";
import { supabase } from "../lib/supabaseClient";

type TransactionRow = {
  id: string;
  user_id: string;
  user_type: string;
  amount: number;
  method: string;
  status: string;
  proof_of_payment_url: string | null;
  discount_id_proof_url: string | null;
  created_at: string;
};

interface AdminPaymentPanelProps {
  onConfirmPayment: (transactionId: string, userId: string, userType: UserType) => Promise<void>;
  onDeclinePayment: (transactionId: string, userId: string, userType: UserType) => Promise<void>;
  onVerifyOnlinePayment?: (transactionId: string, userId: string, userType: UserType) => Promise<void>;
  onRejectOnlinePayment?: (transactionId: string, userId: string, userType: UserType, reason: string) => Promise<void>;
  onPendingCountChange?: (count: number) => void;
}

export default function AdminPaymentPanel({
  onConfirmPayment,
  onDeclinePayment,
  onVerifyOnlinePayment,
  onRejectOnlinePayment,
  onPendingCountChange,
}: AdminPaymentPanelProps) {
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<{ [key: string]: string }>({});

  // ✅ Now fetches from Supabase instead of localStorage
  useEffect(() => {
      const fetchPending = async () => {
        if (!supabase) return;

        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .in("status", ["awaiting-confirmation", "awaiting-verification"])
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Failed to fetch pending payments:", error);
          return;
        }

        const pending = (data as TransactionRow[]).map<PendingPayment>((t) => ({
          transactionId: t.id,
          userId: t.user_id,
          userType: t.user_type as UserType,
          amount: t.amount,
          method: t.method as PendingPayment["method"],
          requestedAt: t.created_at,
          proofOfPaymentUrl: t.proof_of_payment_url ?? undefined,
          discountIdProofUrl: t.discount_id_proof_url ?? undefined,
        }));

        setPendingPayments(pending);
        onPendingCountChange?.(pending.length);
      };

      fetchPending();
      const interval = setInterval(fetchPending, 2000);
      return () => clearInterval(interval);
    }, [refreshTrigger, onPendingCountChange]);

  const handleConfirm = async (transactionId: string, userId: string, userType: UserType) => {
    setConfirmingId(transactionId);
    try {
      await onConfirmPayment(transactionId, userId, userType);
      setTimeout(() => {
        setRefreshTrigger((prev) => prev + 1);
      }, 500);
    } catch (error) {
      console.error("Failed to confirm payment:", error);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDecline = async (transactionId: string, userId: string, userType: UserType) => {
    setDecliningId(transactionId);
    try {
      await onDeclinePayment(transactionId, userId, userType);
      setTimeout(() => {
        setRefreshTrigger((prev) => prev + 1);
      }, 500);
    } catch (error) {
      console.error("Failed to decline payment:", error);
    } finally {
      setDecliningId(null);
    }
  };

  const handleVerifyOnline = async (transactionId: string, userId: string, userType: UserType) => {
    setConfirmingId(transactionId);
    try {
      if (onVerifyOnlinePayment) {
        await onVerifyOnlinePayment(transactionId, userId, userType);
      }
      setTimeout(() => {
        setRefreshTrigger((prev) => prev + 1);
      }, 500);
    } catch (error) {
      console.error("Failed to verify online payment:", error);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleRejectOnline = async (transactionId: string, userId: string, userType: UserType) => {
    const reason = rejectionReason[transactionId] || "No reason provided";
    setDecliningId(transactionId);
    try {
      if (onRejectOnlinePayment) {
        await onRejectOnlinePayment(transactionId, userId, userType, reason);
      }
      setRejectionReason({ ...rejectionReason, [transactionId]: "" });
      setTimeout(() => {
        setRefreshTrigger((prev) => prev + 1);
      }, 500);
    } catch (error) {
      console.error("Failed to reject online payment:", error);
    } finally {
      setDecliningId(null);
    }
  };

  const totalPending = pendingPayments.length;
  const totalAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="mb-2">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-flexNavy/70">Total Pending</p>
            <p className="mt-1 text-2xl font-bold text-flexBlue">₱{totalAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-flexNavy/70">Payment Requests</p>
            <p className="mt-1 text-2xl font-bold text-flexNavy">{totalPending}</p>
          </div>
        </div>
      </div>

      {/* Pending Payments List */}
      {pendingPayments.length === 0 ? (
        <div className="py-8 text-center">
          <svg className="h-12 w-12 mx-auto text-flexNavy/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 110-4h.01a2 2 0 110 4v1m6.168 1.832a2 2 0 002.21-2.012V6a2 2 0 10-2.22 2.007m0 0H18a2 2 0 100-4h-.01a2 2 0 00-2 2.007M6.168 4.832a2 2 0 002.21-2.012V6a2 2 0 10-2.22 2.007m0 0H6a2 2 0 100-4h-.01a2 2 0 00-2 2.007" />
          </svg>
          <p className="text-flexNavy/60 font-semibold">No Pending Payments</p>
          <p className="text-sm text-flexNavy/50 mt-1">All pending payments have been processed</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {pendingPayments.map((payment) => {
            const isOnline = payment.method === "online";
            const paymentLabel =
              payment.method === "online"
                ? "Online Transfer"
                : payment.method === "card"
                  ? "Card"
                  : "Cash";
            const paymentProofKey = `${payment.transactionId}:payment-proof`;
            const discountIdKey = `${payment.transactionId}:discount-id`;
            const isPaymentProofVisible = selectedEvidenceId === paymentProofKey;
            const isDiscountIdVisible = selectedEvidenceId === discountIdKey;

            return (
              <div
                key={payment.transactionId}
                className="group relative overflow-hidden rounded-2xl border border-[#0066CC]/20 bg-gradient-to-br from-white/65 via-[#F5FAFF]/55 to-white/45 p-4 shadow-[0_8px_24px_rgba(0,51,102,0.08)] backdrop-blur-md transition hover:border-[#0066CC]/40 hover:shadow-[0_12px_32px_rgba(0,51,102,0.14)]"
              >
                <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#0099FF] via-[#0066CC] to-[#000033] opacity-70" />

                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <p className="text-sm font-bold uppercase tracking-wide text-[#000033]">
                        {payment.userType} Membership
                      </p>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${
                        isOnline
                          ? "bg-[#E8F2FF] text-[#005BB5]"
                          : "bg-[#FFF4DE] text-[#B77700]"
                      }`}>
                        {paymentLabel}
                      </span>
                    </div>
                    <p className="text-sm text-[#00264D]/75">
                      User ID: <span className="rounded bg-[#0066CC]/8 px-1.5 py-0.5 font-mono text-xs text-[#003D7A]">{payment.userId}</span>
                    </p>
                    <p className="mt-1 text-xs text-[#003D7A]/60">
                      Requested: {new Date(payment.requestedAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[28px] font-black leading-none text-[#005BB5] drop-shadow-[0_1px_0_rgba(255,255,255,0.7)]">
                      ₱{payment.amount.toLocaleString()}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[#003D7A]/65">Total</p>
                  </div>
                </div>

                {/* Transaction ID */}
                <p className="mb-4 rounded-lg border border-[#0066CC]/15 bg-white/45 p-2 text-xs font-mono text-[#003D7A]/70">
                  TXN: {payment.transactionId}
                </p>

                {/* Online Payment Photo Proof */}
                {isOnline && payment.proofOfPaymentUrl && (
                  <div className="mb-4">
                    {isPaymentProofVisible ? (
                      <div className="mb-3">
                        <img
                          src={payment.proofOfPaymentUrl}
                          alt="Payment proof"
                          className="w-full max-h-72 object-contain rounded-lg mb-3"
                        />
                        <button
                          onClick={() => setSelectedEvidenceId(null)}
                          className="text-xs text-flexNavy/60 hover:text-flexNavy underline"
                        >
                          Hide Photo
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedEvidenceId(paymentProofKey)}
                        className="text-xs text-purple-600 hover:text-purple-700 underline font-semibold mb-3"
                      >
                        View Payment Proof Photo →
                      </button>
                    )}
                  </div>
                )}

                {payment.discountIdProofUrl && (
                  <div className="mb-4">
                    {isDiscountIdVisible ? (
                      <div className="mb-3">
                        <img
                          src={payment.discountIdProofUrl}
                          alt="Discount ID proof"
                          className="w-full max-h-72 object-contain rounded-lg mb-3"
                        />
                        <button
                          onClick={() => setSelectedEvidenceId(null)}
                          className="text-xs text-flexNavy/60 hover:text-flexNavy underline"
                        >
                          Hide ID Photo
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedEvidenceId(discountIdKey)}
                        className="text-xs text-blue-600 hover:text-blue-700 underline font-semibold mb-3"
                      >
                        View Discount ID Photo
                      </button>
                    )}
                  </div>
                )}

                {/* Rejection Reason for Online */}
                {isOnline && (isPaymentProofVisible || isDiscountIdVisible) && (
                  <div className="mb-3">
                    <label className="text-xs font-semibold text-flexNavy block mb-1">
                      Rejection Reason (if rejecting)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Photo unclear, duplicate payment, etc."
                      value={rejectionReason[payment.transactionId] || ""}
                      onChange={(e) => setRejectionReason({
                        ...rejectionReason,
                        [payment.transactionId]: e.target.value,
                      })}
                      className="w-full text-xs px-2 py-1.5 rounded border border-flexNavy/20 focus:border-flexBlue focus:outline-none"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {isOnline ? (
                    <>
                      <button
                        onClick={() => handleVerifyOnline(payment.transactionId, payment.userId, payment.userType)}
                        disabled={confirmingId === payment.transactionId || decliningId === payment.transactionId}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0066CC] to-[#0099FF] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {confirmingId === payment.transactionId ? (
                          <>
                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Verifying...
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Verify Payment
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleRejectOnline(payment.transactionId, payment.userId, payment.userType)}
                        disabled={confirmingId === payment.transactionId || decliningId === payment.transactionId}
                        className="rounded-xl border border-red-200 bg-white/70 px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        {decliningId === payment.transactionId ? "Rejecting..." : "Reject"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleConfirm(payment.transactionId, payment.userId, payment.userType)}
                        disabled={confirmingId === payment.transactionId || decliningId === payment.transactionId}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0066CC] to-[#0099FF] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {confirmingId === payment.transactionId ? (
                          <>
                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Confirming...
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Confirm Payment
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDecline(payment.transactionId, payment.userId, payment.userType)}
                        disabled={confirmingId === payment.transactionId || decliningId === payment.transactionId}
                        className="rounded-xl border border-red-200 bg-white/70 px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        {decliningId === payment.transactionId ? "Declining..." : "Decline"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
