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

type TransactionHistoryProps = {
  transactions: Transaction[];
  defaultExpanded?: boolean;
};

export default function TransactionHistory({
  transactions,
  defaultExpanded = false,
}: TransactionHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});

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
      } catch {
        // silently fail — fallback to userId
      }
    };

    loadMemberNames();

    return () => {
      isMounted = false;
    };
  }, [transactions]);

  const methodStyles: Record<string, string> = {
    cash: "bg-flexNavy text-flexWhite",
    online: "bg-flexBlue text-flexBlack",
  };

  return (
    <section className="mt-6">
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

      {isExpanded && (
        <div className="mt-4 rounded-xl border border-flexNavy/15 bg-flexWhite/70 p-6">
          {transactions.length === 0 ? (
            <p className="text-center text-sm text-flexNavy/60 py-8">
              No transactions yet
            </p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-4 pb-3 border-b border-flexNavy/10">
                {["Member Name", "Membership", "Amount", "Method", "Date & Time"].map(
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
                  className="grid grid-cols-5 gap-4 p-3 rounded-lg bg-flexWhite/50 border border-flexNavy/10 hover:bg-flexWhite transition"
                >
                  <p className="text-sm text-flexBlack font-semibold truncate">
                    {memberNames[transaction.userId] || transaction.userId}
                  </p>
                  <p className="text-sm text-flexBlack capitalize">
                    {transaction.userType}
                  </p>
                  <p className="text-sm text-flexBlack font-semibold">
                    ₱{transaction.amount.toLocaleString()}
                  </p>
                  <div className="flex items-center">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        methodStyles[transaction.method] ??
                        "bg-flexBlack text-flexBlue"
                      }`}
                    >
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
  );
}