import { useNavigate } from "react-router-dom";
import AdminPaymentPanel from "../components/AdminPaymentPanel";
import { usePayment } from "../hooks/usePayment";
import type { UserType } from "../types/payment";
import { DataCard, FadeInSection, PageHeader } from "../components/ui";
import AppTopBar from "../components/ui/AppTopBar";

export default function PaymentPanel() {
  const navigate = useNavigate();
  const paymentHook = usePayment("admin");

  const handleConfirmPayment = async (transactionId: string, userId: string, userType: UserType) => {
    void userId;
    void userType;
    await paymentHook.confirmPayment(transactionId);
  };

  const handleDeclinePayment = async (transactionId: string, userId: string, userType: UserType) => {
    void userId;
    void userType;
    await paymentHook.failPayment(transactionId, "Declined from payment panel");
    navigate("/subscription-tier");
  };

  const handleVerifyOnlinePayment = async (transactionId: string, userId: string, userType: UserType) => {
    void userId;
    void userType;
    await paymentHook.verifyOnlinePaymentProof(transactionId);
  };

  const handleRejectOnlinePayment = async (
    transactionId: string,
    userId: string,
    userType: UserType,
    reason: string
  ) => {
    void userId;
    void userType;
    await paymentHook.rejectOnlinePaymentProof(transactionId, reason);
    navigate("/subscription-tier");
  };

  return (
    <div className="min-h-screen w-full bg-[#EEEEEE]">
      <AppTopBar />
      <main className="mx-auto w-full max-w-7xl px-6 pb-10 pt-28 sm:px-10 lg:px-14">
        <FadeInSection>
          <PageHeader
            eyebrow="Payment Review"
            title="Admin Payment Panel"
            subtitle="Review incoming transactions and apply membership changes with brand-consistent controls and motion."
          />
        </FadeInSection>

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
