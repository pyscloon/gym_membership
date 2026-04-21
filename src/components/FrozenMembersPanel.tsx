import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  approveFreezeRequest,
  rejectFreezeRequest,
  unfreezeMembership,
} from "../lib/membershipService";

interface FreezeMember {
  id: string;
  user_id: string;
  user_name: string;
  tier: string;
  status: "freeze-requested" | "frozen";
  frozen_at?: string;
  freeze_expires_at?: string;
  renewal_date: string;
}

export default function FrozenMembersPanel() {
  const [members, setMembers] = useState<FreezeMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);

    const { data: memberships, error: fetchError } = await supabase
      .from("memberships")
      .select("id, user_id, tier, status, frozen_at, freeze_expires_at, renewal_date")
      .in("status", ["freeze-requested", "frozen"])
      .order("updated_at", { ascending: false });

    if (fetchError || !memberships) {
      setError("Failed to load members.");
      setLoading(false);
      return;
    }

    const userIds = memberships.map((m: FreezeMember) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    const nameMap = new Map(
      (profiles ?? []).map((p: {id: string; full_name?: string; email?: string} ) => [
        p.id,
        p.full_name?.trim() || p.email || p.id,
      ])
    );

    setMembers(
      memberships.map((m: FreezeMember) => ({
        ...m,
        user_name: nameMap.get(m.user_id) || m.user_id,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    void fetchMembers();
  }, []);

  const handleApprove = async (userId: string) => {
    setActionLoading(userId + "-approve");
    const result = await approveFreezeRequest(userId);
    if (!result.success) setError(result.error ?? "Failed to approve freeze.");
    else await fetchMembers();
    setActionLoading(null);
  };

  const handleReject = async (userId: string) => {
    setActionLoading(userId + "-reject");
    const result = await rejectFreezeRequest(userId);
    if (!result.success) setError(result.error ?? "Failed to reject freeze.");
    else await fetchMembers();
    setActionLoading(null);
  };

  const handleUnfreeze = async (userId: string) => {
    setActionLoading(userId + "-unfreeze");
    const result = await unfreezeMembership(userId);
    if (!result.success) setError(result.error ?? "Failed to unfreeze.");
    else await fetchMembers();
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <p className="mt-2 text-sm text-gray-500">
        No freeze requests or frozen memberships.
      </p>
    );
  }

  const requests = members.filter((m) => m.status === "freeze-requested");
  const frozen = members.filter((m) => m.status === "frozen");

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Freeze Requests */}
      {requests.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#003B8F]">
            Pending Requests ({requests.length})
          </p>
          <div className="space-y-3">
            {requests.map((member) => (
              <div
                key={member.id}
                className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-900">{member.user_name}</p>
                  <p className="mt-0.5 text-xs capitalize text-gray-500">
                    {member.tier} plan
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    Requested freeze · Awaiting approval
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(member.user_id)}
                    disabled={actionLoading !== null}
                    className="rounded-xl bg-[#0066CC] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#003B8F] disabled:opacity-50"
                  >
                    {actionLoading === member.user_id + "-approve"
                      ? "Approving..."
                      : "Approve"}
                  </button>
                  <button
                    onClick={() => handleReject(member.user_id)}
                    disabled={actionLoading !== null}
                    className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    {actionLoading === member.user_id + "-reject"
                      ? "Rejecting..."
                      : "Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Frozen Members */}
      {frozen.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#003B8F]">
            Currently Frozen ({frozen.length})
          </p>
          <div className="space-y-3">
            {frozen.map((member) => {
              const frozenDays = member.frozen_at
                ? Math.ceil(
                    (Date.now() - new Date(member.frozen_at).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : 0;
              const expiresDate = member.freeze_expires_at
                ? new Date(member.freeze_expires_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "N/A";

              return (
                <div
                  key={member.id}
                  className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{member.user_name}</p>
                    <p className="mt-0.5 text-xs capitalize text-gray-500">
                      {member.tier} plan
                    </p>
                    <p className="mt-1 text-xs text-blue-600">
                      Frozen {frozenDays} day{frozenDays !== 1 ? "s" : ""} ago · Auto-expires{" "}
                      {expiresDate}
                    </p>
                  </div>
                  <button
                    onClick={() => handleUnfreeze(member.user_id)}
                    disabled={actionLoading !== null}
                    className="rounded-xl bg-[#0066CC] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#003B8F] disabled:opacity-50"
                  >
                    {actionLoading === member.user_id + "-unfreeze"
                      ? "Unfreezing..."
                      : "Unfreeze"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}