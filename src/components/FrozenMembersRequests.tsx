import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { approveFreezeRequest, rejectFreezeRequest, approveUnfreezeRequest, rejectUnfreezeRequest } from "../lib/membershipService";

const POLL_INTERVAL_MS = 2000; 

interface RequestItem {
  id: string;
  user_id: string;
  tier: string;
  status: string;
}

interface FrozenMembersRequestsProps {
  onPendingCountChange?: (count: number) => void;
}

export default function FrozenMembersRequests({ onPendingCountChange }: FrozenMembersRequestsProps) {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  const fetchRequests = async () => {
    if (!supabase) return;
    setError(null);

    const { data: memberships, error: fetchError } = await supabase
      .from("memberships")
      .select("id, user_id, tier, status, updated_at")
      .in("status", ["freeze-requested", "unfreeze-requested"])
      .order("updated_at", { ascending: false });

    if (!isMountedRef.current) return;

    if (fetchError || !memberships) {
      setError("Failed to load freeze requests.");
      setLoading(false);
      return;
    }

    const userIds = memberships.map((m: RequestItem) => m.user_id);
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

    setRequests(mapped);
    setLastUpdated(new Date());
    setLoading(false);
  };

  // Start polling
  const startPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) void fetchRequests();
    }, POLL_INTERVAL_MS);
  };

  useEffect(() => {
    isMountedRef.current = true;
    void fetchRequests();
    startPolling();

    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    onPendingCountChange?.(requests.length);
  }, [onPendingCountChange, requests.length]);


  const handleApprove = async (userId: string, status: string) => {
    setActionLoading(userId + "-approve");
    let result;
    if (status === "unfreeze-requested") {
      result = await approveUnfreezeRequest(userId);
    } else {
      result = await approveFreezeRequest(userId);
    }
    if (!result.success) setError(result.error ?? "Failed to approve.");
    else await fetchRequests();
    setActionLoading(null);
  };

  const handleReject = async (userId: string, status: string) => {
    setActionLoading(userId + "-reject");
    let result;
    if (status === "unfreeze-requested") {
      result = await rejectUnfreezeRequest(userId);
    } else {
      result = await rejectFreezeRequest(userId);
    }
    if (!result.success) setError(result.error ?? "Failed to reject.");
    else await fetchRequests();
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

    if (requests.length === 0) {
    return (
      <div className="flex items-center justify-between mb-2">
      <p className="text-sm text-gray-500">No pending freeze requests.</p>
      {lastUpdated && (
        <p className="text-xs text-gray-400">
        Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
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
        {/* Visible freeze/unfreeze counts exposed for e2e stability */}
        <div>
          <p
            data-testid="pending-freeze-count"
            data-count={requests.filter((r) => r.status === "freeze-requested").length}
            className="text-xs font-bold uppercase tracking-wider text-[#003B8F]"
          >
            Pending Freeze Requests ({requests.filter((r) => r.status === "freeze-requested").length})
          </p>
          <p
            data-testid="pending-unfreeze-count"
            data-count={requests.filter((r) => r.status === "unfreeze-requested").length}
            className="text-xs text-gray-500 mt-1"
          >
            Pending Unfreeze Requests ({requests.filter((r) => r.status === "unfreeze-requested").length})
          </p>
        </div>
        {lastUpdated && (
            <p className="text-xs text-gray-400">
            Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
        )}
        </div>

      <div className="space-y-3">
        {requests.map((member: any) => (
          <div
            key={member.id}
            data-testid={`freeze-request-${member.user_id}`}
            data-member-id={member.user_id}
            data-member-name={member.user_name}
            className={`flex flex-col gap-3 rounded-xl p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between ${
              member.status === "freeze-requested"
                ? "border border-flexNavy/15 bg-flexWhite"
                : "border border-blue-100 bg-white"
            }`}
          >
            <div>
              <p className="font-semibold text-gray-900">{member.user_name}</p>
              <p className="mt-0.5 text-xs capitalize text-gray-500">{member.tier} plan</p>
              <p className={"mt-1 text-xs " + (member.status === "unfreeze-requested" ? "text-blue-600" : "text-flexNavy")}>
                {member.status === "unfreeze-requested"
                  ? "Requested unfreeze · Awaiting approval"
                  : "Requested freeze · Awaiting approval"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                data-testid={`approve-${member.user_id}`}
                onClick={() => handleApprove(member.user_id, member.status)}
                disabled={actionLoading !== null}
                className="rounded-xl bg-[#0066CC] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#003B8F] disabled:opacity-50"
              >
                {actionLoading === member.user_id + "-approve"
                  ? "Approving..."
                  : member.status === "unfreeze-requested"
                  ? "Approve Unfreeze"
                  : "Approve"}
              </button>
              <button
                onClick={() => handleReject(member.user_id, member.status)}
                disabled={actionLoading !== null}
                className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                {actionLoading === member.user_id + "-reject" ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
