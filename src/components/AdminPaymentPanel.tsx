/**
 * AdminPaymentPanel - Admin interface for confirming pending cash payments
 */

import { useEffect, useState } from "react";
import type { PendingPayment, UserType } from "../types/payment";
import { getAllTransactions } from "../lib/paymentSimulator";

interface AdminPaymentPanelProps {
  onConfirmPayment: (transactionId: string, userId: string, userType: UserType) => Promise<void>;
  onDeclinePayment: (transactionId: string, userId: string, userType: UserType) => Promise<void>;
}

export default function AdminPaymentPanel({
  onConfirmPayment,
  onDeclinePayment,
}: AdminPaymentPanelProps) {
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Poll for pending payments every 2 seconds
  useEffect(() => {
    const updatePending = () => {
      const transactions = getAllTransactions();
      const pending = transactions
        .filter((t) => t.status === "awaiting-confirmation" && t.method === "cash")
        .map<PendingPayment>((t) => ({
          transactionId: t.id,
          userId: t.userId,
          userType: t.userType,
          amount: t.amount,
          method: t.method,
          requestedAt: t.createdAt,
        }));
      setPendingPayments(pending);
    };

    updatePending();
    const interval = setInterval(updatePending, 2000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  const handleConfirm = async (transactionId: string, userId: string, userType: UserType) => {
    setConfirmingId(transactionId);
    try {
      await onConfirmPayment(transactionId, userId, userType);
      // Trigger refresh after confirmation
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

  const totalPending = pendingPayments.length;
  const totalAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="rounded-2xl border border-flexNavy/15 bg-flexWhite/60 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-flexNavy font-semibold">Admin Dashboard</p>
          <h3 className="text-2xl font-bold text-flexNavy mt-2">Pending Payments</h3>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-flexBlue">{totalPending}</p>
          <p className="text-xs text-flexNavy/60 uppercase tracking-wider mt-1">Awaiting Confirmation</p>
        </div>
      </div>

      {/* Summary Stats */}
      {totalPending > 0 && (
        <div className="mb-6 rounded-lg bg-flexBlue/8 p-4 border border-flexBlue/25">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-flexNavy/70">Total Pending</p>
              <p className="text-2xl font-bold text-flexBlue mt-1">₱{totalAmount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-flexNavy/70">Payment Requests</p>
              <p className="text-2xl font-bold text-flexNavy mt-1">{totalPending}</p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Payments List */}
      {pendingPayments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-flexNavy/20 p-8 text-center">
          <svg className="h-12 w-12 mx-auto text-flexNavy/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 110-4h.01a2 2 0 110 4v1m6.168 1.832a2 2 0 002.21-2.012V6a2 2 0 10-2.22 2.007m0 0H18a2 2 0 100-4h-.01a2 2 0 00-2 2.007M6.168 4.832a2 2 0 002.21-2.012V6a2 2 0 10-2.22 2.007m0 0H6a2 2 0 100-4h-.01a2 2 0 00-2 2.007" />
          </svg>
          <p className="text-flexNavy/60 font-semibold">No Pending Payments</p>
          <p className="text-sm text-flexNavy/50 mt-1">All cash payments have been confirmed</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {pendingPayments.map((payment) => (
            <div
              key={payment.transactionId}
              className="rounded-xl border border-flexNavy/15 bg-white p-4 hover:border-flexBlue/35 transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-flexNavy capitalize">
                      {payment.userType} Membership
                    </p>
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                      Cash
                    </span>
                  </div>
                  <p className="text-sm text-flexNavy/70">
                    User ID: <span className="font-mono text-xs">{payment.userId}</span>
                  </p>
                  <p className="text-xs text-flexNavy/50 mt-1">
                    Requested: {new Date(payment.requestedAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-flexBlue">
                    ₱{payment.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-flexNavy/60 mt-1">Total</p>
                </div>
              </div>

              {/* Transaction ID */}
              <p className="text-xs text-flexNavy/50 mb-4 font-mono bg-flexNavy/5 p-2 rounded">
                TXN: {payment.transactionId}
              </p>

              {/* Membership Note */}
              <p className="text-xs text-blue-600 mb-3">
                Accepting this payment will activate a <strong>{payment.userType}</strong> membership for user <strong>{payment.userId}</strong>.
              </p>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleConfirm(payment.transactionId, payment.userId, payment.userType)}
                  disabled={confirmingId === payment.transactionId || decliningId === payment.transactionId}
                  className="flex-1 rounded-lg bg-green-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {confirmingId === payment.transactionId ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
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
                  className="rounded-lg border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  {decliningId === payment.transactionId ? "Declining..." : "Decline"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-6 rounded-lg bg-blue-50 p-4 border border-blue-200 text-sm text-blue-800">
        <p className="font-semibold mb-1">💡 Admin Tip</p>
        <p className="text-xs">
          This panel automatically refreshes every 2 seconds to show new payment requests. Payment confirmations are processed in real-time and instantly visible to users.
        </p>
      </div>
    </div>
  );
}
