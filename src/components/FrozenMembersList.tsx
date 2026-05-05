import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { unfreezeMembership } from "../lib/membershipService";

const POLL_INTERVAL_MS = 2000;

interface FrozenItem {
  id: string;
  user_id: string;
  tier: string;
  frozen_at?: string;
  freeze_expires_at?: string;
}

export default function FrozenMembersList() {
  const [members, setMembers] = useState<FrozenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  const fetchFrozen = async () => {
    if (!supabase) return;
    setError(null);

    const { data: memberships, error: fetchError } = await supabase
      .from("memberships")
      .select("id, user_id, tier, status, frozen_at, freeze_expires_at, updated_at")
      .eq("status", "frozen")
      .order("updated_at", { ascending: false });

    if (!isMountedRef.current) return;

    if (fetchError || !memberships) {
      setError("Failed to load frozen members.");
      setLoading(false);
      return;
    }

    const userIds = memberships.map((m: FrozenItem) => m.user_id);
    let profiles: any[] = [];
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      profiles = profilesData ?? [];
    }

    if (!isMountedRef.current) return;

    const nameMap = new Map(
      profiles.map((p: { id: string; full_name?: string; email?: string }) => [
        p.id,
        p.full_name?.trim() || p.email || p.id,
      ])
    );

    const mapped = memberships.map((m: any) => ({
      ...m,
      user_name: nameMap.get(m.user_id) || m.user_id,
    }));

    setMembers(mapped);
    setLastUpdated(new Date());
    setLoading(false);
  };

  const startPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) void fetchFrozen();
    }, POLL_INTERVAL_MS);
  };

  useEffect(() => {
    isMountedRef.current = true;
    void fetchFrozen();
    startPolling();

    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleUnfreeze = async (userId: string) => {
    setActionLoading(userId + "-unfreeze");
    const result = await unfreezeMembership(userId);
    if (!result.success) setError(result.error ?? "Failed to unfreeze.");
    else await fetchFrozen();
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

  return (
    <div>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold uppercase tracking-wider text-[#003B8F]">
          Currently Frozen ({members.length})
        </p>
        {lastUpdated && (
          <p className="text-xs text-gray-400">
            Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>

      {members.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">No currently frozen memberships.</p>
      ) : (
        <div className="space-y-3">
          {members.map((member: any) => {
            const frozenDays = member.frozen_at
              ? Math.ceil((Date.now() - new Date(member.frozen_at).getTime()) / (1000 * 60 * 60 * 24))
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
                  <p className="mt-0.5 text-xs capitalize text-gray-500">{member.tier} plan</p>
                  <p className="mt-1 text-xs text-blue-600">
                    Frozen {frozenDays} day{frozenDays !== 1 ? "s" : ""} ago · Auto-expires {expiresDate}
                  </p>
                </div>
                <button
                  onClick={() => handleUnfreeze(member.user_id)}
                  disabled={actionLoading !== null}
                  className="rounded-xl bg-[#0066CC] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#003B8F] disabled:opacity-50"
                >
                  {actionLoading === member.user_id + "-unfreeze" ? "Unfreezing..." : "Unfreeze"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}