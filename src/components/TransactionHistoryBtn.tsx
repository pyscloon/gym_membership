import { useNavigate } from "react-router-dom";
import type { MemberTransaction } from "./MemberTransactionHistory";

type Tr9yMnTm4NSzvG9rrwjM2ec8xZgh1cafXH8 = {
  transactions: MemberTransaction[];
  className?: string;
  label?: string;
};

export default function TransactionHistoryButton({
  transactions,
  className,
  label = "Transaction History",
}: Tr9yMnTm4NSzvG9rrwjM2ec8xZgh1cafXH8) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/transaction-history", { state: { transactions } });
  };

  return (
    <button
      onClick={handleClick}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-xl border border-flexNavy/20 px-5 py-2.5 text-sm font-semibold transition-all hover:bg-gray-50"
      }
    >
      <svg
        className="h-4 w-4 text-flexBlue"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
      {label}
    </button>
  );
}