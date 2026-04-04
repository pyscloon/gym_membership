import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks";
import { useWalkIn } from "../hooks/useWalkIn";
import { usePayment } from "../hooks/usePayment";
import {
  applyMembership,
  cancelMembership,
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

  const displayMembership = membership;
  const displayStats = displayMembership ? calculateMembershipStats(displayMembership) : null;

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

  // QR changes based on attendance state
  const qrValue = JSON.stringify({
    id: user?.id,
    type: attendanceSessionContext?.getStateName() === "checked-in" ? "checkout" : "checkin",
    tier: displayMembership?.tier,
    timestamp: new Date().toISOString(),
  });

  const handleGenerateCheckIn = () => {
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
    setShowQR(false);
    const currentState = attendanceSessionContext?.getStateName();
    if (currentState === "checked-in") {
      attendanceSessionContext?.checkOut();
      addToast("Checked out successfully! See you next time!", "success");
    }
    setStateUpdateTrigger((prev) => prev + 1);
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
    setActionLoading(true);
    const result = await renewMembership(user.id);
    if (result.success && result.data) {
      addToast("Membership renewed successfully!", "success");
      setMembership(result.data);
      setMembershipStateContext(new MembershipStateContext(result.data));
      setStateUpdateTrigger((prev) => prev + 1);
    } else {
      addToast(result.error || "Failed to renew membership", "error");
    }
    setActionLoading(false);
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
      const result = await applyMembership(userId, userType);
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
      const result = await applyMembership(userId, userType);
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
      interval: "/ 6months",
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
      interval: "/ year",
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
      ctaLabel: "Start Walk-In",
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14L21 3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 3l-7 18-4-7-7-4 18-7z" />
        </svg>
      ),
    },
  ];

  const renderPricingContent = () => (
    <>
      <PricingSection
        plans={plans}
        isLoading={actionLoading}
        onSelectPlan={(plan) => handleSelectPlan(plan.tier)}
      />
      <PaymentModal
        isOpen={showPaymentModal}
        selectedUserType={selectedPlanTier}
        onClose={() => setShowPaymentModal(false)}
        onInitiatePayment={handleInitiatePayment}
        isLoading={paymentHook.state.status === "processing"}
        error={paymentHook.state.error}
        onClearError={paymentHook.clearError}
      />
      <PaymentConfirmation
        transaction={paymentHook.state.currentTransaction ?? guestTransaction}
        isOpen={showPaymentConfirmation}
        onClose={() => setShowPaymentConfirmation(false)}
        onComplete={handlePaymentComplete}
      />
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