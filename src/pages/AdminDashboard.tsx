import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  applyMembership,
  fetchDashboardStats,
} from "../lib/membershipService";
import type { MembershipTier } from "../types/membership";
import { getRecentCheckIns, type CheckInResponse } from "../lib/checkInService";
import QRScanner from "../components/QRScanner";
import AdminPaymentPanel from "../components/AdminPaymentPanel";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import CrowdEstimationPanel from "../components/CrowdEstimationPanel";
import { usePayment } from "../hooks/usePayment";
import { PaymentStateContext } from "../design-patterns";

type RecentCheckInRecord = {
  id: string;
  user_id: string | null;
  check_in_type: string;
  check_in_time: string;
  status: string;
};

type ProfileRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [totalMembers, setTotalMembers] = useState(0);
  const [activePlans, setActivePlans] = useState(0);
  const [expiringSoon, setExpiringSoon] = useState(0);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [recentCheckIns, setRecentCheckIns] = useState<RecentCheckInRecord[]>([]);
  const [todayCheckInCount, setTodayCheckInCount] = useState(0);
  const [scanMessage, setScanMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isTransactionHistoryExpanded, setIsTransactionHistoryExpanded] = useState(false);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const paymentHook = usePayment("admin");
  const transactionHistory = paymentHook.getTransactionHistory();
  
  // Payment state tracking - to enforce state machine transitions
  const [paymentStateContexts, setPaymentStateContexts] = useState<Map<string, PaymentStateContext>>(new Map());

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      setIsLoadingMembers(true);
const [stats, checkIns] = await Promise.all([
  fetchDashboardStats(),
  getRecentCheckIns(5),
]);
const { totalMembers: membersCount, activePlans: activePlansCount, expiringSoon: expiringSoonCount } = stats;
      if (isMounted) {
        setTotalMembers(membersCount);
        setActivePlans(activePlansCount);
        setExpiringSoon(expiringSoonCount);
        setRecentCheckIns(checkIns);

        // Count today's check-ins
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayCount = checkIns.filter((check) => {
          const checkDate = new Date(check.check_in_time);
          checkDate.setHours(0, 0, 0, 0);
          return checkDate.getTime() === today.getTime();
        }).length;
        setTodayCheckInCount(todayCount);

        setIsLoadingMembers(false);
      }
    };

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load member names for transactions
  useEffect(() => {
    let isMounted = true;

    const loadMemberNames = async () => {
      if (transactionHistory.length === 0 || !supabase) {
        // console.log("Skipping member names load:", { historyLength: transactionHistory.length, hasSupabase: !!supabase });
        return;
      }

      // Get unique user IDs from transaction history
      const uniqueUserIds = [...new Set(transactionHistory.map((t) => t.userId))];
      // console.log("Loading member names for userIds:", uniqueUserIds);

      try {
        // Query profiles table for full_name and email
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", uniqueUserIds);

        // console.log("Profiles query result:", { error, dataLength: data?.length, data });

        if (isMounted && data) {
          const names: Record<string, string> = {};
          
          // Map profiles to names
          (data as ProfileRecord[]).forEach((profile) => {
            const name = profile.full_name?.trim() || profile.email || profile.id;
            names[profile.id] = name;
            // console.log(`Mapped ${profile.id} -> ${name}`);
          });
          
          // For any missing IDs, use email from auth users or just the ID
          for (const userId of uniqueUserIds) {
            if (!names[userId]) {
              names[userId] = userId; // Fallback to ID if not found
            }
          }
          
          // console.log("Final mapped names:", names);
          setMemberNames(names);
        } else if (error) {
          // console.error("Supabase error:", error);
        }
      } catch {
        // console.error("Error loading member names");
      }
    };

    loadMemberNames();

    return () => {
      isMounted = false;
    };
  }, [transactionHistory]);

  const handleScanSuccess = (result: CheckInResponse) => {
    setScanMessage({ text: result.message, type: "success" });
    setTodayCheckInCount((prev) => prev + 1);
    // Reload recent check-ins
    getRecentCheckIns(5).then((checkIns) => {
      setRecentCheckIns(checkIns);
    });
    setTimeout(() => setScanMessage(null), 4000);
  };

  const handleScanError = (error: string) => {
    setScanMessage({ text: `Scan Error: ${error}`, type: "error" });
    setTimeout(() => setScanMessage(null), 4000);
  };
  // Helper to restore a PaymentStateContext to match a transaction's real status
  const getOrRestoreStateContext = (
    transactionId: string,
    status: "awaiting-confirmation" | "awaiting-verification"
  ) => {
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
    
    const handleAdminConfirmPayment = async (
    transactionId: string,
    userId: string,
    userType: MembershipTier
  ) => {
    try {
      const stateContext = getOrRestoreStateContext(transactionId, "awaiting-confirmation");

      if (stateContext.canPerformAction("confirm")) {
        stateContext.confirm(); // awaiting-confirmation → paid

        await paymentHook.confirmPayment(transactionId);
        await applyMembership(userId, userType);

        const newContexts = new Map(paymentStateContexts);
        newContexts.set(transactionId, stateContext);
        setPaymentStateContexts(newContexts);
      }
    } catch (err) {
      console.error("Failed to apply membership after confirmation:", err);
    }
  };

  const handleAdminDeclinePayment = async (
    transactionId: string,
    _userId: string,
    _userType: MembershipTier
  ) => {
    try {
      const stateContext = getOrRestoreStateContext(transactionId, "awaiting-confirmation");

      if (stateContext.canPerformAction("reject")) {
        stateContext.reject("Declined by admin");

        await paymentHook.failPayment(transactionId, "Declined by admin");

        const newContexts = new Map(paymentStateContexts);
        newContexts.set(transactionId, stateContext);
        setPaymentStateContexts(newContexts);
      }
    } catch (error) {
      console.error("Failed to decline payment:", error);
    }
  };

  const handleAdminVerifyOnlinePayment = async (
    transactionId: string,
    userId: string,
    userType: MembershipTier
  ) => {
    try {
      const stateContext = getOrRestoreStateContext(transactionId, "awaiting-verification");

      if (stateContext.canPerformAction("confirm")) {
        stateContext.confirm(); // awaiting-verification → paid

        await paymentHook.verifyOnlinePaymentProof(transactionId);
        await applyMembership(userId, userType);

        const newContexts = new Map(paymentStateContexts);
        newContexts.set(transactionId, stateContext);
        setPaymentStateContexts(newContexts);
      }
    } catch (error) {
      console.error("Failed to verify online payment:", error);
    }
  };

  const handleAdminRejectOnlinePayment = async (
    transactionId: string,
    _userId: string,
    _userType: MembershipTier,
    reason: string
  ) => {
    try {
      const stateContext = getOrRestoreStateContext(transactionId, "awaiting-verification");

      if (stateContext.canPerformAction("reject")) {
        stateContext.reject(reason);

        await paymentHook.rejectOnlinePaymentProof(transactionId, reason);

        const newContexts = new Map(paymentStateContexts);
        newContexts.set(transactionId, stateContext);
        setPaymentStateContexts(newContexts);
      }
    } catch (error) {
      console.error("Failed to reject online payment:", error);
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }

    navigate("/admin/login");
  };

  return (
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

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl border border-flexNavy/15 bg-flexWhite p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-flexNavy">Total Members</p>
            <p className="mt-2 text-3xl font-bold text-flexBlack">
              {isLoadingMembers ? "..." : totalMembers}
            </p>
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

        {/* Transaction History Section */}
        <section className="mt-6">
          <button
            onClick={() => setIsTransactionHistoryExpanded(!isTransactionHistoryExpanded)}
            className="w-full rounded-xl border border-flexNavy/15 bg-flexWhite p-4 hover:bg-flexWhite/80 transition text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-flexNavy">Total Transactions</p>
                <p className="mt-2 text-3xl font-bold text-flexBlack">
                  {transactionHistory.length}
                </p>
              </div>
              <svg
                className={`h-6 w-6 text-flexNavy transition-transform ${isTransactionHistoryExpanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </button>

          {isTransactionHistoryExpanded && (
            <div className="mt-4 rounded-xl border border-flexNavy/15 bg-flexWhite/70 p-6">
              {transactionHistory.length === 0 ? (
                <p className="text-center text-sm text-flexNavy/60 py-8">No transactions yet</p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-5 gap-4 pb-3 border-b border-flexNavy/10">
                    <p className="text-xs font-semibold uppercase tracking-wider text-flexNavy">Member Name</p>
                    <p className="text-xs font-semibold uppercase tracking-wider text-flexNavy">Membership</p>
                    <p className="text-xs font-semibold uppercase tracking-wider text-flexNavy">Amount</p>
                    <p className="text-xs font-semibold uppercase tracking-wider text-flexNavy">Method</p>
                    <p className="text-xs font-semibold uppercase tracking-wider text-flexNavy">Date & Time</p>
                  </div>
                  {transactionHistory.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="grid grid-cols-5 gap-4 p-3 rounded-lg bg-flexWhite/50 border border-flexNavy/10 hover:bg-flexWhite transition"
                    >
                      <p className="text-sm text-flexBlack font-semibold truncate">{memberNames[transaction.userId] || transaction.userId}</p>
                      <p className="text-sm text-flexBlack capitalize">{transaction.userType}</p>
                      <p className="text-sm text-flexBlack font-semibold">₱{transaction.amount.toLocaleString()}</p>
                      <div className="flex items-center">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          transaction.method === "cash"
                            ? "bg-flexNavy text-flexWhite"
                            : transaction.method === "online"
                              ? "bg-flexBlue text-flexBlack"
                              : "bg-flexBlack text-flexBlue"
                        }`}>
                          {transaction.method}
                        </span>
                      </div>
                      <p className="text-sm text-flexNavy/60">
                        {new Date(transaction.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Analytics Dashboard */}
        <AnalyticsDashboard />

        {/* Crowd Estimation */}
        <CrowdEstimationPanel showAdminControls />

        {/* Pending Payments Panel */}
        <section className="mt-6">
          <AdminPaymentPanel
            onConfirmPayment={handleAdminConfirmPayment}
            onDeclinePayment={handleAdminDeclinePayment}
            onVerifyOnlinePayment={handleAdminVerifyOnlinePayment}
            onRejectOnlinePayment={handleAdminRejectOnlinePayment}
          />
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

        {/* QR Scanner Section */}
        <section className="mt-6">
          <QRScanner onScanSuccess={handleScanSuccess} onScanError={handleScanError} />
        </section>

        {/* Recent Check-Ins */}
        {recentCheckIns.length > 0 && (
          <section className="mt-6 rounded-2xl border border-flexNavy/15 bg-flexWhite/70 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-flexNavy">Recent Activity</p>
                <p className="text-sm text-flexNavy/60 mt-0.5">Latest check-in records</p>
              </div>
            </div>

            <div className="space-y-3">
              {recentCheckIns.map((checkIn) => (
                <div key={checkIn.id} className="flex items-center justify-between p-3 rounded-lg bg-flexWhite/50 border border-flexNavy/10">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${checkIn.check_in_type === "checkin" ? "bg-green-500" : "bg-blue-500"}`}></div>
                    <div>
                      <p className="text-sm font-semibold text-flexBlack">
                        {checkIn.check_in_type === "checkin"
                          ? "Check-In"
                          : checkIn.check_in_type === "checkout"
                            ? "Check-Out"
                            : "Walk-In"}
                      </p>
                      <p className="text-xs text-flexNavy/60">
                        {new Date(checkIn.check_in_time).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${checkIn.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {checkIn.status || "Completed"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
