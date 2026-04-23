import React from 'react';
import { useAdminPayments } from './AdminPaymentContext';
import type { PendingPayment } from '../../../types/payment';

export const AdminSummary: React.FC = () => {
  const { pendingPayments } = useAdminPayments();
  const totalAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalPending = pendingPayments.length;

  return (
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
  );
};

export const AdminRequestList: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pendingPayments } = useAdminPayments();

  if (pendingPayments.length === 0) {
    return (
      <div className="py-8 text-center">
        <svg className="h-12 w-12 mx-auto text-flexNavy/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 110-4h.01a2 2 0 110 4v1m6.168 1.832a2 2 0 002.21-2.012V6a2 2 0 10-2.22 2.007m0 0H18a2 2 0 100-4h-.01a2 2 0 00-2 2.007M6.168 4.832a2 2 0 002.21-2.012V6a2 2 0 10-2.22 2.007m0 0H6a2 2 0 100-4h-.01a2 2 0 00-2 2.007" />
        </svg>
        <p className="text-flexNavy/60 font-semibold">No Pending Payments</p>
        <p className="text-sm text-flexNavy/50 mt-1">All pending payments have been processed</p>
      </div>
    );
  }

  return (
    <div className="grid max-h-[600px] grid-cols-1 gap-3 overflow-y-auto lg:grid-cols-2">
      {children}
    </div>
  );
};

export const AdminPaymentCard: React.FC<{ payment: PendingPayment }> = ({ payment }) => {
  const { 
    userNameById, 
    membershipByUserId, 
    confirmingId, 
    decliningId, 
    setSelectedEvidenceUrl,
    handleConfirm,
    handleDecline,
    handleVerifyOnline,
    handleRejectOnline
  } = useAdminPayments();

  const isOnline = payment.method === "online";
  const membershipDetails = membershipByUserId[payment.userId] ?? null;
  const displayPlan = payment.userType === "walk-in" ? "Walk-In" : membershipDetails?.tier || payment.userType;
  const normalizedPlan = displayPlan.toLowerCase();

  const gradientByPlan = 
    normalizedPlan === "walk-in" ? "linear-gradient(135deg, #1d4ed8 0%, #001a4d 100%)" :
    normalizedPlan === "monthly" ? "linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)" :
    normalizedPlan === "semi-yearly" ? "linear-gradient(135deg, #1e3a8a 0%, #172554 100%)" :
    "linear-gradient(135deg, #172554 0%, #020617 100%)";

  const serialByPlan = 
    normalizedPlan === "walk-in" ? "FLX-001" :
    normalizedPlan === "monthly" ? "FLX-002" :
    normalizedPlan === "semi-yearly" ? "FLX-003" : "FLX-004";

  return (
    <div className="w-full rounded-2xl border border-[#0066CC]/20 bg-white/80 p-3 shadow-[0_6px_18px_rgba(0,51,102,0.08)] backdrop-blur-sm transition hover:border-[#0066CC]/35 sm:p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-[#00264D]/75">
            User: <span className="font-semibold text-[#003D7A]">{userNameById[payment.userId] || payment.userId}</span>
          </p>
          <p className="text-xs text-[#003D7A]/60">Requested: {new Date(payment.requestedAt).toLocaleString()}</p>
        </div>

        <div className="ml-auto flex shrink-0 items-start gap-2">
          {isOnline ? (
            <>
              <ActionButton 
                onClick={() => handleVerifyOnline(payment.transactionId, payment.userId, payment.userType)} 
                isLoading={confirmingId === payment.transactionId} 
                isDisabled={decliningId === payment.transactionId}
                label="Confirm"
                loadingLabel="Confirming..."
                variant="primary"
              />
              <ActionButton 
                onClick={() => handleRejectOnline(payment.transactionId, payment.userId, payment.userType)} 
                isLoading={decliningId === payment.transactionId} 
                isDisabled={confirmingId === payment.transactionId}
                label="Decline"
                loadingLabel="Declining..."
                variant="danger"
              />
            </>
          ) : (
            <>
              <ActionButton 
                onClick={() => handleConfirm(payment.transactionId, payment.userId, payment.userType)} 
                isLoading={confirmingId === payment.transactionId} 
                isDisabled={decliningId === payment.transactionId}
                label="Confirm"
                loadingLabel="Confirming..."
                variant="primary"
              />
              <ActionButton 
                onClick={() => handleDecline(payment.transactionId, payment.userId, payment.userType)} 
                isLoading={decliningId === payment.transactionId} 
                isDisabled={confirmingId === payment.transactionId}
                label="Decline"
                loadingLabel="Declining..."
                variant="danger"
              />
            </>
          )}
        </div>
      </div>

      <MembershipVisual plan={displayPlan} amount={payment.amount} gradient={gradientByPlan} serial={serialByPlan} />

      <section className="mb-4 space-y-3 rounded-2xl border border-[#0066CC]/15 bg-[#f8fbff] p-3">
        <EvidencePreview 
          label="Receipt proof" 
          url={payment.proofOfPaymentUrl} 
          emptyLabel="No proof photo yet." 
          onOpen={() => setSelectedEvidenceUrl(payment.proofOfPaymentUrl ?? null)} 
        />
        {payment.discountIdProofUrl && (
          <EvidencePreview 
            label="Discount ID proof" 
            url={payment.discountIdProofUrl} 
            isDiscount 
            onOpen={() => setSelectedEvidenceUrl(payment.discountIdProofUrl ?? null)} 
          />
        )}
      </section>
    </div>
  );
};

const ActionButton: React.FC<{ onClick: () => void; isLoading: boolean; isDisabled: boolean; label: string; loadingLabel: string; variant: 'primary' | 'danger' }> = ({ onClick, isLoading, isDisabled, label, loadingLabel, variant }) => (
  <button
    onClick={onClick}
    disabled={isLoading || isDisabled}
    className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold shadow-sm transition disabled:opacity-50 ${
      variant === 'primary' ? "bg-gradient-to-r from-[#0066CC] to-[#0099FF] text-white hover:brightness-105" : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
    }`}
  >
    {isLoading ? loadingLabel : label}
  </button>
);

const MembershipVisual: React.FC<{ plan: string; amount: number; gradient: string; serial: string }> = ({ plan, amount, gradient, serial }) => (
  <section className="mb-4 overflow-hidden rounded-2xl border border-white/10 shadow-lg">
    <div className="relative h-[118px] p-3" style={{ background: gradient }}>
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px)", backgroundSize: "12px 12px" }} />
      <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.18) 0%, transparent 50%)" }} />
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/45">Membership</p>
            <div className="mt-1 h-5 w-8 rounded-sm border border-yellow-600/30" style={{ background: "linear-gradient(135deg, #bf953f 0%, #fcf6ba 25%, #b38728 50%, #fbf5b7 75%, #aa771c 100%)" }} />
          </div>
          <div className="text-right">
            <p className="text-lg font-black italic leading-none text-white">{plan.toUpperCase()}</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/55">Flex Republic</p>
          </div>
        </div>
        <div>
          <p className="text-2xl font-black leading-none text-white">₱{amount.toLocaleString()}</p>
          <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/60">Flip for benefits • {serial}</p>
        </div>
      </div>
    </div>
  </section>
);

const EvidencePreview: React.FC<{ label: string; url?: string; emptyLabel?: string; isDiscount?: boolean; onOpen: () => void }> = ({ label, url, emptyLabel, isDiscount, onOpen }) => {
  if (isDiscount) {
    return (
      <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-[0_10px_24px_rgba(16,185,129,0.12)]">
        <div className="flex items-center justify-between gap-3 border-b border-emerald-100 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">{label}</p>
          <button type="button" onClick={onOpen} className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-700">Open</button>
        </div>
        <button type="button" onClick={onOpen} className="block w-full text-left">
          <img src={url} alt={label} className="h-56 w-full object-cover" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#003D7A]/60">{label}</p>
          <p className="text-xs text-[#00264D]/70">{url ? "Member upload here." : emptyLabel}</p>
        </div>
        {url && <button type="button" onClick={onOpen} className="rounded-full border border-[#0066CC]/20 bg-white px-3 py-1 text-[11px] font-semibold text-[#003D7A] transition hover:bg-[#EAF4FF]">Open</button>}
      </div>
      {url ? (
        <button type="button" onClick={onOpen} className="block w-full overflow-hidden rounded-xl border border-[#0066CC]/15 bg-white text-left">
          <img src={url} alt={label} className="h-48 w-full object-cover" />
        </button>
      ) : (
        <div className="rounded-xl border border-dashed border-[#0066CC]/20 bg-white px-4 py-8 text-center">
          <p className="text-sm font-semibold text-[#003D7A]">No receipt photo uploaded</p>
        </div>
      )}
    </div>
  );
};

export const AdminEvidenceModal: React.FC = () => {
  const { selectedEvidenceUrl, setSelectedEvidenceUrl } = useAdminPayments();
  if (!selectedEvidenceUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setSelectedEvidenceUrl(null)}>
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-slate-900">Photo proof</p>
            <p className="text-xs text-slate-500">Tap outside or close to shut it.</p>
          </div>
          <button type="button" onClick={() => setSelectedEvidenceUrl(null)} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-200">Close</button>
        </div>
        <div className="bg-slate-950">
          <img src={selectedEvidenceUrl} alt="Photo proof" className="max-h-[75vh] w-full object-contain" />
        </div>
      </div>
    </div>
  );
};
