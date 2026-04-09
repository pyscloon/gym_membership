import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import AdminPaymentPanel from "../components/AdminPaymentPanel";
import { getStoredTransaction, rejectOnlinePayment, saveTransaction, simulateAdminConfirmation, verifyOnlinePayment } from "../lib/paymentSimulator";
import { applyMembership, changeMembership, fetchUserMembership, renewMembership } from "../lib/membershipService";
import type { UserType, PaymentTransaction } from "../types/payment";
import { recordConfirmedWalkIn } from "../lib/checkInService";


export default function PaymentPanel() {
  const navigate = useNavigate();

  const handleConfirmPayment = async (transactionId: string, _userId: string, _userType: UserType) => {
    const confirmed = await simulateAdminConfirmation(transactionId);
    if (!confirmed) return;

      if (confirmed.userType === "walk-in") {
      const result = await recordConfirmedWalkIn(
        "admin",
        `txn:${transactionId}`
      );
      if (!result.success) {
        console.error("Failed to record walk-in:", result.error);
      }
      return;
    }

    const currentMembership = await fetchUserMembership(confirmed.userId);
    const result = currentMembership?.status === "active"
      ? currentMembership.tier === confirmed.userType
        ? await renewMembership(confirmed.userId)
        : await changeMembership(confirmed.userId, confirmed.userType)
      : await applyMembership(confirmed.userId, confirmed.userType);

    if (!result.success) {
      console.error("Failed to apply membership after confirmation:", result.error);
    }
  };

  const handleDeclinePayment = async (transactionId: string, _userId: string, _userType: UserType) => {
    const existing = await getStoredTransaction(transactionId);
    if (existing) {
      existing.status = "failed";
      existing.failureReason = "Declined from payment panel";
      existing.updatedAt = new Date().toISOString();
      await saveTransaction(existing as PaymentTransaction);
    }
    navigate("/subscription-tier");
  };

  const handleVerifyOnlinePayment = async (transactionId: string, _userId: string, _userType: UserType) => {
    await verifyOnlinePayment(transactionId);

    if (_userType === "walk-in") {
      await recordConfirmedWalkIn("admin", `txn:${transactionId}`);
    }
  };

  const handleRejectOnlinePayment = async (transactionId: string, _userId: string, _userType: UserType, reason: string) => {
    await rejectOnlinePayment(transactionId, reason);
    navigate("/subscription-tier");
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-[#f0f7ff] to-[#e3f2fd]">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-6 py-10 sm:px-10 lg:px-14">
        <section className="mb-8 rounded-3xl bg-gradient-to-br from-[#000033] via-[#0a2d5c] to-[#1a4d8a] px-8 py-10 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-flexBlue">Payment Review</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Admin Payment Panel</h1>
          <p className="mt-3 max-w-3xl text-white/85">
            Your payment request has been submitted here so the admin can confirm, decline, verify, or reject it.
          </p>
        </section>

        <AdminPaymentPanel
          onConfirmPayment={handleConfirmPayment}
          onDeclinePayment={handleDeclinePayment}
          onVerifyOnlinePayment={handleVerifyOnlinePayment}
          onRejectOnlinePayment={handleRejectOnlinePayment}
        />
      </main>
    </div>
  );
}
