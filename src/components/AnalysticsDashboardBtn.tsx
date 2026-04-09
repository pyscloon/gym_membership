import { useNavigate } from "react-router-dom";

type AnalyticsDashboardButtonProps = {
  className?: string;
  label?: string;
};

export default function AnalyticsDashboardButton({
  className,
  label = "Analytics Dashboard",
}: AnalyticsDashboardButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/admin/analytics")}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-lg border border-flexNavy/20 bg-flexWhite px-4 py-2 text-sm font-semibold text-flexBlack transition hover:bg-gray-50"
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
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      {label}
    </button>
  );
}