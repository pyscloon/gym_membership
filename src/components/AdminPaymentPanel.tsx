import { AdminPayments } from "../design-patterns/compound-component/Admin";
import { useAdminPayments } from "../design-patterns/compound-component/Admin/AdminPaymentContext";
import type { UserType } from "../types/payment";

interface AdminPaymentPanelProps {
  onConfirmPayment: (transactionId: string, userId: string, userType: UserType) => Promise<void>;
  onDeclinePayment: (transactionId: string, userId: string, userType: UserType) => Promise<void>;
  onVerifyOnlinePayment?: (transactionId: string, userId: string, userType: UserType) => Promise<void>;
  onRejectOnlinePayment?: (transactionId: string, userId: string, userType: UserType, reason: string) => Promise<void>;
  onPendingCountChange?: (count: number) => void;
}

/**
 * AdminPaymentPanel - Admin interface for confirming pending cash/online payments
 * Refactored using the Compound Component Design Pattern.
 */
export default function AdminPaymentPanel(props: AdminPaymentPanelProps) {
  return (
    <AdminPayments.Provider {...props}>
      <AdminPaymentContent />
    </AdminPayments.Provider>
  );
}

/**
 * Inner content component to access context from AdminPayments.Provider
 */
function AdminPaymentContent() {
  const { pendingPayments } = useAdminPayments();

  return (
    <div className="space-y-6">
      {/* ── Summary ── */}
      <AdminPayments.Summary />
      
      {/* ── Requests List ── */}
      <AdminPayments.List>
        {pendingPayments.map((payment) => (
          <AdminPayments.Card key={payment.transactionId} payment={payment} />
        ))}
      </AdminPayments.List>

      {/* ── Evidence Viewer ── */}
      <AdminPayments.EvidenceModal />
    </div>
  );
}
