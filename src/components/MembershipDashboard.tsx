import { useEffect, useState } from "react";
import { useAuth } from "../hooks";
import { useWalkIn } from "../hooks/useWalkIn";
import {
  applyMembership,
  cancelMembership,
  fetchUserMembership,
  renewMembership,
  reactivateMembership,
} from "../lib/membershipService";
import {
  type Membership,
  calculateMembershipStats,
} from "../types/membership";
import WalkInCard from "./WalkInCard";

type Toast = {
  id: string;
  message: string;
  type: "success" | "error";
};

export default function MembershipDashboard() {
  const { user } = useAuth();
  const { session: walkInSession, startSession: startWalkIn, clearSession: clearWalkIn } = useWalkIn();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [devShowMembership, setDevShowMembership] = useState(false);

  // Mock membership for testing
  const mockMembership: Membership = {
    id: "test-1",
    user_id: user?.id || "test-user",
    status: "active",
    tier: "monthly",
    start_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
    renewal_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days from now
    cancel_at_period_end: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Use mock data if dev toggle is on, otherwise use real data
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

  const handleApply = async (tier: "monthly" | "annual" = "monthly") => {
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

    if (
      !confirm(
        "Are you sure you want to cancel your membership? You'll retain access until the renewal date."
      )
    ) {
      return;
    }

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
    if (
      !confirm(
        "Are you sure you want to end your walk-in session? You will lose access immediately."
      )
    ) {
      return;
    }
    clearWalkIn();
    addToast("Walk-in session ended. Thank you for visiting!", "success");
  };

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
        <button
          onClick={() => loadMembership()}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  // Dev mode toggle
  const isDev = import.meta.env.DEV;

  // Show walk-in card if active (takes priority over membership state)
  if (walkInSession) {
    return (
      <div className="space-y-4">
        {isDev && (
          <div className="flex gap-2">
            <button
              onClick={() => setDevShowMembership(!devShowMembership)}
              className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded border border-purple-200 font-semibold hover:bg-purple-200 transition"
            >
              🔧 Dev: Toggle Membership State
            </button>
            <button
              onClick={() => clearWalkIn()}
              className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded border border-orange-200 font-semibold hover:bg-orange-200 transition"
            >
              🔧 Dev: End Walk-In (Test)
            </button>
          </div>
        )}
        <WalkInCard
          membership={walkInSession}
          onEndSession={handleEndWalkInSession}
          isLoading={actionLoading}
        />
      </div>
    );
  }

  // No membership - show apply options
  if (!displayMembership) {
    return (
      <div className="space-y-4">
        {isDev && (
          <button
            onClick={() => setDevShowMembership(!devShowMembership)}
            className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded border border-purple-200 font-semibold hover:bg-purple-200 transition"
          >
            🔧 Dev: Toggle Membership State
          </button>
        )}
        <section className="rounded-2xl border border-flexNavy/15 bg-flexWhite/60 p-6">
          <div className="mb-6 text-center">
            <p className="text-xs uppercase tracking-[0.18em] text-flexNavy/75">
              Membership Plans
            </p>
            <p className="mt-2 text-sm text-flexNavy/70">
              You currently do not have an active membership. Choose a plan below to get started!
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <article className="rounded-2xl border border-flexNavy/15 bg-gradient-to-b from-white to-flexBlue/5 p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-flexBlue/15 text-flexNavy">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </span>
                <div>
                  <p className="text-xl font-bold text-flexNavy">Monthly</p>
                  <p className="text-sm font-semibold text-flexBlack">₱499 / month</p>
                </div>
              </div>
              <button
                onClick={() => handleApply("monthly")}
                disabled={actionLoading}
                className="mt-6 w-full rounded-xl bg-flexBlue px-4 py-3 font-semibold text-white transition hover:bg-flexNavy disabled:cursor-not-allowed disabled:opacity-70"
              >
                {actionLoading ? "Applying..." : "Choose Monthly"}
              </button>
            </article>

            <article className="rounded-2xl border border-flexBlue/35 bg-gradient-to-b from-flexBlue/10 to-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-flexNavy/15 text-flexNavy">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </span>
                <div>
                  <p className="text-xl font-bold text-flexNavy">Annual</p>
                  <p className="text-sm font-semibold text-flexBlack">₱1,199 / year</p>
                </div>
              </div>
              <button
                onClick={() => handleApply("annual")}
                disabled={actionLoading}
                className="mt-6 w-full rounded-xl bg-flexNavy px-4 py-3 font-semibold text-white transition hover:bg-flexBlue disabled:cursor-not-allowed disabled:opacity-70"
              >
                {actionLoading ? "Applying..." : "Choose Annual"}
              </button>
            </article>

            <article className="rounded-2xl border border-flexNavy/15 bg-gradient-to-b from-white to-flexNavy/5 p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-flexBlue/15 text-flexNavy">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                </span>
                <div>
                  <p className="text-xl font-bold text-flexNavy">Walk-In Pass</p>
                  <p className="text-sm font-semibold text-flexBlack">₱60 / session</p>
                </div>
              </div>
              <button
                onClick={handleWalkInApply}
                disabled={actionLoading}
                className="mt-6 w-full rounded-xl border border-flexBlue/35 bg-flexBlue/10 px-4 py-3 font-semibold text-flexNavy transition hover:border-flexNavy/40 hover:bg-flexBlue/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {actionLoading ? "Starting..." : "Start Walk-In"}
              </button>
            </article>
          </div>
        </section>
      </div>
    );
  }

  // Has membership - show status and actions
  return (
    <div className="space-y-6">
      {isDev && (
        <button
          onClick={() => setDevShowMembership(!devShowMembership)}
          className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded border border-purple-200 font-semibold hover:bg-purple-200 transition"
        >
          🔧 Dev: Toggle Membership State (Showing Membership)
        </button>
      )}
      {error && (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-700 text-sm">
          {error}
        </div>
      )}

      {/* Status Card */}
      <section className="rounded-2xl border border-flexNavy/15 bg-flexWhite/60 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-flexNavy">
              Membership Status
            </p>
            <div className="mt-3 inline-flex items-center gap-2">
              <span
                className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold border ${
                  displayMembership.status === "active"
                    ? "bg-green-100 text-green-700 border-green-200"
                    : displayMembership.status === "expired"
                    ? "bg-red-100 text-red-700 border-red-200"
                    : "bg-yellow-100 text-yellow-700 border-yellow-200"
                }`}
              >
                {displayMembership.status.charAt(0).toUpperCase() +
                  displayMembership.status.slice(1)}
              </span>
              {displayStats?.isCanceled && (
                <span className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-200">
                  Canceling
                </span>
              )}
              {displayStats?.isRenewalWindowOpen && !displayStats?.isCanceled && (
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  Renew Soon
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            {displayStats && !displayStats.isExpired && (
              <>
                <p className="text-sm text-flexNavy">
                  <span className="font-semibold text-flexBlue">
                    {displayStats.daysUntilRenewal}
                  </span>{" "}
                  days until {displayStats.isCanceled ? "expiration" : "renewal"}
                </p>
                <p className="mt-1 text-xs text-flexNavy/60">
                  {displayStats.daysActive} days active • {displayMembership.tier} plan
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
        <p className="text-xs uppercase tracking-[0.18em] text-flexNavy mb-4">
          Details
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-flexNavy/60 uppercase tracking-wider">
              Plan
            </p>
            <p className="mt-2 font-semibold text-flexBlack capitalize">
              {displayMembership.tier === "monthly" ? "Monthly" : "Annual"}
            </p>
          </div>
          <div>
            <p className="text-xs text-flexNavy/60 uppercase tracking-wider">
              Started
            </p>
            <p className="mt-2 font-semibold text-flexBlack">
              {new Date(displayMembership.start_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-flexNavy/60 uppercase tracking-wider">
              {displayStats?.isCanceled ? "Expires" : "Renews"}
            </p>
            <p className="mt-2 font-semibold text-flexBlack">
              {new Date(displayMembership.renewal_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <section className="grid gap-3 sm:grid-cols-2">
        {displayMembership.status === "active" && displayStats?.isRenewalWindowOpen && (
          <button
            onClick={handleRenew}
            disabled={actionLoading}
            className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {actionLoading ? "Renewing..." : "Renew Membership"}
          </button>
        )}

        {displayMembership.status === "active" && !displayStats?.isCanceled && (
          <button
            onClick={handleCancel}
            disabled={actionLoading}
            className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            {actionLoading ? "Canceling..." : "Cancel Membership"}
          </button>
        )}

        {displayStats?.isCanceled && displayMembership.status === "active" && (
          <button
            onClick={handleReactivate}
            disabled={actionLoading}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {actionLoading ? "Reactivating..." : "Reactivate Membership"}
          </button>
        )}

        {displayMembership.status === "expired" && (
          <button
            onClick={() => handleApply("monthly")}
            disabled={actionLoading}
            className="flex items-center justify-center gap-2 rounded-xl bg-flexBlue px-4 py-3 font-semibold text-white transition hover:bg-flexBlue/90 disabled:opacity-70 disabled:cursor-not-allowed sm:col-span-2"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            {actionLoading ? "Applying..." : "Apply Again"}
          </button>
        )}
      </section>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-lg px-4 py-3 text-sm font-medium text-white animate-in fade-in slide-in-from-bottom-4 ${
              toast.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
