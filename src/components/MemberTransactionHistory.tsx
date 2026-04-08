export type MemberTransaction = {
  id: string;
  date: string;
  membership_type: string;
  amount: number;
  currency: string;
  status: "completed" | "pending" | "failed" | string;
};

type MemberTransactionHistoryProps = {
  transactions: MemberTransaction[];
};

const membershipColor: Record<string, string> = {
  monthly: "bg-flexBlue/10 text-flexBlue border-flexBlue/20",
  quarterly: "bg-purple-50 text-purple-600 border-purple-200",
  annual: "bg-green-50 text-green-600 border-green-200",
  "walk-in": "bg-flexNavy/10 text-flexNavy border-flexNavy/20",
};

const transactionStatusColor: Record<string, string> = {
  completed: "bg-green-50 text-green-600 border-green-200",
  pending: "bg-yellow-50 text-yellow-600 border-yellow-200",
  failed: "bg-red-50 text-red-600 border-red-200",
};

const transactionStatusIconColor: Record<string, string> = {
  completed: "text-green-500",
  pending: "text-yellow-500",
  failed: "text-red-500",
};

const transactionStatusIconPath: Record<string, string> = {
  completed: "M4.5 12.75l6 6 9-13.5",
  pending: "M12 6v6l4 2",
  failed: "M6 18L18 6M6 6l12 12",
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "No date";
  const isoStr = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T"); 
  const date = new Date(isoStr);
  return isNaN(date.getTime())
    ? "Invalid Date"
    : date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
};

export default function MemberTransactionHistory({
  transactions,
}: MemberTransactionHistoryProps) {
    console.log("Transaction dates:", transactions.map(t => t.date));
  return (
    <section className="mt-12 rounded-[1.75rem] border border-flexNavy/10 bg-white/90 p-4 shadow-md sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-flexNavy/5 pb-4">
        <div>
          <h3 className="text-xl font-bold text-flexBlack">Transaction History</h3>
          <p className="text-sm text-flexNavy/60">Recent membership payments</p>
        </div>
        <span className="rounded-full bg-flexNavy/5 px-3 py-1 text-xs font-semibold text-flexNavy/60">
          {transactions.length} records
        </span>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-flexNavy/5 bg-white md:block">
        <table className="w-full text-left">
          <thead className="bg-[#f7fbff] text-xs font-bold uppercase text-flexNavy/40">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Membership Type</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-flexNavy/5">
            {transactions.length > 0 ? (
              transactions.map((txn) => (
                <tr key={txn.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-flexBlack">
                    {formatDate(txn.date)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${
                        membershipColor[txn.membership_type] ?? "bg-gray-50"
                      }`}
                    >
                      {txn.membership_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-flexBlack">
                    ₱{txn.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <StatusBadge status={txn.status} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-10 text-center text-flexNavy/40"
                >
                  No transaction records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-4 md:hidden">
        {transactions.length > 0 ? (
          transactions.map((txn) => (
            <div
              key={txn.id}
              className="space-y-3 rounded-2xl border border-flexNavy/10 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-flexBlack">
                  {formatDate(txn.date)}
                </p>
                <StatusBadge status={txn.status} />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-flexNavy/5 pt-3">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${
                    membershipColor[txn.membership_type] ?? "bg-gray-50"
                  }`}
                >
                  {txn.membership_type}
                </span>
                <div className="text-right">
                  <p className="text-sm font-bold text-flexBlack">
                    ₱{txn.amount.toLocaleString()}
                  </p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-flexNavy/45">
                    {txn.currency}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-flexNavy/5 bg-white p-10 text-center text-flexNavy/40">
            No transaction records found.
          </div>
        )}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${
        transactionStatusColor[status] ?? "bg-gray-50"
      }`}
    >
      <svg
        className={`h-3.5 w-3.5 ${transactionStatusIconColor[status] ?? "text-flexNavy/40"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={transactionStatusIconPath[status] ?? "M12 6v6l4 2"}
        />
      </svg>
      {status}
    </span>
  );
}