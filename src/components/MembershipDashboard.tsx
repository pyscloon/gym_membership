import { useLocation } from "react-router-dom";
import { Membership } from "../design-patterns/compound-component/Membership";
import { useMembership } from "../design-patterns/compound-component/Membership/MembershipContext";
import AdminPaymentPanel from "./AdminPaymentPanel";
import PricingSection from "./PricingSection";
import WalkInCard from "./WalkInCard";
import { useWalkIn } from "../hooks/useWalkIn";

interface MembershipDashboardProps {
  changeMembershipTick?: number;
  freezeTick?: number;
}

/**
 * MembershipDashboard - Main hub for member interactions
 */
export default function MembershipDashboard(props: MembershipDashboardProps) {
  return (
    <Membership.Provider {...props}>
      <MembershipContent />
    </Membership.Provider>
  );
}

function MembershipContent() {
  const {
    loading,
    error,
    membership,
    isAdmin,
    handleAdminConfirmPayment,
    handleAdminDeclinePayment,
    handleAdminVerifyOnlinePayment,
    handleAdminRejectOnlinePayment,
    handleEndWalkInSession,
    actionLoading,
  } = useMembership();

  const location = useLocation();
  const { session: walkInSession } = useWalkIn();

  if (loading && location.pathname !== "/subscription-tier") return <Membership.Skeleton />;
  if (error && !membership && location.pathname !== "/subscription-tier") return <Membership.Error />;

  if (walkInSession && location.pathname !== "/subscription-tier") {
    return (
      <div className="p-6">
        <WalkInCard membership={walkInSession} onEndSession={handleEndWalkInSession} isLoading={actionLoading} />
      </div>
    );
  }

  // ── Freeze / Unfreeze Pending State ──

  const isFreezePending =
    membership?.status === "freeze_pending" ||
    membership?.status === "freeze-requested" ||
    membership?.status === "unfreeze-requested";

  const isUnfreezeRequested = membership?.status === "unfreeze-requested";

  if (isFreezePending && location.pathname !== "/subscription-tier") {
    return (
      <div className="space-y-6 p-6 pb-24 text-center">
        <div className={`rounded-2xl border p-12 shadow-sm ${
          isUnfreezeRequested
            ? "border-blue-200 bg-blue-50"
            : "border-flexNavy/15 bg-flexWhite"
        }`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            isUnfreezeRequested ? "bg-blue-100" : "bg-flexBlue/10"
          }`}>
            <svg
              className={`w-8 h-8 ${isUnfreezeRequested ? "text-blue-500" : "text-flexBlue"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isUnfreezeRequested ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              )}
            </svg>
          </div>
          <h3 className={`text-2xl font-black ${
            isUnfreezeRequested ? "text-blue-700" : "text-flexBlack"
          }`}>
            {isUnfreezeRequested ? "Unfreeze Request Submitted" : "Freeze Request Submitted"}
          </h3>
          <p className={`mt-2 text-sm max-w-xs mx-auto ${
            isUnfreezeRequested ? "text-blue-600/80" : "text-flexNavy/80"
          }`}>
            {isUnfreezeRequested
              ? "Your unfreeze request is waiting for admin approval. You'll be notified once your membership is reactivated."
              : "Your freeze request is waiting for admin approval. You'll be notified once it's confirmed."}
          </p>
          <div className={`mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest ${
            isUnfreezeRequested
              ? "bg-blue-100 text-blue-600"
              : "bg-flexBlue/10 text-flexNavy"
          }`}>
            <span className={`h-2 w-2 rounded-full animate-pulse ${
              isUnfreezeRequested ? "bg-blue-400" : "bg-flexBlue"
            }`} />
            Pending Admin Confirmation
          </div>
        </div>
        <Membership.Toasts />
      </div>
    );
  }

  if (location.pathname === "/subscription-tier") {
    return (
      <div className="space-y-4">
        <PricingSectionWrapper />
        <Membership.PaymentFlow />
      </div>
    );
  }

  if (!membership) {
    return (
      <div className="space-y-4 p-6">
        {isAdmin ? (
          <AdminPaymentPanel
            onConfirmPayment={handleAdminConfirmPayment}
            onDeclinePayment={handleAdminDeclinePayment}
            onVerifyOnlinePayment={handleAdminVerifyOnlinePayment}
            onRejectOnlinePayment={handleAdminRejectOnlinePayment}
          />
        ) : (
          <SubscriptionRedirect />
        )}
      </div>
    );
  }

  // ── Active Membership Dashboard ──
  const isExpired = membership.status === "expired";

  if (isExpired) {
    return (
      <div className="space-y-6 p-6 pb-24 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-12 shadow-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-2xl font-black text-red-700">Membership Expired</h3>
          <p className="mt-2 text-sm text-red-600/80 max-w-xs mx-auto">
            Your access has expired. Please visit the front desk or use the options below.
          </p>
        </div>
        <Membership.Toasts />
        <MembershipFAB />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 pb-24">
      <Membership.FreezeModal />
      <Membership.ChangePlanModal />
      <Membership.SessionScanModal />
      <Membership.PaymentFlow />
      <Membership.Toasts />
      <MembershipFAB />
    </div>
  );
}

function PricingSectionWrapper() {
  const { actionLoading, membership, handleApply, plans } = useMembership();
  return (
    <PricingSection
      plans={plans}
      isLoading={actionLoading}
      isSubscriberView={!!membership}
      currentTier={membership?.tier ?? null}
      onSelectPlan={(tier) => handleApply(tier as any)}
    />
  );
}

function SubscriptionRedirect() {
  return (
    <section className="rounded-2xl border border-flexNavy/15 bg-flexWhite/70 p-12 shadow-sm text-center">
      <div className="w-16 h-16 bg-flexBlue/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-flexBlue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <h3 className="text-2xl font-black text-[#071731]">No Active Membership</h3>
      <p className="mt-2 text-sm text-slate-600 max-w-xs mx-auto">
        You need an active plan to access gym features and track your progress.
      </p>
      <button
        onClick={() => (window.location.href = "/subscription-tier")}
        className="mt-6 px-8 py-3 bg-flexBlue text-white rounded-xl font-bold shadow-lg shadow-flexBlue/20 hover:-translate-y-0.5 transition-all"
      >
        Get Started Now
      </button>
    </section>
  );
}

function MembershipFAB() {
  const { handleOpenSessionScanFromFab, attendanceSessionContext } = useMembership();
  const isCheckedIn = attendanceSessionContext?.getStateName() === "checked-in";

  return (
    <button
      type="button"
      onClick={handleOpenSessionScanFromFab}
      aria-label={isCheckedIn ? "Open check-out QR" : "Open check-in QR"}
      data-testid="member-session-fab"
      className={`fixed z-[80] inline-flex h-16 w-16 items-center justify-center rounded-full text-white bottom-6 right-6 shadow-2xl transition-all hover:scale-110 active:scale-95 ${
        isCheckedIn
          ? "bg-gradient-to-br from-red-500 to-red-700 ring-4 ring-red-500/20"
          : "bg-gradient-to-br from-flexBlue to-blue-700 ring-4 ring-flexBlue/20"
      }`}
    >
      {isCheckedIn ? (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path d="M17 16l4-4m0 0l-4-4m4 4H7" />
        </svg>
      ) : (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path d="M12 4v16m8-8H4" />
        </svg>
      )}
    </button>
  );
}
