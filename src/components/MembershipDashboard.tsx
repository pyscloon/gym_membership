import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useNavigate } from "react-router-dom";
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
import { MEMBERSHIP_PRICES, type UserType, type PaymentMethod } from "../types/payment";
import PricingSection from "./PricingSection";
import WalkInCard from "./WalkInCard";
import PaymentModal from "./PaymentModal";
import PaymentConfirmation from "./PaymentConfirmation";
import AdminPaymentPanel from "./AdminPaymentPanel";

type Toast = {
  id: string;
  message: string;
  type: "success" | "error";
};

type CheckInStatus = "idle" | "awaiting-checkin" | "checked-in" | "awaiting-checkout";

const TIER_LABELS: Record<MembershipTier, string> = {
  monthly: "Monthly",
  "semi-yearly": "Semi-Yearly",
  annual: "Annual",
  "walk-in": "Walk-In",
};

export default function MembershipDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { session: walkInSession, startSession: startWalkIn, clearSession: clearWalkIn } = useWalkIn();
  const paymentHook = usePayment(user?.id || "");
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [devShowMembership, setDevShowMembership] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus>("idle");
  const [showQR, setShowQR] = useState(false);
  
  // Payment state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedTier, setSelectedTier] = useState<UserType | null>(null);
  const [completedTransactionId, setCompletedTransactionId] = useState<string | null>(null);

  // Mock membership for testing
  const mockMembership: Membership = {
    id: "test-1",
    user_id: user?.id || "test-user",
    status: "active",
    tier: "monthly",
    start_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    renewal_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    cancel_at_period_end: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const displayMembership = devShowMembership ? mockMembership : membership;
  const displayStats = displayMembership ? calculateMembershipStats(displayMembership) : null;

  const addToast = (message: string, type: "success" | "error" = "success") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const loadMembership = async () => {
    if (!user) return;
    try {
      setError(null);
      const userMembership = await fetchUserMembership(user.id);
      setMembership(userMembership);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load membership";
      console.error("Error loading membership:", err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadMembership();
  }, [user?.id]);

  // QR changes based on check-in or check-out
  const qrValue = JSON.stringify({
    id: user?.id,
    type: checkInStatus === "checked-in" ? "checkout" : "checkin",
    tier: displayMembership?.tier,
    timestamp: new Date().toISOString(),
  });

  const handleGenerateCheckIn = () => {
    setCheckInStatus("awaiting-checkin");
    setShowQR(true);
    addToast("Check-in QR generated! Show this to the admin.", "success");
  };

  const handleGenerateCheckOut = () => {
    setCheckInStatus("awaiting-checkout");
    setShowQR(true);
    addToast("Check-out QR generated! Show this to the admin.", "success");
  };

  const handleCloseQR = () => {
    setShowQR(false);
    if (checkInStatus === "awaiting-checkin") {
      setCheckInStatus("checked-in");
      addToast("Checked in successfully! Enjoy your workout!", "success");
    } else if (checkInStatus === "awaiting-checkout") {
      setCheckInStatus("idle");
      addToast("Checked out successfully! See you next time!", "success");
    }
  };

  const handleApply = async (tier: MembershipTier = "monthly") => {
    if (!user) return;
    setActionLoading(true);
    const result = await applyMembership(user.id, tier);
    if (result.success) {
      addToast(`Successfully applied for ${tier} membership!`, "success");
      await loadMembership();
    } else {
      addToast(result.error || "Failed to apply for membership", "error");
    }
    setActionLoading(false);
  };

  const handleRenew = async () => {
    if (!user) return;
    setActionLoading(true);
    const result = await renewMembership(user.id);
    if (result.success) {
      addToast("Membership renewed successfully!", "success");
      await loadMembership();
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
    if (result.success) {
      addToast("Membership canceled successfully", "success");
      await loadMembership();
    } else {
      addToast(result.error || "Failed to cancel membership", "error");
    }
    setActionLoading(false);
  };

  const handleReactivate = async () => {
    if (!user) return;
    setActionLoading(true);
    const result = await reactivateMembership(user.id);
    if (result.success) {
      addToast("Membership reactivated successfully!", "success");
      await loadMembership();
    } else {
      addToast(result.error || "Failed to reactivate membership", "error");
    }
    setActionLoading(false);
  };

  const handleWalkInApply = () => {
    startWalkIn();
    addToast("Welcome! Your 24-hour walk-in session has started. Enjoy! 🎉", "success");
  };

  const handleEndWalkInSession = () => {
    if (!confirm("Are you sure you want to end your walk-in session? You will lose access immediately.")) return;
    clearWalkIn();
    addToast("Walk-in session ended. Thank you for visiting!", "success");
  };

  // Payment handlers
  const handleInitiatePayment = async (method: PaymentMethod) => {
    if (!user || !selectedTier) return;
    try {
      setCompletedTransactionId(null);
      await paymentHook.initializePayment(user.id, selectedTier, MEMBERSHIP_PRICES[selectedTier], method);
      setShowPaymentModal(false);
      setShowPaymentConfirmation(true);
    } catch (err) {
      console.error("Payment error:", err);
    }
  };

  const handlePaymentComplete = async () => {
    const transaction = paymentHook.state.currentTransaction;
    if (!transaction || completedTransactionId === transaction.id) {
      return;
    }

    setCompletedTransactionId(transaction.id);
    setShowPaymentConfirmation(false);

    if (transaction.userType === "walk-in") {
      handleWalkInApply();
      navigate("/walk-in");
      return;
    }

    await handleApply(transaction.userType);
    addToast("Payment completed! Your membership is now active.", "success");
    navigate("/dashboard");
  };

  useEffect(() => {
    const transaction = paymentHook.state.currentTransaction;
    if (
      transaction?.method === "cash" &&
      transaction.status === "paid" &&
      completedTransactionId !== transaction.id
    ) {
      void handlePaymentComplete();
    }
  }, [paymentHook.state.currentTransaction, completedTransactionId]);

  // Demo toggle for admin view
  const toggleAdminView = () => {
    setIsAdmin(!isAdmin);
    addToast(isAdmin ? "Switched to user view" : "Switched to admin view", "success");
  };

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
      title: "Annual",
      amount: "₱1,199",
      interval: "/ year",
      quote: "Maximum savings for year-round training.",
      description: "Most cost-effective plan for consistent training.",
      features: ["Best yearly value", "Locked-in lower rate", "Built for long-term goals"],
      isActive: true,
      tier: "annual" as const,
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

  if (loading) {
    return (
      <div className="rounded-2xl border border-flexNavy/15 bg-flexWhite/60 p-6 animate-pulse">
        <div className="h-8 bg-flexNavy/10 rounded w-32 mb-4"></div>
        <div className="h-6 bg-flexNavy/10 rounded w-48"></div>
      </div>
    );
  }

  if (error && !membership) {
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

  const isDev = import.meta.env.DEV;

  if (walkInSession) {
    return (
      <div className="space-y-4">
        {isDev && (
          <div className="flex gap-2">
            <button onClick={() => setDevShowMembership(!devShowMembership)} className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded border border-purple-200 font-semibold hover:bg-purple-200 transition">
              🔧 Dev: Toggle Membership State
            </button>
            <button onClick={() => clearWalkIn()} className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded border border-orange-200 font-semibold hover:bg-orange-200 transition">
              🔧 Dev: End Walk-In (Test)
            </button>
          </div>
        )}
        <WalkInCard membership={walkInSession} onEndSession={handleEndWalkInSession} isLoading={actionLoading} />
      </div>
    );
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
          <AdminPaymentPanel onConfirmPayment={paymentHook.confirmPayment} />
        ) : (
          <>
            <PricingSection
              plans={plans}
              isLoading={actionLoading}
              onSelectPlan={(plan) => {
                setSelectedTier(plan.tier);
                setShowPaymentModal(true);
              }}
            />
            {selectedTier && (
              <PaymentModal
                isOpen={showPaymentModal}
                selectedUserType={selectedTier}
                onClose={() => {
                  setShowPaymentModal(false);
                  paymentHook.clearError();
                }}
                onInitiatePayment={handleInitiatePayment}
                isLoading={paymentHook.state.status === "processing"}
                error={paymentHook.state.error}
                onClearError={paymentHook.clearError}
              />
            )}
            <PaymentConfirmation
              transaction={paymentHook.state.currentTransaction}
              isOpen={showPaymentConfirmation}
              onClose={() => setShowPaymentConfirmation(false)}
              onComplete={handlePaymentComplete}
            />
          </>
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
        <AdminPaymentPanel onConfirmPayment={paymentHook.confirmPayment} />
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
              {checkInStatus === "idle" && "Generate a QR code to check in"}
              {checkInStatus === "awaiting-checkin" && "Show this QR to the admin to check in"}
              {checkInStatus === "checked-in" && "You are checked in! Generate a QR to check out"}
              {checkInStatus === "awaiting-checkout" && "Show this QR to the admin to check out"}
            </p>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
            checkInStatus === "checked-in" || checkInStatus === "awaiting-checkout"
              ? "bg-green-100 text-green-700 border-green-200"
              : "bg-flexNavy/10 text-flexNavy border-flexNavy/20"
          }`}>
            {checkInStatus === "idle" && "Not Checked In"}
            {checkInStatus === "awaiting-checkin" && "Awaiting Admin..."}
            {checkInStatus === "checked-in" && "Checked In ✓"}
            {checkInStatus === "awaiting-checkout" && "Awaiting Admin..."}
          </span>
        </div>

        {/* QR Code Display */}
        {showQR && (
          <div className="flex flex-col items-center gap-4 my-4 p-5 rounded-2xl bg-white border border-flexNavy/10 shadow-sm">
            <p className="text-xs font-bold tracking-widest text-flexNavy uppercase">
              {checkInStatus === "awaiting-checkin" ? "Check-In QR Code" : "Check-Out QR Code"}
            </p>
            <div className="bg-white p-3 rounded-xl border border-flexNavy/10 shadow-sm">
              <QRCodeSVG value={qrValue} size={180} bgColor="#ffffff" fgColor="#0a0a2e" level="H" />
            </div>
            <p className="text-xs text-flexNavy/50 text-center">
              {checkInStatus === "awaiting-checkin"
                ? "Show this to the admin at the front desk to check in"
                : "Show this to the admin at the front desk to check out"}
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
            {(checkInStatus === "idle") && (
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
            {checkInStatus === "checked-in" && (
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
        {displayMembership.status === "active" && displayStats?.isRenewalWindowOpen && (
          <button onClick={handleRenew} disabled={actionLoading} className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {actionLoading ? "Renewing..." : "Renew Membership"}
          </button>
        )}
        {displayMembership.status === "active" && !displayStats?.isCanceled && (
          <button onClick={handleCancel} disabled={actionLoading} className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-70 disabled:cursor-not-allowed">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            {actionLoading ? "Canceling..." : "Cancel Membership"}
          </button>
        )}
        {displayStats?.isCanceled && displayMembership.status === "active" && (
          <button onClick={handleReactivate} disabled={actionLoading} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {actionLoading ? "Reactivating..." : "Reactivate Membership"}
          </button>
        )}
        {displayMembership.status === "expired" && (
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