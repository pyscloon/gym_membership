import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MemberTransactionHistory, {
  type MemberTransaction,
} from "../components/MemberTransactionHistory";

type LocationState = {
  transactions?: MemberTransaction[];
};

export default function TransactionHistoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { transactions = [] } = (location.state as LocationState) ?? {};

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#f7fbff] via-[#f0f7ff] to-[#e3f2fd]">
      <Header />
      <main className="relative mx-auto w-full max-w-7xl px-6 py-10 sm:px-10 lg:px-14">

        {/* Page Header */}
        <section className="mb-8 overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-r from-[#021738] via-[#0b2f63] to-[#0f4e8c] px-8 py-10 text-white shadow-[0_30px_65px_rgba(4,23,56,0.35)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-flexBlue">
                Billing
              </p>
              <h1 className="mt-2 text-3xl font-black sm:text-5xl">
                Transaction History
              </h1>
              <p className="mt-3 max-w-2xl text-white/85">
                A full record of your membership payments and billing activity.
              </p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="order-first inline-flex items-center gap-2 self-start rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 sm:order-last sm:self-center"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </button>
          </div>
        </section>

        <div className="rounded-[2rem] border border-flexNavy/10 bg-white/95 p-5 shadow-[0_16px_38px_rgba(2,37,70,0.08)] backdrop-blur-sm sm:p-10">
          <MemberTransactionHistory transactions={transactions} />
        </div>
      </main>
    </div>
  );
}