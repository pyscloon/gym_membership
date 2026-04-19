import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { fetchDashboardStats } from "../lib/membershipService";
import type { MembershipTier } from "../types/membership";
import { getRecentCheckIns, type CheckInResponse } from "../lib/checkInService";
import QRScanner from "../components/QRScanner";
import AdminPaymentPanel from "../components/AdminPaymentPanel";
import CrowdEstimationPanel from "../components/CrowdEstimationPanel";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import { usePayment } from "../hooks/usePayment";
import { PaymentStateContext } from "../design-patterns";
import TransactionHistory from "../components/TransactionHistory";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { safeSteateUpdate, executeWithRetry, DEFAULT_RETRY_CONFIG } from "../lib/stabilityUtils";
import AppTopBar from "../components/ui/AppTopBar";
import AdminActionGrid, { type AdminActionKey } from "../components/ui/AdminActionGrid";

type RecentCheckInRecord = {
  id: string;
  user_id: string | null;
  walk_in_type: string;
  walk_in_time: string;
  status: string;
};

type DashboardSection = Exclude<AdminActionKey, "scanQr">;
type TransactionFilter = "all" | "check-ins" | "payments";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const isMountedRef = useRef(true);

  const [showScanner, setShowScanner] = useState(false);
  const [activeSection, setActiveSection] = useState<DashboardSection>("pendingPayment");
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>("all");
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
  const [scanMessage, setScanMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const [totalMembers, setTotalMembers] = useState(0);
  const [activePlans, setActivePlans] = useState(0);
  const [recentCheckIns, setRecentCheckIns] = useState<RecentCheckInRecord[]>([]);
  const [todayCheckInCount, setTodayCheckInCount] = useState(0);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);

  const [paymentStateContexts, setPaymentStateContexts] = useState<Map<string, PaymentStateContext>>(new Map());

  const paymentHook = usePayment("admin");
  const transactionHistory = paymentHook.getTransactionHistory();
  const pendingPayments = paymentHook.getPendingPayments();

  useEffect(() => {
    setPendingPaymentCount(pendingPayments.length);
  }, [pendingPayments.length]);

  const actionItems = useMemo(
    () => [
      {
        key: "scanQr" as const,
        label: "Scan QR Code",
        icon: (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F766E] text-white shadow-md">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
              <rect x="7" y="7" width="10" height="10" rx="1" />
            </svg>
          </div>
        ),
      },
      {
        key: "pendingPayment" as const,
        label: "Pending Payment",
        badgeCount: pendingPaymentCount,
        icon: (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#B45309] text-white shadow-md">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
        ),
      },
      {
        key: "customers" as const,
        label: "Customers",
        icon: (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6D28D9] text-white shadow-md">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 00-3-3.87" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
        ),
      },
      {
        key: "peakHours" as const,
        label: "Peak Hours",
        icon: (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C2410C] text-white shadow-md">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
            </svg>
          </div>
        ),
      },
      {
        key: "recentTransactions" as const,
        label: "Transactions",
        icon: (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#BE123C] text-white shadow-md">
            <span className="text-3xl font-black leading-none">&#8369;</span>
          </div>
        ),
      },
      {
        key: "analytics" as const,
        label: "Analytics",
        icon: (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#166534] text-white shadow-md">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M7 16V8m5 8V5m5 11v-6" />
            </svg>
          </div>
        ),
      },
    ],
    [pendingPaymentCount]
  );

  const shouldShowPayments = transactionFilter !== "check-ins";
  const shouldShowCheckIns = transactionFilter !== "payments";

  const sectionTitleMap: Record<DashboardSection, string> = {
    pendingPayment: "Pending Payment",
    customers: "Customers",
    peakHours: "Peak Hours",
    recentTransactions: "Recent transactions",
    analytics: "Analytics",
  };

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

        const checkIns = await executeWithRetry(
          () => getRecentCheckIns(5),
          "getRecentCheckIns",
          DEFAULT_RETRY_CONFIG
        );

        if (isMountedRef.current && stats) {
          const { totalMembers: membersCount, activePlans: activePlansCount } = stats;
          safeSteateUpdate(isMountedRef.current, setTotalMembers, membersCount, "AdminDashboard");
          safeSteateUpdate(isMountedRef.current, setActivePlans, activePlansCount, "AdminDashboard");
          safeSteateUpdate(
            isMountedRef.current,
            setRecentCheckIns,
            checkIns || [],
            "AdminDashboard"
          );
          safeSteateUpdate(isMountedRef.current, setIsLoadingMembers, false, "AdminDashboard");
        }

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

  const getOrRestoreStateContext = (
    transactionId: string,
    status: "awaiting-confirmation" | "awaiting-verification"
  ): PaymentStateContext => {
    const existing = paymentStateContexts.get(transactionId);
    if (existing && existing.isAwaitingAction()) return existing;

    const ctx = new PaymentStateContext();
    ctx.initiate();
    if (status === "awaiting-confirmation") {
      ctx.requiresAdminConfirmation();
    } else {
      ctx.requiresProofVerification();
    }
    return ctx;
  };

  const handleActionClick = (key: AdminActionKey) => {
    if (key === "scanQr") {
      setShowScanner((prev) => !prev);
      return;
    }

    setActiveSection(key);
    if (key === "recentTransactions") {
      setTransactionFilter("all");
    }
  };

  const renderRecentCheckInsList = () => (
    <section className="mt-4">
      {recentCheckIns.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">No recent check-ins available.</p>
      ) : (
        <div className="space-y-1">
          {recentCheckIns.map((checkIn) => (
            <div key={checkIn.id} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0 bg-transparent">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                   <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                   </svg>
                </div>
                <div>
                  <p className="text-[15px] font-bold text-gray-900">
                    {checkIn.walk_in_type === "checkin"
                      ? "Member Check-in"
                      : checkIn.walk_in_type === "checkout"
                        ? "Checked-Out"
                        : "Walk-In"}
                  </p>
                  <p className="text-[13px] text-gray-500 mt-0.5">
                    Activity • {new Date(checkIn.walk_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-bold text-white tracking-wide ${
                    checkIn.status === "completed"
                      ? "bg-[#0FA989]"
                      : "bg-[#FDB52A]"
                  }`}
                >
                  {checkIn.status === "completed" ? "Paid" : "Pending"}
                </span>
                <button className="text-gray-300 hover:text-gray-500 transition-colors">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  const renderDynamicContent = () => {
    if (activeSection === "pendingPayment") {
      return (
        <section className="mt-4">
          <AdminPaymentPanel
            onConfirmPayment={handleAdminConfirmPayment}
            onDeclinePayment={handleAdminDeclinePayment}
            onVerifyOnlinePayment={handleAdminVerifyOnlinePayment}
            onRejectOnlinePayment={handleAdminRejectOnlinePayment}
            onPendingCountChange={setPendingPaymentCount}
          />
        </section>
      );
    }

    if (activeSection === "peakHours") {
      return <div className="mt-4"><CrowdEstimationPanel showAdminControls /></div>;
    }

    if (activeSection === "recentTransactions") {
      return (
        <section className="mt-2">
          <div className="flex flex-wrap gap-2 mb-2">
            {(["all", "check-ins", "payments"] as TransactionFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setTransactionFilter(filter)}
                className={`rounded-full px-5 py-2 text-[13px] font-semibold transition-all duration-200 ${
                  transactionFilter === filter
                    ? "bg-[#0FA989] text-white shadow-sm"
                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {filter === "all" ? "All invoices" : filter === "check-ins" ? "Check-ins" : "Payments"}
              </button>
            ))}
          </div>

          {shouldShowPayments && <TransactionHistory transactions={transactionHistory} defaultExpanded />}
          {shouldShowCheckIns && renderRecentCheckInsList()}
        </section>
      );
    }

    if (activeSection === "analytics") {
      return <div className="mt-4"><AnalyticsDashboard showBackButton={false} /></div>;
    }

    return null;
  };

  const handleScanSuccess = (result: CheckInResponse) => {
    setScanMessage({ text: result.message, type: "success" });
    setTodayCheckInCount((prev) => prev + 1);
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

      stateContext.confirm();

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
      navigate("/");
    } catch (err) {
      console.error("Logout error:", err);
      navigate("/");
    }
  };

  return (
    <ErrorBoundary onError={(error) => console.error("Dashboard error:", error)}>
      <main className="min-h-screen bg-[#F8F9FA] relative font-sans">
        
        {/* Blue Grid Background Layer - Top */}
        <div className="absolute top-0 left-0 right-0 h-72 bg-gradient-to-b from-[#0066CC]/35 via-[#0099FF]/20 to-transparent z-0 pointer-events-none rounded-b-[40px]">
          <div className="fr-grid absolute inset-0 opacity-60" aria-hidden="true" />
        </div>

        {/* Blue Grid Background Layer - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-[#0066CC]/30 via-[#0099FF]/15 to-transparent z-0 pointer-events-none rounded-t-[40px]">
          <div className="fr-grid absolute inset-0 opacity-50" aria-hidden="true" />
        </div>

        <div className="relative z-10">
          <AppTopBar fixed={false} mode="admin-actions" onLogout={handleLogout} />

          <section className="mx-auto max-w-6xl px-5 pb-8 pt-4 sm:px-6">
            {dashboardError && (
              <div className="mb-4 flex items-start gap-4 rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
                <div className="mt-0.5">
                  <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-red-900">Something went wrong</p>
                  <p className="mt-1 text-sm text-red-700">{dashboardError}</p>
                </div>
                <button onClick={() => setDashboardError(null)} className="text-red-700 hover:text-red-900">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}

            {/* Redesigned Stats Card Container */}
            <section className="mt-2 rounded-2xl bg-white/70 backdrop-blur-xl p-3 sm:p-5 shadow-sm ring-1 ring-white/50">
              <div className="flex justify-between gap-2 sm:gap-4 sm:divide-x sm:divide-gray-200/60">
                <article className="flex-1 min-w-0 px-1 sm:px-4">
                  <p className="text-xs sm:text-[13px] font-medium text-gray-600 truncate">Total members</p>
                  <p className="mt-2 text-lg sm:text-3xl font-bold text-gray-900">
                    {isLoadingMembers ? "..." : totalMembers}
                  </p>
                  <p className="mt-1 text-[10px] sm:text-[11px] italic text-gray-400 truncate">All time</p>
                </article>

                <article className="flex-1 min-w-0 px-1 sm:px-4">
                  <p className="text-xs sm:text-[13px] font-medium text-gray-600 truncate">Active plans</p>
                  <p className="mt-2 text-lg sm:text-3xl font-bold text-gray-900">
                    {isLoadingMembers ? "..." : activePlans}
                  </p>
                  <p className="mt-1 text-[10px] sm:text-[11px] italic text-gray-400 truncate">Currently active</p>
                </article>

                <article className="flex-1 min-w-0 px-1 sm:px-4">
                  <p className="text-xs sm:text-[13px] font-medium text-gray-600 truncate">Today's check-ins</p>
                  <p className="mt-2 text-lg sm:text-3xl font-bold text-gray-900">
                    {isLoadingMembers ? "..." : todayCheckInCount}
                  </p>
                  <p className="mt-1 text-[10px] sm:text-[11px] italic text-gray-400 truncate">Last 24 hours</p>
                </article>
              </div>
            </section>

            <div className="mt-14 sm:mt-16">
              <AdminActionGrid
                actions={actionItems}
                activeSection={activeSection}
                onActionClick={handleActionClick}
              />
            </div>

            <section className="mt-8">
              <h2 className="text-xl font-bold tracking-tight text-gray-900">
                {sectionTitleMap[activeSection]}
              </h2>
            </section>

            {renderDynamicContent()}

            {scanMessage && (
              <div
                className={`mt-6 rounded-xl border p-4 shadow-sm ${
                  scanMessage.type === "success"
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                <p className="text-sm font-semibold">{scanMessage.text}</p>
              </div>
            )}
          </section>
        </div>

        {showScanner && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-800">Scan QR Code</p>
                  <p className="mt-1 text-sm text-gray-500">Scan without leaving your current section.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowScanner(false)}
                  className="rounded-full bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-200 transition"
                >
                  Close
                </button>
              </div>
              <QRScanner onScanSuccess={handleScanSuccess} onScanError={handleScanError} />
            </div>
          </div>
        )}
      </main>
    </ErrorBoundary>
  );
}