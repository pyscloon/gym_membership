import { useNavigate } from "react-router-dom";
import AdminPaymentPanel from "../components/AdminPaymentPanel";
import { getStoredTransaction, rejectOnlinePayment, saveTransaction, simulateAdminConfirmation, verifyOnlinePayment } from "../lib/paymentSimulator";
import { applyMembership, changeMembership, fetchUserMembership, renewMembership } from "../lib/membershipService";
import type { UserType, PaymentTransaction } from "../types/payment";
import { recordConfirmedWalkIn } from "../lib/checkInService";
import { DataCard, FadeInSection, PageHeader } from "../components/ui";
import AppTopBar from "../components/ui/AppTopBar";


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
    <div className="min-h-screen w-full bg-[#EEEEEE]">
      <AppTopBar />
      <main className="mx-auto w-full max-w-7xl px-6 pb-10 pt-28 sm:px-10 lg:px-14">
        {/* Section 1 — Payment Panel Header */}
        <FadeInSection>
          <PageHeader
            eyebrow="Payment Review"
            title="Admin Payment Panel"
            subtitle="Review incoming transactions and apply membership changes with brand-consistent controls and motion."
          />
        </FadeInSection>

        {/* Section 2 — Payment Review Panel */}
        <DataCard>
          <AdminPaymentPanel
            onConfirmPayment={handleConfirmPayment}
            onDeclinePayment={handleDeclinePayment}
            onVerifyOnlinePayment={handleVerifyOnlinePayment}
            onRejectOnlinePayment={handleRejectOnlinePayment}
          />
        </DataCard>
      </main>
    </div>
  );
}
