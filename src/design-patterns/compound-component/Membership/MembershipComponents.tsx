import React from 'react';
import { QRCodeSVG } from "qrcode.react";
import { useMembership } from './MembershipContext';
import PaymentModal from '../../../components/PaymentModal';
import PaymentConfirmation from '../../../components/PaymentConfirmation';

const TIER_LABELS: Record<string, string> = {
  monthly: "Monthly",
  "semi-yearly": "Semi-Yearly",
  yearly: "Yearly",
  "walk-in": "Walk-In",
};

export const MembershipStatus: React.FC = () => {
  const { membership, stats } = useMembership();
  if (!membership) return null;

  return (
    <section className="rounded-2xl border border-flexNavy/15 bg-flexWhite/60 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-flexNavy">Membership Status</p>
          <div className="mt-3 inline-flex items-center gap-2">
            <span className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold border ${
              membership.status === "active" ? "bg-green-100 text-green-700 border-green-200"
              : membership.status === "expired" ? "bg-red-100 text-red-700 border-red-200"
              : membership.status === "frozen" ? "bg-blue-100 text-blue-700 border-blue-200"
              : membership.status === "freeze-requested" ? "bg-amber-100 text-amber-700 border-amber-200"
              : "bg-yellow-100 text-yellow-700 border-yellow-200"
            }`}>
              {membership.status === "freeze-requested" ? "Freeze Requested" : membership.status.charAt(0).toUpperCase() + membership.status.slice(1)}
            </span>
            {stats?.isCanceled && (
              <span className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-200">Canceling</span>
            )}
            {stats?.isRenewalWindowOpen && !stats?.isCanceled && (
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">Renew Soon</span>
            )}
          </div>

          {membership.status === "freeze-requested" && (
            <p className="mt-2 text-xs text-amber-700">⏳ Freeze request pending admin approval.</p>
          )}
          {membership.status === "frozen" && membership.frozen_at && (
            <p className="mt-2 text-xs text-blue-700">❄️ Frozen since {new Date(membership.frozen_at).toLocaleDateString()}.</p>
          )}
        </div>

        <div className="text-right">
          {stats && !stats.isExpired && (
            <>
              <p className="text-sm text-flexNavy">
                <span className="font-semibold text-flexBlue">{stats.daysUntilRenewal}</span>{" "}
                days until {stats.isCanceled ? "expiration" : "renewal"}
              </p>
              <p className="mt-1 text-xs text-flexNavy/60">
                {stats.daysActive} days active • {TIER_LABELS[membership.tier]} plan
              </p>
            </>
          )}
          {stats?.isExpired && (
            <p className="text-sm text-red-600 font-semibold">Expired</p>
          )}
        </div>
      </div>
    </section>
  );
};

export const MembershipDetails: React.FC = () => {
  const { membership, stats } = useMembership();
  if (!membership) return null;

  return (
    <section className="rounded-2xl border border-flexNavy/15 bg-flexWhite/60 p-6">
      <p className="text-xs uppercase tracking-[0.18em] text-flexNavy mb-4">Details</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-flexNavy/60 uppercase tracking-wider">Plan</p>
          <p className="mt-2 font-semibold text-flexBlack capitalize">{TIER_LABELS[membership.tier]}</p>
        </div>
        <div>
          <p className="text-xs text-flexNavy/60 uppercase tracking-wider">Started</p>
          <p className="mt-2 font-semibold text-flexBlack">
            {new Date(membership.start_date).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-flexNavy/60 uppercase tracking-wider">{stats?.isCanceled ? "Expires" : "Renews"}</p>
          <p className="mt-2 font-semibold text-flexBlack">
            {new Date(membership.renewal_date).toLocaleDateString()}
          </p>
        </div>
      </div>
    </section>
  );
};

export const MembershipAccess: React.FC = () => {
  const { attendanceSessionContext, membershipStateContext, showQR, qrValue, qrActionType, handleGenerateCheckIn, handleGenerateCheckOut, handleCloseQR } = useMembership();

  return (
    <section className="rounded-2xl border border-flexNavy/15 bg-flexWhite/60 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-flexNavy">Gym Access</p>
          <p className="text-sm text-flexNavy/60 mt-0.5">{attendanceSessionContext?.getDescription()}</p>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
          attendanceSessionContext?.getStateName() === "checked-in"
            ? "bg-green-100 text-green-700 border-green-200"
            : "bg-flexNavy/10 text-flexNavy border-flexNavy/20"
        }`}>
          {attendanceSessionContext?.getStateName() === "idle" && "Not Checked In"}
          {attendanceSessionContext?.getStateName() === "checked-in" && "Checked In ✓"}
          {attendanceSessionContext?.getStateName() === "checked-out" && "Checked Out ✓"}
          {attendanceSessionContext?.getStateName() === "walk-in-active" && "Walk-In Active"}
          {attendanceSessionContext?.getStateName() === "walk-in-expired" && "Pass Expired"}
        </span>
      </div>

      {showQR ? (
        <div
          className="flex flex-col items-center gap-4 my-4 p-5 rounded-2xl bg-white border border-flexNavy/10 shadow-sm"
          data-testid="member-access-qr"
          data-qr-value={qrValue}
        >
          <p className="text-xs font-bold tracking-widest text-flexNavy uppercase">
            {qrActionType === "checkout" ? "CHECK-OUT QR" : "CHECK-IN QR"}
          </p>
          <div className="bg-white p-3 rounded-xl border border-flexNavy/10 shadow-sm">
            <QRCodeSVG value={qrValue} size={180} bgColor="#ffffff" fgColor="#0a0a2e" level="H" />
          </div>
          <button onClick={handleCloseQR} className="w-full rounded-xl bg-flexBlue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-flexNavy">✓ Done — Approved</button>
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          {attendanceSessionContext?.canPerformAction("checkIn") && membershipStateContext?.canPerformAction("checkIn") && (
            <button onClick={() => handleGenerateCheckIn()} className="w-full rounded-xl bg-gradient-to-r from-flexBlue to-[#1c8ee6] px-4 py-3 font-semibold text-white shadow-sm flex items-center justify-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
              Generate Check-In QR
            </button>
          )}
          {attendanceSessionContext?.canPerformAction("checkOut") && (
            <button onClick={() => handleGenerateCheckOut()} className="w-full rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-4 py-3 font-semibold text-white shadow-sm flex items-center justify-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
              Log Out Session
            </button>
          )}
        </div>
      )}
    </section>
  );
};

export const MembershipActions: React.FC = () => {
  const { membership, membershipStateContext, actionLoading, handleRenew, handleCancel, handleReactivate, handleApply, setShowFreezeModal } = useMembership();
  if (!membership) return null;

  return (
    <section className="grid gap-3 sm:grid-cols-2">
      {membershipStateContext?.canPerformAction("renew") && (
        <button onClick={handleRenew} disabled={actionLoading} className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:opacity-70">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          {actionLoading ? "Renewing..." : "Renew Membership"}
        </button>
      )}
      {membershipStateContext?.canPerformAction("cancel") && (
        <button onClick={handleCancel} disabled={actionLoading} className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-70">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
          {actionLoading ? "Canceling..." : "Cancel Membership"}
        </button>
      )}
      {membershipStateContext?.canPerformAction("reactivate") && (
        <button onClick={handleReactivate} disabled={actionLoading} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {actionLoading ? "Reactivating..." : "Reactivate Membership"}
        </button>
      )}
      {membershipStateContext?.canPerformAction("requestFreeze") && membership.tier !== "monthly" && membership.tier !== "walk-in" && (
        <button onClick={() => setShowFreezeModal(true)} disabled={actionLoading} className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-70">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" /></svg>
          {actionLoading ? "Submitting..." : "Request Freeze ❄️"}
        </button>
      )}
      {membershipStateContext?.getStateName() === "expired" && (
        <button onClick={() => handleApply("monthly")} disabled={actionLoading} className="flex items-center justify-center gap-2 rounded-xl bg-flexBlue px-4 py-3 font-semibold text-white transition hover:bg-flexBlue/90 disabled:opacity-70 sm:col-span-2">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
          {actionLoading ? "Applying..." : "Apply Again"}
        </button>
      )}
    </section>
  );
};

export const MembershipFreezeModal: React.FC = () => {
  const { showFreezeModal, setShowFreezeModal, handleRequestFreeze, actionLoading, membership } = useMembership();
  if (!showFreezeModal) return null;

  const isUnfreeze = membership?.status === "frozen";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#071731]/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-white/20 bg-white shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#f0f7ff] to-white px-6 py-5 border-b border-blue-100">
          <h4 className="text-lg font-black text-[#071731]">{isUnfreeze ? "Request Unfreeze" : "Request Freeze"}</h4>
        </div>
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-slate-700">Are you sure? An admin will review your request.</p>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <button onClick={() => setShowFreezeModal(false)} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold">Cancel</button>
          <button onClick={handleRequestFreeze} disabled={actionLoading} className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{actionLoading ? "Submitting..." : isUnfreeze ? "Yes, Request Unfreeze" : "Yes, Request Freeze"}</button>
        </div>
      </div>
    </div>
  );
};

export const MembershipPaymentFlow: React.FC = () => {
  const { showPaymentModal, setShowPaymentModal, selectedPlanTier, setSelectedPlanTier, handleInitiatePayment, showPaymentConfirmation, setShowPaymentConfirmation, currentTransaction, handlePaymentComplete, clearError } = useMembership();

  return (
    <>
      <PaymentModal
        isOpen={showPaymentModal}
        selectedUserType={selectedPlanTier}
        onSelectUserType={setSelectedPlanTier}
        onClose={() => { setShowPaymentModal(false); clearError(); }}
        onInitiatePayment={handleInitiatePayment}
        isLoading={false} // Managed by PaymentModal context now
        error={null}
        onClearError={clearError}
      />
      <PaymentConfirmation
        transaction={currentTransaction}
        isOpen={showPaymentConfirmation}
        onClose={() => setShowPaymentConfirmation(false)}
        onComplete={handlePaymentComplete}
      />
    </>
  );
};

export const MembershipToasts: React.FC = () => {
  const { toasts } = useMembership();
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div key={t.id} className={`rounded-lg px-4 py-3 text-sm font-medium text-white animate-in fade-in slide-in-from-bottom-4 ${t.type === "success" ? "bg-flexBlue" : "bg-red-600"}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
};

export const MembershipSkeleton: React.FC = () => (
  <div className="rounded-2xl border border-flexNavy/15 bg-flexWhite/60 p-6 animate-pulse">
    <div className="h-8 bg-flexNavy/10 rounded w-32 mb-4"></div>
    <div className="h-6 bg-flexNavy/10 rounded w-48"></div>
  </div>
);

export const MembershipError: React.FC = () => {
  const { error, loadMembership } = useMembership();
  if (!error) return null;
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
      <p className="font-semibold">Error loading membership</p>
      <p className="text-sm mt-1">{error}</p>
      <button onClick={loadMembership} className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">Retry</button>
    </div>
  );
};

export const MembershipSessionScanModal: React.FC = () => {
  const { showSessionScanModal, handleCloseSessionScanModal, sessionScanMode, showQR, qrValue, handleCloseQR } = useMembership();
  if (!showSessionScanModal) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6" style={{ backgroundColor: "#081223" }}>
      <div className="relative isolate w-full max-w-6xl rounded-3xl border border-[#d7e4f6] bg-white p-6 shadow-2xl">
        <button onClick={() => handleCloseSessionScanModal()}className="absolute right-4 top-4 rounded-full border border-[#b7c9e5] bg-white px-3 py-1 text-xs font-semibold text-[#1b5fb3]">Close</button>
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5">
          <p className="text-xl font-black tracking-[0.2em] text-[#1b5fb3] uppercase">{sessionScanMode === "checkout" ? "CHECK-OUT QR" : "CHECK-IN QR"}</p>
          <div
            className="rounded-3xl border border-[#c7d9ef] bg-[#f6f8fc] p-6 shadow-sm"
            data-testid="member-session-qr"
            data-qr-value={qrValue}
          >
            {showQR ? <QRCodeSVG value={qrValue} size={360} bgColor="#ffffff" fgColor="#111244" level="H" /> : <div className="flex h-[360px] w-[360px] items-center justify-center text-[#6b90c0]">Generating...</div>}
          </div>
          <button onClick={() => { handleCloseQR(); handleCloseSessionScanModal(true); }} className="w-full rounded-3xl bg-gradient-to-r from-[#1891e8] to-[#2f94de] px-6 py-4 text-xl font-semibold text-white shadow-lg">Admin Confirmed Scan</button>
        </div>
      </div>
    </div>
  );
};

export const MembershipChangePlanModal: React.FC = () => {
  const { 
    showChangeMembershipModal, 
    handleCloseChangeMembership, 
    handleConfirmMembershipChange, 
    pendingMembershipTier, 
    handleSelectMembershipTier, 
    membership,
    actionLoading,
    plans 
  } = useMembership();
  
  if (!showChangeMembershipModal) return null;

  const previewTier = pendingMembershipTier || membership?.tier || 'monthly';
  const previewPlan = plans.find(p => p.tier === previewTier) || plans[0];
  const otherPlans = plans.filter(p => p.tier !== membership?.tier);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071731]/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-6xl rounded-[32px] bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100">
          <div>
            <p className="text-xs font-bold text-flexBlue uppercase tracking-widest">Change Plan</p>
            <h4 className="text-2xl font-black text-[#071731]">Compare and Confirm</h4>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCloseChangeMembership} className="px-5 py-2 rounded-xl border border-slate-200 font-semibold">Cancel</button>
            <button 
              onClick={handleConfirmMembershipChange} 
              disabled={!pendingMembershipTier || pendingMembershipTier === membership?.tier || actionLoading}
              className="px-5 py-2 rounded-xl bg-flexBlue text-white font-semibold disabled:opacity-50"
            >
              {actionLoading ? "Processing..." : "Confirm Change"}
            </button>
          </div>
        </div>
        
        <div className="grid lg:grid-cols-2 flex-1 overflow-hidden">
          <div className="p-8 bg-slate-50 overflow-y-auto">
            <p className="text-xs font-bold text-flexBlue uppercase mb-4">Preview</p>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
               <p className="text-xs font-bold text-slate-400 uppercase">{previewPlan.badge}</p>
               <h5 className="text-2xl font-black text-[#071731] mt-1">{previewPlan.title}</h5>
               <p className="text-3xl font-black text-flexBlue mt-2">{previewPlan.amount}</p>
               <p className="text-sm text-slate-600 mt-4 leading-relaxed">{previewPlan.description}</p>
               <ul className="mt-6 space-y-3">
                 {previewPlan.features.map(f => (
                   <li key={f} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                     <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>
                     {f}
                   </li>
                 ))}
               </ul>
            </div>
          </div>
          
          <div className="p-8 overflow-y-auto">
            <p className="text-xs font-bold text-flexBlue uppercase mb-4">Select New Plan</p>
            <div className="space-y-3">
              {otherPlans.map(p => {
                const isSelected = pendingMembershipTier === p.tier;
                return (
                  <button 
                    key={p.tier} 
                    onClick={() => handleSelectMembershipTier(p.tier)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${isSelected ? 'border-flexBlue ring-2 ring-flexBlue/20 bg-flexBlue/5' : 'border-slate-100 hover:border-flexBlue/30'}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-bold text-flexBlue uppercase">{p.badge}</p>
                        <p className="font-black text-[#071731]">{p.title}</p>
                      </div>
                      <p className="font-black text-flexBlue">{p.amount}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
