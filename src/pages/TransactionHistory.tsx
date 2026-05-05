import { useLocation, useNavigate } from "react-router-dom";
import { DataCard, FadeInSection, PageHeader, SecondaryButton } from "../components/ui";
import type { MemberTransaction } from "../components/MemberTransactionHistory";
import AppTopBar from "../components/ui/AppTopBar";

type LocationState = {
  transactions?: MemberTransaction[];
};

export default function TransactionHistoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { transactions = [] } = (location.state as LocationState) ?? {};

  return (
    <div className="min-h-screen w-full bg-[#EEEEEE]">
      <AppTopBar />
      <main className="mx-auto w-full max-w-7xl px-6 pb-10 pt-28 sm:px-10 lg:px-14">
        {/* Section 1 — Transaction Header */}
        <FadeInSection>
          <PageHeader
            eyebrow="Billing"
            title="Transaction History"
            subtitle="Complete payment records with branded readability and clean hierarchy for fast account auditing."
          />
        </FadeInSection>

        {/* Section 2 — Transaction Table */}
        <FadeInSection>
          <DataCard title="Payment Ledger">
            <div className="mt-4 flex justify-end">
              <SecondaryButton
                type="button"
                className="border-[rgba(0,0,51,0.2)] text-[#000033] hover:text-[#0099FF]"
                onClick={() => navigate(-1)}
              >
                Back
              </SecondaryButton>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="fr-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length > 0 ? (
                    transactions.map((txn) => (
                      <tr key={txn.id}>
                        <td className="text-[#555555]">{new Date(txn.date).toLocaleDateString()}</td>
                        <td className="[font-family:var(--font-label)] uppercase text-[#0066CC]">{txn.user_type}</td>
                        <td className="text-[#000033]">₱{txn.amount.toLocaleString()}</td>
                        <td>
                          <span className="rounded-md bg-[rgba(0,102,204,0.12)] px-3 py-1 text-xs [font-family:var(--font-label)] uppercase text-[#0066CC]">
                            {txn.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[#555555]">
                        <span className="block text-3xl text-[#000033]">◌</span>
                        <span className="fr-label mt-2 inline-block">No transactions yet</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </DataCard>
        </FadeInSection>
      </main>
    </div>
  );
}
