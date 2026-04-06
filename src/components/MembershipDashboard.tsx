import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks";
import { useWalkIn } from "../hooks/useWalkIn";
import { usePayment } from "../hooks/usePayment";
import {
  applyMembership,
  cancelMembership,
  changeMembership,
  fetchUserMembership,
  renewMembership,
  reactivateMembership,
} from "../lib/membershipService";
import {
  type Membership,
  type MembershipTier,
  calculateMembershipStats,
} from "../types/membership";
import { type PaymentTransaction, type UserType } from "../types/payment";
import {
  MembershipStateContext,
  AttendanceSessionContext,
} from "../design-patterns";
import AdminPaymentPanel from "./AdminPaymentPanel";
import PricingSection from "./PricingSection";
import WalkInCard from "./WalkInCard";
import PaymentConfirmation from "./PaymentConfirmation";
import PaymentModal from "./PaymentModal";
import activeIconGif from "../assets/Active icon.gif";
import { MEMBERSHIP_PRICES } from "../types/payment";
import { generateTransactionId, saveTransaction } from "../lib/paymentSimulator";

type Toast = {
  id: string;
  message: string;
  type: "success" | "error";
};

const TIER_LABELS: Record<MembershipTier, string> = {
  monthly: "Monthly",
  "semi-yearly": "Semi-Yearly",
  yearly: "Yearly",
  "walk-in": "Walk-In",
};

export default function MembershipDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { session: walkInSession, startSession: startWalkIn, clearSession: clearWalkIn } = useWalkIn();
  const paymentHook = usePayment(user?.id || "");
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [isDev] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [devShowMembership, setDevShowMembership] = useState(false);
  
  // State machine contexts - trigger re-render when state changes
  const [, setStateUpdateTrigger] = useState(0);
  const [membershipStateContext, setMembershipStateContext] = useState<MembershipStateContext | null>(null);
  const [attendanceSessionContext, setAttendanceSessionContext] = useState<AttendanceSessionContext | null>(
    () => new AttendanceSessionContext("regular")
  );

  // Payment state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlanTier, setSelectedPlanTier] = useState<UserType>("monthly");
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [completedTransactionId, setCompletedTransactionId] = useState<string | null>(null);
  const [guestTransaction, setGuestTransaction] = useState<PaymentTransaction | null>(null);
  const [sessionStage, setSessionStage] = useState<"idle" | "ready" | "checked-in">("idle");
  const [showCheckInConfirmation, setShowCheckInConfirmation] = useState(false);
  const [showChangeMembershipModal, setShowChangeMembershipModal] = useState(false);
  const [pendingMembershipTier, setPendingMembershipTier] = useState<MembershipTier | null>(null);
  const [renewalPaymentTier, setRenewalPaymentTier] = useState<MembershipTier | null>(null);

  const displayMembership = membership;
  const displayStats = displayMembership ? calculateMembershipStats(displayMembership) : null;
  const isSubscribedUser = Boolean(displayMembership && displayMembership.status === "active");

  const toggleAdminView = () => {
    setIsAdmin(!isAdmin);
  };

  const addToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const loadMembership = useCallback(async () => {
    if (!user) {
      setMembership(null);
      setMembershipStateContext(null);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const userMembership = await fetchUserMembership(user.id);
      setMembership(userMembership);
      // Initialize membership state context with the loaded membership
      if (userMembership) {
        setMembershipStateContext(new MembershipStateContext(userMembership));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load membership";
      console.error("Error loading membership:", err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    loadMembership();
  }, [loadMembership]);

  useEffect(() => {
    if (!showCheckInConfirmation) return;

    const timeoutId = window.setTimeout(() => {
      setShowCheckInConfirmation(false);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showCheckInConfirmation]);

  // QR changes based on attendance state
  const qrValue = JSON.stringify({
    id: user?.id,
    type: attendanceSessionContext?.getStateName() === "checked-in" ? "checkout" : "checkin",
    tier: displayMembership?.tier,
    timestamp: new Date().toISOString(),
  });

  const handleGenerateCheckIn = () => {
    if (location.pathname === "/dashboard" && isSubscribedUser) {
      setShowQR(true);
      addToast("Check-in QR generated! Show this to the admin.", "success");
      return;
    }

    // Check if membership allows check-in
    if (membershipStateContext?.canPerformAction("checkIn")) {
      attendanceSessionContext?.checkIn();
      setShowQR(true);
      setStateUpdateTrigger((prev) => prev + 1);
      addToast("Check-in QR generated! Show this to the admin.", "success");
    } else {
      addToast("Your membership status doesn't allow check-in", "error");
    }
  };

  const handleGenerateCheckOut = () => {
    // Check if session allows check-out
    if (attendanceSessionContext?.canPerformAction("checkOut")) {
      setShowQR(true);
      setStateUpdateTrigger((prev) => prev + 1);
      addToast("Check-out QR generated! Show this to the admin.", "success");
    } else {
      addToast("You must check in first before checking out", "error");
    }
  };

  const handleCloseQR = () => {
    if (location.pathname === "/dashboard" && isSubscribedUser) {
      setShowQR(false);
      setSessionStage("checked-in");
      setShowCheckInConfirmation(true);
      addToast("Check-in approved. Session is active.", "success");
      return;
    }

    setShowQR(false);
    const currentState = attendanceSessionContext?.getStateName();
    if (currentState === "checked-in") {
      attendanceSessionContext?.checkOut();
      addToast("Checked out successfully! See you next time!", "success");
    }
    setStateUpdateTrigger((prev) => prev + 1);
  };

  const handleOpenChangeMembership = () => {
    if (!displayMembership) return;

    setShowPaymentModal(false);
    setShowPaymentConfirmation(false);
    setPendingMembershipTier(null);
    setShowChangeMembershipModal(true);
  };

  const handleSelectMembershipTier = (tier: MembershipTier) => {
    setPendingMembershipTier(tier);
  };

  const handleConfirmMembershipChange = async () => {
    if (!user || !displayMembership || !pendingMembershipTier || pendingMembershipTier === displayMembership.tier) {
      return;
    }

    setSelectedPlanTier(pendingMembershipTier);
    setRenewalPaymentTier(pendingMembershipTier);
    setShowChangeMembershipModal(false);
    setPendingMembershipTier(null);
    paymentHook.clearError();
    setShowPaymentModal(true);
  };

  const handleCloseChangeMembership = () => {
    setShowChangeMembershipModal(false);
    setPendingMembershipTier(null);
    paymentHook.clearError();
  };

  const handleApply = useCallback(async (tier: MembershipTier = "monthly") => {
    if (!user) return;
    setActionLoading(true);
    const result = await applyMembership(user.id, tier);
    if (result.success && result.data) {
      addToast(`Successfully applied for ${tier} membership!`, "success");
      setMembership(result.data);
      setMembershipStateContext(new MembershipStateContext(result.data));
      setStateUpdateTrigger((prev) => prev + 1);
    } else {
      addToast(result.error || "Failed to apply for membership", "error");
    }
    setActionLoading(false);
  }, [addToast, user]);

  const handleRenew = async () => {
    if (!user) return;
    setSelectedPlanTier(displayMembership?.tier ?? "monthly");
    setRenewalPaymentTier(displayMembership?.tier ?? null);
    paymentHook.clearError();
    setShowPaymentModal(true);
  };

  const handleCancel = async () => {
    if (!user) return;
    if (!confirm("Are you sure you want to cancel your membership? You'll retain access until the renewal date.")) return;
    setActionLoading(true);
    const result = await cancelMembership(user.id);
    if (result.success && result.data) {
      addToast("Membership canceled successfully", "success");
      setMembership(result.data);
      setMembershipStateContext(new MembershipStateContext(result.data));
      setStateUpdateTrigger((prev) => prev + 1);
    } else {
      addToast(result.error || "Failed to cancel membership", "error");
    }
    setActionLoading(false);
  };

  const handleReactivate = async () => {
    if (!user) return;
    setActionLoading(true);
    const result = await reactivateMembership(user.id);
    if (result.success && result.data) {
      addToast("Membership reactivated successfully!", "success");
      setMembership(result.data);
      setMembershipStateContext(new MembershipStateContext(result.data));
      setStateUpdateTrigger((prev) => prev + 1);
    } else {
      addToast(result.error || "Failed to reactivate membership", "error");
    }
    setActionLoading(false);
  };

  const handleWalkInApply = useCallback(() => {
    startWalkIn();
    // Create a walk-in attendance session
    const walkInSession = new AttendanceSessionContext("walk-in");
    setAttendanceSessionContext(walkInSession);
    setStateUpdateTrigger((prev) => prev + 1);
    addToast("Welcome! Your 24-hour walk-in session has started. Enjoy! 🎉", "success");
  }, [addToast, startWalkIn]);

  const handleEndWalkInSession = () => {
    if (!confirm("Are you sure you want to end your walk-in session? You will lose access immediately.")) return;
    clearWalkIn();
    // Reset attendance session
    setAttendanceSessionContext(new AttendanceSessionContext("regular"));
    setStateUpdateTrigger((prev) => prev + 1);
    addToast("Walk-in session ended. Thank you for visiting!", "success");
  };

  const handleAdminConfirmPayment = async (
    transactionId: string,
    userId: string,
    userType: UserType
  ) => {
    try {
      await paymentHook.confirmPayment(transactionId);
      const currentMembership = await fetchUserMembership(userId);
      const result = currentMembership?.status === "active"
        ? currentMembership.tier === userType
          ? await renewMembership(userId)
          : await changeMembership(userId, userType)
        : await applyMembership(userId, userType);
      if (result.success && result.data) {
        addToast(`Member ${userId} approved on ${userType} plan.`, "success");
        // Update state context
        if (membershipStateContext) {
          membershipStateContext.confirmPayment();
          membershipStateContext.activate();
          setStateUpdateTrigger((prev) => prev + 1);
        }
      } else {
        addToast(`Membership apply warning: ${result.error}`, "error");
      }
    } catch (err) {
      console.error("Admin confirm error:", err);
      addToast("Failed to confirm payment or apply membership.", "error");
    }
  };

  const handleAdminDeclinePayment = async (
    transactionId: string,
    userId: string,
    userType: UserType
  ) => {
    try {
      await paymentHook.failPayment(transactionId, "Declined by admin");
      addToast(`Payment ${transactionId} declined for user ${userId} (${userType}).`, "error");
      // Update state context
      if (membershipStateContext) {
        membershipStateContext.updateMembership({ status: "canceled" });
        setStateUpdateTrigger((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Admin decline error:", err);
      addToast("Failed to decline payment.", "error");
    }
  };

  const handleAdminVerifyOnlinePayment = async (
    transactionId: string,
    userId: string,
    userType: UserType
  ) => {
    try {
      await paymentHook.verifyOnlinePaymentProof(transactionId);
      const currentMembership = await fetchUserMembership(userId);
      const result = currentMembership?.status === "active"
        ? currentMembership.tier === userType
          ? await renewMembership(userId)
          : await changeMembership(userId, userType)
        : await applyMembership(userId, userType);
      if (result.success && result.data) {
        addToast(`Online payment verified! Member ${userId} approved on ${userType} plan.`, "success");
        // Update state context
        if (membershipStateContext) {
          membershipStateContext.confirmPayment();
          membershipStateContext.activate();
          setStateUpdateTrigger((prev) => prev + 1);
        }
      } else {
        addToast(`Membership apply warning: ${result.error}`, "error");
      }
    } catch (err) {
      console.error("Admin verify online payment error:", err);
      addToast("Failed to verify online payment or apply membership.", "error");
    }
  };

  const handleAdminRejectOnlinePayment = async (
    transactionId: string,
    userId: string,
    userType: UserType,
    reason: string
  ) => {
    try {
      await paymentHook.rejectOnlinePaymentProof(transactionId, reason);
      addToast(`Online payment rejected for user ${userId} (${userType}). Reason: ${reason}`, "error");
      // Update state context
      if (membershipStateContext) {
        membershipStateContext.updateMembership({ status: "canceled" });
        setStateUpdateTrigger((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Admin reject online payment error:", err);
      addToast("Failed to reject online payment.", "error");
    }
  };

  // Payment handlers

  const handleSelectPlan = (tier: UserType) => {
    setSelectedPlanTier(tier);
    paymentHook.clearError();
    setShowPaymentModal(true);
  };

  const handleInitiatePayment = async (method: "cash" | "card" | "online", proofOfPayment?: string) => {
    if (!user) {
      const transactionId = generateTransactionId();
      const now = new Date().toISOString();
      const guestPayment: PaymentTransaction = {
        id: transactionId,
        userId: "guest",
        userType: selectedPlanTier,
        amount: MEMBERSHIP_PRICES[selectedPlanTier],
        method,
        status: method === "online" ? "awaiting-verification" : "awaiting-confirmation",
        createdAt: now,
        updatedAt: now,
        proofOfPaymentUrl: proofOfPayment,
        paymentProofStatus: method === "online" ? "pending" : undefined,
      };

      saveTransaction(guestPayment);
      setGuestTransaction(guestPayment);
      addToast("Payment request created.", "success");
      setShowPaymentModal(false);
      setShowPaymentConfirmation(true);
      return;
    }

    await paymentHook.initializePayment(
      user.id,
      selectedPlanTier,
      MEMBERSHIP_PRICES[selectedPlanTier],
      method,
      proofOfPayment
    );

    // Don't proceed if the hook ended up in an error state
    if (paymentHook.state.status === "failed" || !paymentHook.state.currentTransaction) {
      addToast(paymentHook.state.error ?? "Payment failed. Please try again.", "error");
      return;
    }

    setShowPaymentModal(false);
    setShowPaymentConfirmation(true);
  };

  const handlePaymentComplete = useCallback(async () => {
    const transaction = paymentHook.state.currentTransaction ?? guestTransaction;
    if (!transaction || completedTransactionId === transaction.id) {
      return;
    }

    setCompletedTransactionId(transaction.id);
    setShowPaymentConfirmation(false);

    if (transaction.userId === "guest" || !user) {
      addToast("Your payment request has been submitted.", "success");
      navigate("/subscription-tier");
      return;
    }

    if (renewalPaymentTier || pendingMembershipTier) {
      addToast("Your payment details were submitted. Admin confirmation is pending.", "success");
      navigate("/payment-panel");
      setRenewalPaymentTier(null);
      return;
    }

    if (transaction.userType === "walk-in") {
      handleWalkInApply();
      navigate("/walk-in");
      return;
    }

    await handleApply(transaction.userType);
    addToast("Payment completed! Your membership is now active.", "success");
    navigate("/dashboard");
  }, [addToast, completedTransactionId, guestTransaction, handleApply, handleWalkInApply, navigate, paymentHook.state.currentTransaction, user]);

  useEffect(() => {
    const transaction = paymentHook.state.currentTransaction;
    if (
      transaction?.method === "cash" &&
      transaction.status === "paid" &&
      completedTransactionId !== transaction.id
    ) {
      void handlePaymentComplete();
    }
  }, [completedTransactionId, handlePaymentComplete, paymentHook.state.currentTransaction]);

  const plans = [
    {
      badge: "Starter",
      title: "Monthly",
      amount: "₱499",
      interval: "/ month",
      quote: "Train on your schedule.",
      description: "Best for trying the gym with flexible billing.",
      features: ["Flexible monthly billing", "Full gym floor access", "Cancel anytime"],
      isActive: false,
      tier: "monthly" as const,
      ctaLabel: "Choose Monthly",
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 16h4" />
        </svg>
      ),
    },
    {
      badge: "Value",
      title: "Semi-Yearly",
      amount: "₱699",
      interval: "/ 6 months",
      quote: "Commit a little longer and save more.",
      description: "Balanced commitment with better long-term value.",
      features: ["Lower effective monthly cost", "Priority class slots", "Consistent progress window"],
      isActive: false,
      tier: "semi-yearly" as const,
      ctaLabel: "Choose Semi-Yearly",
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      ),
    },
    {
      badge: "Best Plan",
      title: "Yearly",
      amount: "₱1,199",
      interval: "/ 12 months",
      quote: "Maximum savings for year-round training.",
      description: "Most cost-effective plan for consistent training.",
      features: ["Best yearly value", "Locked-in lower rate", "Built for long-term goals"],
      isActive: true,
      tier: "yearly" as const,
      ctaLabel: "Choose Yearly",
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l4 4L19 6" />
        </svg>
      ),
    },
    {
      badge: "One-Time",
      title: "Walk-In Pass",
      amount: "₱60",
      interval: "/ session",
      quote: "Quick access when you need a single workout.",
      description: "One-time access for quick sessions with no commitment.",
      features: ["No subscription required", "24-hour pass validity", "Fast entry for single visit"],
      isActive: false,
      tier: "walk-in" as const,
      ctaLabel: "Choose Walk-In",
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14L21 3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 3l-7 18-4-7-7-4 18-7z" />
        </svg>
      ),
    },
  ];

  const renderPaymentFlow = () => (
    <>
      <PaymentModal
        isOpen={showPaymentModal}
        selectedUserType={selectedPlanTier}
        onClose={() => {
          setShowPaymentModal(false);
          setRenewalPaymentTier(null);
          paymentHook.clearError();
        }}
        onInitiatePayment={handleInitiatePayment}
        isLoading={paymentHook.state.status === "processing"}
        error={paymentHook.state.error}
        onClearError={paymentHook.clearError}
      />
      <PaymentConfirmation
        transaction={paymentHook.state.currentTransaction ?? guestTransaction}
        isOpen={showPaymentConfirmation}
        onClose={() => {
          setShowPaymentConfirmation(false);
          setRenewalPaymentTier(null);
        }}
        onComplete={handlePaymentComplete}
      />
    </>
  );

  const renderPricingContent = () => (
    <>
      <PricingSection
        plans={plans}
        isLoading={actionLoading}
        isSubscriberView={Boolean(user && isSubscribedUser)}
        currentTier={displayMembership?.tier ?? null}
        onSelectPlan={(plan) => handleSelectPlan(plan.tier)}
      />
      {renderPaymentFlow()}
    </>
  );

  if (loading && location.pathname !== "/subscription-tier") {
    return (
      <div className="rounded-2xl border border-flexNavy/15 bg-flexWhite/60 p-6 animate-pulse">
        <div className="h-8 bg-flexNavy/10 rounded w-32 mb-4"></div>
        <div className="h-6 bg-flexNavy/10 rounded w-48"></div>
      </div>
    );
  }

  if (error && !membership && location.pathname !== "/subscription-tier") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-semibold">Error loading membership</p>
        <p className="text-sm mt-1">{error}</p>
        <button onClick={() => loadMembership()} className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
          Retry
        </button>
      </div>
    );
  }

  if (walkInSession && location.pathname !== "/subscription-tier") {
    return (
      <div className="space-y-4">
        <WalkInCard membership={walkInSession} onEndSession={handleEndWalkInSession} isLoading={actionLoading} />
      </div>
    );
  }

  if (location.pathname === "/subscription-tier" && user && loading) {
    return (
      <div className="rounded-2xl border border-flexNavy/15 bg-flexWhite/60 p-6 animate-pulse">
        <div className="h-8 bg-flexNavy/10 rounded w-32 mb-4"></div>
        <div className="h-6 bg-flexNavy/10 rounded w-48"></div>
      </div>
    );
  }

  // Always show pricing cards when this dashboard is rendered under the Subscription Tier page.
  if (location.pathname === "/subscription-tier") {
    return <div className="space-y-4">{renderPricingContent()}</div>;
  }

  if (!displayMembership) {
    return (
      <div className="space-y-4">
        {isDev && (
          <div className="flex gap-2">
            <button onClick={() => setDevShowMembership(!devShowMembership)} className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded border border-purple-200 font-semibold hover:bg-purple-200 transition">
              🔧 Dev: Toggle Membership State
            </button>
            <button onClick={toggleAdminView} className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded border border-indigo-200 font-semibold hover:bg-indigo-200 transition">
              🔧 Dev: {isAdmin ? "User" : "Admin"} View
            </button>
          </div>
        )}
        {isAdmin ? (
          <AdminPaymentPanel
            onConfirmPayment={handleAdminConfirmPayment}
            onDeclinePayment={handleAdminDeclinePayment}
            onVerifyOnlinePayment={handleAdminVerifyOnlinePayment}
            onRejectOnlinePayment={handleAdminRejectOnlinePayment}
          />
        ) : (
          renderPricingContent()
        )}
      </div>
    );
  }

  if (location.pathname === "/dashboard" && isSubscribedUser) {
    const currentPlan = plans.find((plan) => plan.tier === displayMembership.tier) ?? plans[0];
    const otherPlans = plans.filter((plan) => plan.tier !== displayMembership.tier);
    const selectedPlan = pendingMembershipTier
      ? plans.find((plan) => plan.tier === pendingMembershipTier) ?? null
      : null;
    const previewPlan = selectedPlan ?? currentPlan;
    const swapActive = Boolean(selectedPlan);
    const stackPlans = otherPlans.filter((plan) => plan.tier !== previewPlan.tier);
    const rightSidePlans = selectedPlan
      ? [selectedPlan, ...stackPlans.filter((plan) => plan.tier !== selectedPlan.tier)]
      : stackPlans;

    return (
      <div className="space-y-6">
        <section
          className={`relative overflow-hidden rounded-3xl border p-6 transition-all duration-700 ${
            sessionStage === "checked-in"
              ? "border-flexBlue/30 bg-gradient-to-r from-white via-[#eef6ff] to-white shadow-[0_20px_55px_rgba(28,102,191,0.18)]"
              : "border-flexBlue/25 bg-gradient-to-r from-white via-[#eef6ff] to-[#e8f2ff] shadow-[0_20px_55px_rgba(28,102,191,0.18)]"
          }`}
        >
          {sessionStage === "checked-in" && (
            <div
              className="session-light-sweep pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent"
              aria-hidden="true"
            />
          )}
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-flexBlue/20 blur-3xl" aria-hidden="true" />
          <div className="absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-[#9fd2ff]/30 blur-3xl" aria-hidden="true" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-flexBlue">Session Access</p>
              <h3 className="mt-2 text-2xl font-black text-[#04223d] sm:text-3xl">Gym Session</h3>
              <p className="mt-2 text-sm text-slate-600">Log your session, generate your check-in QR, and log out when you are done.</p>
            </div>

            <div className="inline-flex items-center gap-2 self-start rounded-full border border-flexBlue/35 bg-white px-4 py-2 text-sm font-semibold text-flexNavy shadow-sm">
              {sessionStage === "checked-in" ? (
                <img
                  src={activeIconGif}
                  alt="Active"
                  className="h-4 w-4 rounded-sm object-contain"
                />
              ) : (
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              )}
              {sessionStage === "checked-in" ? "Active Session" : "No Active Session"}
            </div>
          </div>

          <div className="relative mt-6 rounded-2xl border border-flexBlue/20 bg-white/85 p-5 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Quick Actions</p>

            {showQR && (
              <div className="mt-4 flex flex-col items-center gap-4 rounded-2xl border border-flexNavy/10 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold tracking-widest text-flexNavy uppercase">Check-In QR Code</p>
                <div className="rounded-xl border border-flexNavy/10 bg-white p-3 shadow-sm">
                  <QRCodeSVG value={qrValue} size={180} bgColor="#ffffff" fgColor="#0a0a2e" level="H" />
                </div>
                <p className="text-center text-xs text-flexNavy/50">Show this to the admin at the front desk to check in.</p>
                <button
                  onClick={handleCloseQR}
                  className="w-full rounded-xl border border-flexBlue/40 bg-gradient-to-r from-flexBlue to-[#1c8ee6] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(28,102,191,0.28)] transition hover:-translate-y-0.5 hover:from-[#1c8ee6] hover:to-flexBlue"
                >
                  Admin Confirmed Scan
                </button>
              </div>
            )}

            {!showQR && (
              <div className="mt-4">
                {sessionStage === "idle" && (
                  <button
                    type="button"
                    onClick={() => setSessionStage("ready")}
                    className="w-full rounded-xl border border-flexBlue/35 bg-gradient-to-r from-[#1a5fb8] to-flexBlue px-4 py-3 font-semibold text-white shadow-[0_12px_28px_rgba(28,102,191,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(28,102,191,0.38)]"
                  >
                    Log In Session
                  </button>
                )}

                {sessionStage === "ready" && (
                  <button
                    type="button"
                    onClick={handleGenerateCheckIn}
                    className="w-full rounded-xl border border-flexBlue/35 bg-gradient-to-r from-flexBlue to-[#1c8ee6] px-4 py-3 font-semibold text-white shadow-[0_12px_28px_rgba(28,102,191,0.3)] transition hover:-translate-y-0.5 hover:from-[#1c8ee6] hover:to-flexBlue"
                  >
                    Generate Check-In QR
                  </button>
                )}

                {sessionStage === "checked-in" && (
                  <button
                    type="button"
                    onClick={() => {
                      setSessionStage("ready");
                      setShowQR(false);
                      addToast("Session logged out. You can check in again.", "success");
                    }}
                    className="w-full rounded-xl border border-red-200 bg-gradient-to-r from-red-600 to-red-500 px-4 py-3 font-semibold text-white shadow-[0_12px_28px_rgba(220,38,38,0.28)] transition hover:-translate-y-0.5 hover:from-red-500 hover:to-red-600"
                  >
                    Log Out Session
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-flexBlue/20 bg-gradient-to-br from-white via-[#f7fbff] to-[#eef6ff] p-6 shadow-[0_20px_45px_rgba(12,33,73,0.12)] backdrop-blur">
          <div className="flex flex-col gap-4 text-center lg:flex-row lg:items-center lg:justify-between lg:text-left">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-flexBlue">Membership Overview</p>
              <h4 className="mt-2 text-2xl font-black text-[#071731]">{TIER_LABELS[displayMembership.tier]} Plan</h4>
            </div>

            <span
              className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold ${
                displayMembership.status === "active"
                  ? "border-flexBlue/25 bg-[#edf6ff] text-flexBlue"
                  : displayMembership.status === "expired"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-yellow-200 bg-yellow-50 text-yellow-700"
              }`}
            >
              {displayMembership.status.charAt(0).toUpperCase() + displayMembership.status.slice(1)}
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-flexBlue/10 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-slate-500">Started</p>
              <p className="mt-2 font-semibold text-slate-900">{new Date(displayMembership.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
            </div>
            <div className="rounded-2xl border border-flexBlue/10 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-slate-500">Renews</p>
              <p className="mt-2 font-semibold text-slate-900">{new Date(displayMembership.renewal_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
            </div>
            <div className="rounded-2xl border border-flexBlue/10 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-slate-500">Days Remaining</p>
              <p className="mt-2 font-semibold text-slate-900">{displayStats?.daysUntilRenewal ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-flexBlue/10 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-slate-500">Days Active</p>
              <p className="mt-2 font-semibold text-slate-900">{displayStats?.daysActive ?? 0}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {membershipStateContext?.canPerformAction("renew") && (
              <button onClick={handleRenew} disabled={actionLoading} className="min-w-[220px] rounded-xl border border-flexBlue/35 bg-gradient-to-r from-flexBlue to-[#1c8ee6] px-5 py-3 font-semibold text-white shadow-[0_12px_28px_rgba(28,102,191,0.3)] transition hover:-translate-y-0.5 hover:from-[#1c8ee6] hover:to-flexBlue disabled:cursor-not-allowed disabled:opacity-70">
                {actionLoading ? "Renewing..." : "Renew Membership"}
              </button>
            )}
            <button onClick={handleOpenChangeMembership} disabled={actionLoading} className="min-w-[220px] rounded-xl border border-flexNavy/20 bg-gradient-to-r from-[#0f2a54] to-[#1a3f73] px-5 py-3 font-semibold text-white shadow-[0_12px_28px_rgba(10,38,79,0.28)] transition hover:-translate-y-0.5 hover:from-[#123466] hover:to-[#1f4f90] disabled:cursor-not-allowed disabled:opacity-70">
              Change Membership
            </button>
            {membershipStateContext?.canPerformAction("reactivate") && (
              <button onClick={handleReactivate} disabled={actionLoading} className="min-w-[220px] rounded-xl border border-[#1c8ee6]/35 bg-gradient-to-r from-[#2563eb] to-[#1c8ee6] px-5 py-3 font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 hover:from-[#1d4ed8] hover:to-[#1c8ee6] disabled:cursor-not-allowed disabled:opacity-70">
                {actionLoading ? "Reactivating..." : "Reactivate Membership"}
              </button>
            )}
          </div>
        </section>

        {showChangeMembershipModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#071731]/70 px-2 py-3 backdrop-blur-sm sm:px-4 sm:py-6 lg:items-center lg:py-8">
            <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[calc(100vw-0.5rem)] flex-col overflow-y-auto overscroll-contain rounded-[28px] border border-white/20 bg-white shadow-[0_30px_90px_rgba(4,23,56,0.45)] sm:max-h-[94vh] sm:max-w-4xl sm:rounded-[32px] lg:max-w-6xl lg:overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-flexBlue/10 bg-gradient-to-r from-[#f7fbff] via-white to-[#f8fbff] px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-flexBlue">Change Membership</p>
                  <h4 className="mt-1 text-xl font-black text-[#071731] sm:text-2xl">Compare plans before confirming</h4>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:gap-3 lg:w-auto">
                  <button
                    type="button"
                    onClick={handleCloseChangeMembership}
                    className="flex-1 rounded-xl border border-flexNavy/15 bg-white px-4 py-2.5 text-sm font-semibold text-flexNavy shadow-sm transition hover:bg-[#f7fbff] lg:flex-none lg:px-5"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmMembershipChange}
                    disabled={!pendingMembershipTier || pendingMembershipTier === displayMembership.tier || actionLoading}
                    className="flex-1 rounded-xl border border-flexBlue/35 bg-gradient-to-r from-flexBlue to-[#1c8ee6] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(28,102,191,0.28)] transition hover:-translate-y-0.5 hover:from-[#1c8ee6] hover:to-flexBlue disabled:cursor-not-allowed disabled:opacity-50 lg:flex-none lg:px-5"
                  >
                    {actionLoading ? "Processing..." : "Confirm"}
                  </button>
                </div>
              </div>

              <div className="grid flex-1 gap-0 bg-[#f8fbff] lg:grid-cols-2">
                <div className="space-y-5 border-b border-flexBlue/10 bg-white px-4 py-5 sm:px-6 lg:border-b-0 lg:border-r lg:px-8 lg:py-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-flexBlue">{swapActive ? "Your New Plan" : "Your Current Plan"}</p>
                      <h5 className="mt-1 text-xl font-black text-[#071731]">{previewPlan.title}</h5>
                    </div>
                    <span className="rounded-full border border-flexBlue/20 bg-[#edf6ff] px-3 py-1 text-xs font-semibold text-flexBlue">
                      Preview
                    </span>
                  </div>

                  <article className="rounded-[24px] border border-flexBlue/15 bg-white p-4 shadow-[0_18px_40px_rgba(12,33,73,0.08)] sm:p-5">
                    <div className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      {previewPlan.badge}
                    </div>

                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div>
                        <h6 className="text-xl font-black text-[#071731]">{previewPlan.title}</h6>
                        <div className="mt-1 flex items-end gap-1">
                          <span className="text-3xl font-black text-[#071731]">{previewPlan.amount}</span>
                          <span className="pb-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">{previewPlan.interval}</span>
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 text-sm font-semibold italic text-slate-500">"{previewPlan.quote}"</p>

                    <div className="my-4 h-px w-full bg-slate-100" />

                    <p className="text-sm leading-relaxed text-slate-700">{previewPlan.description}</p>

                    <ul className="mt-4 space-y-2.5 text-sm font-medium text-slate-700">
                      {previewPlan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5">
                          <svg className="mt-0.5 h-4 w-4 shrink-0 text-flexBlue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                </div>

                <div className="space-y-5 bg-[#f8fbff] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-flexBlue">{swapActive ? "Your Current Plan" : "Change Membership"}</p>
                      <h5 className="mt-1 text-xl font-black text-[#071731]">{swapActive ? currentPlan.title : "Choose a new membership"}</h5>
                    </div>
                    <span className="rounded-full border border-flexBlue/20 bg-[#edf6ff] px-3 py-1 text-xs font-semibold text-flexBlue">
                      {swapActive ? "Current" : "Available"}
                    </span>
                  </div>

                  <div className="mx-auto flex w-full max-w-[320px] flex-col gap-2.5 pb-2 pt-1 sm:max-w-[360px]">
                    {rightSidePlans.map((plan) => {
                      const isSelected = pendingMembershipTier === plan.tier;

                      return (
                        <button
                          key={plan.tier}
                          type="button"
                          onClick={() => handleSelectMembershipTier(plan.tier)}
                          className={`block w-full text-left transition-transform duration-200 ${isSelected ? "scale-[1.01]" : "hover:-translate-y-0.5"}`}
                        >
                          <article
                            className={`rounded-xl border bg-white p-3.5 shadow-sm transition-all ${
                              isSelected
                                ? "border-flexBlue ring-2 ring-flexBlue/25"
                                : "border-flexBlue/15"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-flexBlue">{plan.badge}</p>
                                <h6 className="mt-1 text-sm font-black text-[#071731]">{plan.title}</h6>
                              </div>
                              <div className="text-right">
                                <p className="text-base font-black text-flexBlue">{plan.amount}</p>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{plan.interval}</p>
                              </div>
                            </div>
                          </article>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {renderPaymentFlow()}

        {showCheckInConfirmation && (
          <div className="fixed left-1/2 top-24 z-50 w-[min(92vw,28rem)] -translate-x-1/2 rounded-xl border border-flexBlue/30 bg-[#edf6ff] px-4 py-3 text-center text-sm font-semibold text-flexBlue shadow-xl">
            Check-in confirmed. Your session is now active.
          </div>
        )}

        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <div key={toast.id} className={`rounded-lg px-4 py-3 text-sm font-medium text-white animate-in fade-in slide-in-from-bottom-4 ${toast.type === "success" ? "bg-flexBlue" : "bg-red-600"}`}>
              {toast.message}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Has membership: show status, actions, and check-in/out QR
  return (
    <div className="space-y-6">
      {isDev && (
        <div className="flex gap-2">
          <button onClick={() => setDevShowMembership(!devShowMembership)} className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded border border-purple-200 font-semibold hover:bg-purple-200 transition">
            🔧 Dev: Toggle Membership State (Showing Membership)
          </button>
          <button onClick={toggleAdminView} className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded border border-indigo-200 font-semibold hover:bg-indigo-200 transition">
            🔧 Dev: {isAdmin ? "User" : "Admin"} View
          </button>
        </div>
      )}
      {isAdmin && (
        <AdminPaymentPanel
          onConfirmPayment={handleAdminConfirmPayment}
          onDeclinePayment={handleAdminDeclinePayment}
          onVerifyOnlinePayment={handleAdminVerifyOnlinePayment}
          onRejectOnlinePayment={handleAdminRejectOnlinePayment}
        />
      )}
      {error && (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-700 text-sm">{error}</div>
      )}

      {/* Check-In kag Check-Out QR Section */}
      <section className="rounded-2xl border border-flexNavy/15 bg-flexWhite/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-flexNavy">Gym Access</p>
            <p className="text-sm text-flexNavy/60 mt-0.5">
              {attendanceSessionContext?.getDescription()}
            </p>
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

        {/* QR Code Display */}
        {showQR && (
          <div className="flex flex-col items-center gap-4 my-4 p-5 rounded-2xl bg-white border border-flexNavy/10 shadow-sm">
            <p className="text-xs font-bold tracking-widest text-flexNavy uppercase">
              {attendanceSessionContext?.getStateName() === "checked-in" ? "Check-Out QR Code" : "Check-In QR Code"}
            </p>
            <div className="bg-white p-3 rounded-xl border border-flexNavy/10 shadow-sm">
              <QRCodeSVG value={qrValue} size={180} bgColor="#ffffff" fgColor="#0a0a2e" level="H" />
            </div>
            <p className="text-xs text-flexNavy/50 text-center">
              {attendanceSessionContext?.getStateName() === "checked-in"
                ? "Show this to the admin at the front desk to check out"
                : "Show this to the admin at the front desk to check in"}
            </p>
            {/* Close/Done button */}
            <button
              onClick={handleCloseQR}
              className="w-full rounded-xl bg-flexBlue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-flexNavy"
            >
              ✓ Done — Admin Approved
            </button>
          </div>
        )}

        {/* Generate QR Buttons */}
        {!showQR && (
          <div className="mt-2">
            {attendanceSessionContext?.canPerformAction("checkIn") && (
              <button
                onClick={handleGenerateCheckIn}
                className="w-full rounded-xl bg-flexBlue px-4 py-3 font-semibold text-white transition hover:bg-flexNavy flex items-center justify-center gap-2"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Generate Check-In QR
              </button>
            )}
            {attendanceSessionContext?.canPerformAction("checkOut") && (
              <button
                onClick={handleGenerateCheckOut}
                className="w-full rounded-xl bg-flexNavy px-4 py-3 font-semibold text-white transition hover:bg-red-600 flex items-center justify-center gap-2"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7" />
                </svg>
                Generate Check-Out QR
              </button>
            )}
          </div>
        )}
      </section>

      {/* Status Card */}
      <section className="rounded-2xl border border-flexNavy/15 bg-flexWhite/60 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-flexNavy">Membership Status</p>
            <div className="mt-3 inline-flex items-center gap-2">
              <span className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold border ${
                displayMembership.status === "active" ? "bg-green-100 text-green-700 border-green-200"
                : displayMembership.status === "expired" ? "bg-red-100 text-red-700 border-red-200"
                : "bg-yellow-100 text-yellow-700 border-yellow-200"
              }`}>
                {displayMembership.status.charAt(0).toUpperCase() + displayMembership.status.slice(1)}
              </span>
              {displayStats?.isCanceled && (
                <span className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-200">Canceling</span>
              )}
              {displayStats?.isRenewalWindowOpen && !displayStats?.isCanceled && (
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">Renew Soon</span>
              )}
            </div>
          </div>

          <div className="text-right">
            {displayStats && !displayStats.isExpired && (
              <>
                <p className="text-sm text-flexNavy">
                  <span className="font-semibold text-flexBlue">{displayStats.daysUntilRenewal}</span>{" "}
                  days until {displayStats.isCanceled ? "expiration" : "renewal"}
                </p>
                <p className="mt-1 text-xs text-flexNavy/60">
                  {displayStats.daysActive} days active • {TIER_LABELS[displayMembership.tier]} plan
                </p>
              </>
            )}
            {displayStats?.isExpired && (
              <p className="text-sm text-red-600 font-semibold">Expired</p>
            )}
          </div>
        </div>
      </section>

      {/* Membership Details */}
      <section className="rounded-2xl border border-flexNavy/15 bg-flexWhite/60 p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-flexNavy mb-4">Details</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-flexNavy/60 uppercase tracking-wider">Plan</p>
            <p className="mt-2 font-semibold text-flexBlack capitalize">{TIER_LABELS[displayMembership.tier]}</p>
          </div>
          <div>
            <p className="text-xs text-flexNavy/60 uppercase tracking-wider">Started</p>
            <p className="mt-2 font-semibold text-flexBlack">
              {new Date(displayMembership.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div>
            <p className="text-xs text-flexNavy/60 uppercase tracking-wider">{displayStats?.isCanceled ? "Expires" : "Renews"}</p>
            <p className="mt-2 font-semibold text-flexBlack">
              {new Date(displayMembership.renewal_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
      </section>

      {/* Membership Action Buttons */}
      <section className="grid gap-3 sm:grid-cols-2">
        {membershipStateContext?.canPerformAction("renew") && (
          <button onClick={handleRenew} disabled={actionLoading} className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {actionLoading ? "Renewing..." : "Renew Membership"}
          </button>
        )}
        {membershipStateContext?.canPerformAction("cancel") && (
          <button onClick={handleCancel} disabled={actionLoading} className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-70 disabled:cursor-not-allowed">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            {actionLoading ? "Canceling..." : "Cancel Membership"}
          </button>
        )}
        {membershipStateContext?.canPerformAction("reactivate") && (
          <button onClick={handleReactivate} disabled={actionLoading} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {actionLoading ? "Reactivating..." : "Reactivate Membership"}
          </button>
        )}
        {membershipStateContext?.getStateName() === "expired" && (
          <button onClick={() => handleApply("monthly")} disabled={actionLoading} className="flex items-center justify-center gap-2 rounded-xl bg-flexBlue px-4 py-3 font-semibold text-white transition hover:bg-flexBlue/90 disabled:opacity-70 disabled:cursor-not-allowed sm:col-span-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {actionLoading ? "Applying..." : "Apply Again"}
          </button>
        )}
      </section>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((toast) => (
          <div key={toast.id} className={`rounded-lg px-4 py-3 text-sm font-medium text-white animate-in fade-in slide-in-from-bottom-4 ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}