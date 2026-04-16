import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { fetchDashboardStats } from "../lib/membershipService";
import type { MembershipTier } from "../types/membership";
import { getRecentCheckIns, type CheckInResponse } from "../lib/checkInService";
import QRScanner from "../components/QRScanner";
import AdminPaymentPanel from "../components/AdminPaymentPanel";
import AnalyticsDashboardButton from "../components/AnalysticsDashboardBtn";
import CrowdEstimationPanel from "../components/CrowdEstimationPanel";
import { usePayment } from "../hooks/usePayment";
import { PaymentStateContext } from "../design-patterns";
import TransactionHistory from "../components/TransactionHistory";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { safeSteateUpdate, executeWithRetry, DEFAULT_RETRY_CONFIG } from "../lib/stabilityUtils";

type RecentCheckInRecord = {
  id: string;
  user_id: string | null;
  walk_in_type: string;
  walk_in_time: string;
  status: string;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const isMountedRef = useRef(true);

  // ✅ Basic UI state
  const [showScanner, setShowScanner] = useState(false);
  const [showRecentCheckIns, setShowRecentCheckIns] = useState(false);
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
  const [scanMessage, setScanMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // ✅ Data state
  const [totalMembers, setTotalMembers] = useState(0);
  const [activePlans, setActivePlans] = useState(0);
  const [expiringSoon, setExpiringSoon] = useState(0);
  const [recentCheckIns, setRecentCheckIns] = useState<RecentCheckInRecord[]>([]);
  const [todayCheckInCount, setTodayCheckInCount] = useState(0);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);

  // ✅ Payment state tracking - enforce state machine transitions
  const [paymentStateContexts, setPaymentStateContexts] = useState<Map<string, PaymentStateContext>>(new Map());

  const paymentHook = usePayment("admin");
  const transactionHistory = paymentHook.getTransactionHistory();

  // ✅ Safe dashboard data loading
  const fetchTodayWalkInCount = async () => {
    if (!supabase) return;
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { count, error } = await supabase
        .from("walk_ins")
        .select("*", { count: "exact", head: true })
        .gte("walk_in_time", today.toISOString())
        .lt("walk_in_time", tomorrow.toISOString());

      if (error) {
        console.error("Error fetching walk-in count:", error);
        return;
      }

      if (isMountedRef.current) {
        safeSteateUpdate(isMountedRef.current, setTodayCheckInCount, count ?? 0, "fetchTodayWalkInCount");
      }
    } catch (err) {
      console.error("fetchTodayWalkInCount error:", err);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    const loadDashboardData = async () => {
      try {
        safeSteateUpdate(isMountedRef.current, setIsLoadingMembers, true, "AdminDashboard");
        safeSteateUpdate(isMountedRef.current, setDashboardError, null, "AdminDashboard");

        // Load stats with retry logic
        const stats = await executeWithRetry(
          fetchDashboardStats,
          "fetchDashboardStats",
          DEFAULT_RETRY_CONFIG
        );

        if (!stats && isMountedRef.current) {
          safeSteateUpdate(
            isMountedRef.current,
            setDashboardError,
            "Failed to load dashboard statistics. Please try again.",
            "AdminDashboard"
          );
          return;
        }

        // Load check-ins with retry logic
        const checkIns = await executeWithRetry(
          () => getRecentCheckIns(5),
          "getRecentCheckIns",
          DEFAULT_RETRY_CONFIG
        );

        if (isMountedRef.current && stats) {
          const {
            totalMembers: membersCount,
            activePlans: activePlansCount,
            expiringSoon: expiringSoonCount,
          } = stats;
          safeSteateUpdate(isMountedRef.current, setTotalMembers, membersCount, "AdminDashboard");
          safeSteateUpdate(isMountedRef.current, setActivePlans, activePlansCount, "AdminDashboard");
          safeSteateUpdate(isMountedRef.current, setExpiringSoon, expiringSoonCount, "AdminDashboard");
          safeSteateUpdate(
            isMountedRef.current,
            setRecentCheckIns,
            checkIns || [],
            "AdminDashboard"
          );
          safeSteateUpdate(isMountedRef.current, setIsLoadingMembers, false, "AdminDashboard");
        }

        // Load today's count separately to prevent blocking
        await fetchTodayWalkInCount();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        console.error("Dashboard load error:", errorMsg);
        if (isMountedRef.current) {
          safeSteateUpdate(
            isMountedRef.current,
            setDashboardError,
            errorMsg,
            "AdminDashboard"
          );
          safeSteateUpdate(isMountedRef.current, setIsLoadingMembers, false, "AdminDashboard");
        }
      }
    };

    loadDashboardData();

    return () => {
      isMountedRef.current = false;
    };
  }, []);
  // ✅ Helper to restore a PaymentStateContext to match a transaction's real status
  const getOrRestoreStateContext = (
    transactionId: string,
    status: "awaiting-confirmation" | "awaiting-verification"
  ): PaymentStateContext => {
    const existing = paymentStateContexts.get(transactionId);
    if (existing && existing.isAwaitingAction()) return existing;

    // Brand-new context starts at idle — walk it to the correct state
    const ctx = new PaymentStateContext();
    ctx.initiate(); // idle → processing
    if (status === "awaiting-confirmation") {
      ctx.requiresAdminConfirmation(); // processing → awaiting-confirmation
    } else {
      ctx.requiresProofVerification(); // processing → awaiting-verification
    }
    return ctx;
  };

  const handleScanSuccess = (result: CheckInResponse) => {
    setScanMessage({ text: result.message, type: "success" });
    setTodayCheckInCount((prev) => prev + 1);
    // Reload recent check-ins
    getRecentCheckIns(5)
      .then((checkIns) => {
        if (isMountedRef.current) {
          safeSteateUpdate(isMountedRef.current, setRecentCheckIns, checkIns, "handleScanSuccess");
        }
      })
      .catch((err) => {
        console.error("Error reloading check-ins:", err);
      });
    setTimeout(() => {
      if (isMountedRef.current) {
        setScanMessage(null);
      }
    }, 4000);
  };

  const handleScanError = (error: string) => {
    setScanMessage({ text: `Scan Error: ${error}`, type: "error" });
    setTimeout(() => {
      if (isMountedRef.current) {
        setScanMessage(null);
      }
    }, 4000);
  };
  const handleAdminConfirmPayment = async (
    transactionId: string,
    userId: string,
    userType: MembershipTier
  ) => {
    void userId;
    void userType;
    try {
      const stateContext = getOrRestoreStateContext(transactionId, "awaiting-confirmation");

      if (!stateContext.canPerformAction("confirm")) {
        console.warn("Cannot confirm payment: invalid state");
        return;
      }

      stateContext.confirm();
      
      await paymentHook.confirmPayment(transactionId);

      if (isMountedRef.current) {
        const newContexts = new Map(paymentStateContexts);
        newContexts.set(transactionId, stateContext);
        safeSteateUpdate(
          isMountedRef.current,
          setPaymentStateContexts,
          newContexts,
          "handleAdminConfirmPayment"
        );
      }
    } catch (err) {
      console.error("Failed to confirm payment:", err);
      safeSteateUpdate(
        isMountedRef.current,
        setDashboardError,
        `Payment confirmation failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        "handleAdminConfirmPayment"
      );
    }
  };

  const handleAdminDeclinePayment = async (
    transactionId: string,
    userId: string,
    userType: MembershipTier
  ) => {
    void userId;
    void userType;
    try {
      const stateContext = getOrRestoreStateContext(transactionId, "awaiting-confirmation");

      if (!stateContext.canPerformAction("reject")) {
        console.warn("Cannot reject payment: invalid state");
        return;
      }

      stateContext.reject("Declined by admin");
      await paymentHook.failPayment(transactionId, "Declined by admin");

      if (isMountedRef.current) {
        const newContexts = new Map(paymentStateContexts);
        newContexts.set(transactionId, stateContext);
        safeSteateUpdate(
          isMountedRef.current,
          setPaymentStateContexts,
          newContexts,
          "handleAdminDeclinePayment"
        );
      }
    } catch (error) {
      console.error("Failed to decline payment:", error);
      safeSteateUpdate(
        isMountedRef.current,
        setDashboardError,
        `Payment decline failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "handleAdminDeclinePayment"
      );
    }
  };

  const handleAdminVerifyOnlinePayment = async (
    transactionId: string,
    userId: string,
    userType: MembershipTier
  ) => {
    void userId;
    void userType;
    try {
      const stateContext = getOrRestoreStateContext(transactionId, "awaiting-verification");

      if (!stateContext.canPerformAction("confirm")) {
        console.warn("Cannot verify payment: invalid state");
        return;
      }

      stateContext.confirm(); // awaiting-verification → paid

      await paymentHook.verifyOnlinePaymentProof(transactionId);

      if (isMountedRef.current) {
        const newContexts = new Map(paymentStateContexts);
        newContexts.set(transactionId, stateContext);
        safeSteateUpdate(
          isMountedRef.current,
          setPaymentStateContexts,
          newContexts,
          "handleAdminVerifyOnlinePayment"
        );
      }
    } catch (error) {
      console.error("Failed to verify online payment:", error);
      safeSteateUpdate(
        isMountedRef.current,
        setDashboardError,
        `Payment verification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "handleAdminVerifyOnlinePayment"
      );
    }
  };

  const handleAdminRejectOnlinePayment = async (
    transactionId: string,
    userId: string,
    userType: MembershipTier,
    reason: string
  ) => {
    void userId;
    void userType;
    try {
      const stateContext = getOrRestoreStateContext(transactionId, "awaiting-verification");

      if (!stateContext.canPerformAction("reject")) {
        console.warn("Cannot reject payment: invalid state");
        return;
      }

      stateContext.reject(reason);
      await paymentHook.rejectOnlinePaymentProof(transactionId, reason);

      if (isMountedRef.current) {
        const newContexts = new Map(paymentStateContexts);
        newContexts.set(transactionId, stateContext);
        safeSteateUpdate(
          isMountedRef.current,
          setPaymentStateContexts,
          newContexts,
          "handleAdminRejectOnlinePayment"
        );
      }
    } catch (error) {
      console.error("Failed to reject online payment:", error);
      safeSteateUpdate(
        isMountedRef.current,
        setDashboardError,
        `Payment rejection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "handleAdminRejectOnlinePayment"
      );
    }
  };

  const handleLogout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      navigate("/admin/login");
    } catch (err) {
      console.error("Logout error:", err);
      // Force navigate even if signOut fails
      navigate("/admin/login");
    }
  };

  return (
    <ErrorBoundary onError={(error) => console.error("Dashboard error:", error)}>
      <main className="min-h-screen bg-gradient-to-br from-flexBlack via-flexNavy to-flexBlue p-4 sm:p-8">
        <section className="mx-auto max-w-6xl rounded-2xl border border-flexNavy/20 bg-white p-6 shadow-2xl sm:p-8">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex rounded-full bg-flexBlue/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-flexNavy ring-1 ring-flexBlue/20">
                Admin
              </p>
              <h1 className="mt-2 text-2xl font-bold text-flexBlack sm:text-3xl">Admin Dashboard</h1>
              <p className="mt-1 text-sm text-flexNavy">
                Manage your gym operations from one place.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Logout Admin
              </button>
            </div>
          </header>

          {/* ✅ Error Display - Prominent and dismissible */}
          {dashboardError && (
            <div className="mb-4 flex items-start gap-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="mt-0.5">
                <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-900">Something went wrong</p>
                <p className="mt-1 text-sm text-red-700">{dashboardError}</p>
              </div>
              <button
                onClick={() => setDashboardError(null)}
                className="text-red-700 hover:text-red-900"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}

          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl border border-flexNavy/15 bg-flexWhite p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-flexNavy">Total Members</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-3xl font-bold text-flexBlack">
                {isLoadingMembers ? (
                  <svg className="h-8 w-8 animate-spin text-flexBlue" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  totalMembers
                )}
              </p>
            </div>
          </article>
          <article className="rounded-xl border border-flexNavy/15 bg-flexWhite p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-flexNavy">Active Plans</p>
            <p className="mt-2 text-3xl font-bold text-flexBlack">
              {isLoadingMembers ? "..." : activePlans}
            </p>
          </article>
          <article className="rounded-xl border border-flexNavy/15 bg-flexWhite p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-flexNavy">Expiring Soon</p>
            <p className="mt-2 text-3xl font-bold text-flexBlack">
              {isLoadingMembers ? "..." : expiringSoon}
            </p>
          </article>
          <article className="rounded-xl border border-flexNavy/15 bg-flexWhite p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-flexNavy">Today's Check-Ins</p>
            <p className="mt-2 text-3xl font-bold text-flexBlack">
              {isLoadingMembers ? "..." : todayCheckInCount}
            </p>
          </article>
        </section>

        {/* Crowd Estimation */}
        <CrowdEstimationPanel showAdminControls />

        <TransactionHistory transactions={transactionHistory} />

          {/* Recent Check-Ins */}
          {recentCheckIns.length > 0 && (
            <section className="mt-6">
              <button
                onClick={() => setShowRecentCheckIns(!showRecentCheckIns)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-flexNavy/15 bg-flexWhite/70 text-flexNavy hover:bg-flexWhite transition-colors w-full justify-between"
              >
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-flexNavy/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs uppercase tracking-[0.18em]">Recent Activity</span>
                  <span className="text-xs bg-flexNavy/10 text-flexNavy/60 px-2 py-0.5 rounded-full font-medium">
                    {recentCheckIns.length}
                  </span>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 text-flexNavy/40 transition-transform ${showRecentCheckIns ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showRecentCheckIns && (
                <div className="mt-2 rounded-2xl border border-flexNavy/15 bg-flexWhite/70 p-6">
                  <p className="text-sm text-flexNavy/60 mb-4">Latest check-in records</p>
                  <div className="space-y-3">
                    {recentCheckIns.map((checkIn) => (
                      <div key={checkIn.id} className="flex items-center justify-between p-3 rounded-lg bg-flexWhite/50 border border-flexNavy/10">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            checkIn.walk_in_type === "checkin"
                              ? "bg-blue-500"
                              : checkIn.walk_in_type === "checkout"
                                ? "bg-red-500"
                                : "bg-green-500"
                          }`}></div>
                          <div>
                            <p className="text-sm font-semibold text-flexBlack">
                              {checkIn.walk_in_type === "checkin"
                                ? "Member"
                                : checkIn.walk_in_type === "checkout"
                                  ? "Checked-Out"
                                  : "Walk-In"}
                            </p>
                            <p className="text-xs text-flexNavy/60">
                              {new Date(checkIn.walk_in_time).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${checkIn.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {checkIn.status || "Completed"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
                
          {/* Pending Payments Panel */}
          <section className="mt-6">
            <button
              onClick={() => setShowPaymentPanel(!showPaymentPanel)}
              className="relative flex items-center gap-2 px-4 py-2 rounded-lg border border-flexNavy/15 bg-flexWhite/70 text-flexNavy hover:bg-flexWhite transition-colors w-full justify-between"
            >
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-flexNavy/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span className="text-xs uppercase tracking-[0.18em]">Pending Payments</span>
                {pendingPaymentCount > 0 && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">
                    {pendingPaymentCount}
                  </span>
                )}
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 text-flexNavy/40 transition-transform ${showPaymentPanel ? "rotate-180" : ""}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showPaymentPanel && (
              <div className="mt-2">
                <AdminPaymentPanel
                  onConfirmPayment={handleAdminConfirmPayment}
                  onDeclinePayment={handleAdminDeclinePayment}
                  onVerifyOnlinePayment={handleAdminVerifyOnlinePayment}
                  onRejectOnlinePayment={handleAdminRejectOnlinePayment}
                  onPendingCountChange={setPendingPaymentCount}
                />
              </div>
            )}
          </section>

        <section className="mt-6">
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <AnalyticsDashboardButton className="inline-flex min-w-[240px] items-center justify-center gap-3 rounded-xl border border-flexNavy/20 bg-flexWhite px-8 py-4 text-base font-semibold text-flexBlack shadow-sm transition hover:bg-gray-50" />

            <button
              onClick={() => setShowScanner(!showScanner)}
              className="inline-flex min-w-[240px] items-center justify-center gap-3 rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
                <rect x="7" y="7" width="10" height="10" rx="1" />
              </svg>
              {showScanner ? "Close Scanner" : "Scan QR Code"}
            </button>
          </div>

          {showScanner && (
            <div className="mt-4">
              <QRScanner onScanSuccess={handleScanSuccess} onScanError={handleScanError} />
            </div>
          )}
        </section>

        {/* Scan Status Message */}
        {scanMessage && (
          <div
            className={`mt-6 p-4 rounded-xl border ${
              scanMessage.type === "success"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            <p className="font-semibold text-sm">{scanMessage.text}</p>
          </div>
        )}
      </section>
    </main>
    </ErrorBoundary>
  );
}
