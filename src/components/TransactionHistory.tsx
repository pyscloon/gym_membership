import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Transaction = {
  id: string;
  userId: string;
  userType: string;
  amount: number;
  method: "cash" | "online" | string;
  createdAt: string;
};

type ProfileRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type MembershipRecord = {
  user_id: string;
  status: string;
  start_date: string;
  renewal_date: string;
  cancel_at_period_end: boolean;
};

type TransactionHistoryProps = {
  transactions: Transaction[];
  defaultExpanded?: boolean;
  minimalView?: boolean;
};

export default function TransactionHistory({
  transactions,
  defaultExpanded = false,
  minimalView = false,
}: TransactionHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(minimalView ? true : defaultExpanded);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [memberStatus, setMemberStatus] = useState<Record<string, "active" | "inactive">>({});
  const [memberFor, setMemberFor] = useState<Record<string, string>>({});
  const [memberSince, setMemberSince] = useState<Record<string, string>>({});

  const formatDateLabel = (dateInput: string) => {
    const value = new Date(dateInput);
    if (Number.isNaN(value.getTime())) return "-";

    return value.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const calculateAccumulatedSubscribedDays = (rows: MembershipRecord[]) => {
    const now = new Date();
    const totalDays = rows.reduce((sum, row) => {
      const start = new Date(row.start_date);
      if (Number.isNaN(start.getTime())) return sum;

      const renewal = new Date(row.renewal_date);
      const hasRenewal = !Number.isNaN(renewal.getTime());
      const end =
        row.status === "active"
          ? now
          : hasRenewal
            ? renewal < now
              ? renewal
              : now
            : now;

      const diffMs = end.getTime() - start.getTime();
      if (diffMs <= 0) return sum;

      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return sum + Math.max(0, days);
    }, 0);

    return `${totalDays} day${totalDays === 1 ? "" : "s"}`;
  };

  useEffect(() => {
    let isMounted = true;

    const loadMemberNames = async () => {
      if (transactions.length === 0 || !supabase) return;

      const uniqueUserIds = [...new Set(transactions.map((t) => t.userId))];

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", uniqueUserIds);

        if (!isMounted || error || !data) return;

        const names: Record<string, string> = {};

        (data as ProfileRecord[]).forEach((profile) => {
          names[profile.id] =
            profile.full_name?.trim() || profile.email || profile.id;
        });

        for (const userId of uniqueUserIds) {
          if (!names[userId]) names[userId] = userId;
        }

        setMemberNames(names);

        const { data: membershipsData, error: membershipsError } = await supabase
          .from("memberships")
          .select("user_id, status, start_date, renewal_date, cancel_at_period_end")
          .in("user_id", uniqueUserIds);

        if (!isMounted || membershipsError || !membershipsData) return;

        const groupedMemberships: Record<string, MembershipRecord[]> = {};
        for (const membership of membershipsData as MembershipRecord[]) {
          if (!groupedMemberships[membership.user_id]) {
            groupedMemberships[membership.user_id] = [];
          }
          groupedMemberships[membership.user_id].push(membership);
        }

        const nextStatus: Record<string, "active" | "inactive"> = {};
        const nextMemberFor: Record<string, string> = {};
        const nextMemberSince: Record<string, string> = {};

        for (const userId of uniqueUserIds) {
          const rows = groupedMemberships[userId] ?? [];

          if (rows.length === 0) {
            nextStatus[userId] = "inactive";
            nextMemberFor[userId] = "-";
            nextMemberSince[userId] = "-";
            continue;
          }

          const activeRows = rows.filter((row) => row.status === "active");
          nextStatus[userId] = activeRows.length > 0 ? "active" : "inactive";

          const sortedByStartDate = [...rows].sort(
            (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
          );

          nextMemberFor[userId] = calculateAccumulatedSubscribedDays(sortedByStartDate);

          if (activeRows.length > 0) {
            const currentSubscription = [...activeRows].sort(
              (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
            )[0];

            nextMemberSince[userId] = currentSubscription
              ? formatDateLabel(currentSubscription.start_date)
              : "-";
          } else {
            const latestKnownSubscription = [...rows].sort(
              (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
            )[0];

            nextMemberSince[userId] = latestKnownSubscription
              ? formatDateLabel(latestKnownSubscription.start_date)
              : "-";
          }
        }

        if (!isMounted) return;
        setMemberStatus(nextStatus);
        setMemberFor(nextMemberFor);
        setMemberSince(nextMemberSince);
      } catch {
        // silently fail — fallback to userId
      }
    };

    loadMemberNames();

    return () => {
      isMounted = false;
    };
  }, [transactions]);

  return (
    <section className="mt-6">
      {!minimalView && (
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className="w-full rounded-xl border border-flexNavy/15 bg-flexWhite p-4 hover:bg-flexWhite/80 transition text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-flexNavy">
                Total Transactions
              </p>
              <p className="mt-2 text-3xl font-bold text-flexBlack">
                {transactions.length}
              </p>
            </div>
            <svg
              className={`h-6 w-6 text-flexNavy transition-transform ${isExpanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
        </button>
      )}

      {isExpanded && (
        <div className={minimalView ? "mt-2" : "mt-4 rounded-xl border border-flexNavy/15 bg-flexWhite/70 p-6"}>
          {transactions.length === 0 ? (
            <p className="text-center text-sm text-flexNavy/60 py-8">
              No transactions yet
            </p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-4 pb-3 border-b border-flexNavy/20">
                {["Member Name", "Activity", "Member for", "Member since"].map(
                  (heading) => (
                    <p
                      key={heading}
                      className="text-xs font-semibold uppercase tracking-wider text-flexNavy"
                    >
                      {heading}
                    </p>
                  )
                )}
              </div>

              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className={minimalView ? "grid grid-cols-4 gap-4 border-b border-flexNavy/15 py-3" : "grid grid-cols-4 gap-4 p-3 rounded-lg bg-flexWhite/50 border border-flexNavy/10 hover:bg-flexWhite transition"}
                >
                  <p className="text-sm text-flexBlack font-semibold truncate">
                    {memberNames[transaction.userId] || transaction.userId}
                  </p>
                  <div className="flex items-center">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        memberStatus[transaction.userId] === "active"
                          ? "bg-[#0066CC] text-white"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      {memberStatus[transaction.userId] === "active" ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-flexBlack">{memberFor[transaction.userId] ?? "-"}</p>
                  <p className="text-sm text-flexNavy/70">{memberSince[transaction.userId] ?? "-"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}