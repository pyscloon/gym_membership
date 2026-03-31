import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  applyMembership,
  fetchActivePlansCount,
  fetchExpiringSoonCount,
  fetchTotalMembersCount,
} from "../lib/membershipService";
import type { MembershipTier } from "../types/membership";
import { getRecentCheckIns, type CheckInResponse } from "../lib/checkInService";
import QRScanner from "../components/QRScanner";
import AdminPaymentPanel from "../components/AdminPaymentPanel";
import { usePayment } from "../hooks/usePayment";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [totalMembers, setTotalMembers] = useState(0);
  const [activePlans, setActivePlans] = useState(0);
  const [expiringSoon, setExpiringSoon] = useState(0);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [recentCheckIns, setRecentCheckIns] = useState<any[]>([]);
  const [todayCheckInCount, setTodayCheckInCount] = useState(0);
  const [scanMessage, setScanMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      setIsLoadingMembers(true);
      const [membersCount, activePlansCount, expiringSoonCount, checkIns] = await Promise.all([
        fetchTotalMembersCount(),
        fetchActivePlansCount(),
        fetchExpiringSoonCount(),
        getRecentCheckIns(5),
      ]);

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

  const paymentHook = usePayment("admin")

  const handleAdminConfirmPayment = async (
    transactionId: string,
    userId: string,
    userType: MembershipTier
  ) => {
    try {
      await paymentHook.confirmPayment(transactionId);
      // Apply membership to user once admin confirms payment
      await applyMembership(userId, userType);
      // optional: show a toast or log (could integrate more UI feedback)
      console.log(`Membership for user ${userId} applied for ${userType} after admin confirmation.`);
    } catch (err) {
      console.error("Failed to apply membership after confirmation:", err);
    }
  };

  const handleAdminDeclinePayment = async (
    transactionId: string,
    userId: string,
    userType: MembershipTier
  ) => {
    try {
      await paymentHook.failPayment(transactionId, "Declined by admin");
      console.log(`Payment ${transactionId} declined by admin for user ${userId}, tier ${userType}.`);
    } catch (err) {
      console.error("Failed to decline payment:", err);
    }
  };

  const handleAdminVerifyOnlinePayment = async (
    transactionId: string,
    userId: string,
    userType: MembershipTier
  ) => {
    try {
      await paymentHook.verifyOnlinePaymentProof(transactionId);
      // Apply membership to user once payment is verified
      await applyMembership(userId, userType);
      console.log(`Online payment for user ${userId} verified and membership applied for ${userType}.`);
    } catch (err) {
      console.error("Failed to verify online payment:", err);
    }
  };

  const handleAdminRejectOnlinePayment = async (
    transactionId: string,
    userId: string,
    userType: MembershipTier,
    reason: string
  ) => {
    try {
      await paymentHook.rejectOnlinePaymentProof(transactionId, reason);
      console.log(`Online payment for user ${userId} rejected. Reason: ${reason}`);
    } catch (err) {
      console.error("Failed to reject online payment:", err);
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
