import type { Membership } from "../types/membership";

type WalkInCardProps = {
  membership: Membership;
  onEndSession: () => void;
  isLoading?: boolean;
};

export default function WalkInCard({
  membership,
  onEndSession,
  isLoading = false,
}: WalkInCardProps) {
  return (
    <div className="space-y-6">
      {/* Walk-in Status Card */}
      <section className="rounded-2xl border border-flexNavy/20 bg-flexWhite/70 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-flexNavy font-bold">
              Walk-In Access Active
            </p>
            <div className="mt-3 inline-flex items-center gap-2">
              <span className="inline-flex rounded-full bg-flexBlue/10 text-flexNavy px-4 py-2 text-sm font-semibold border border-flexBlue/30">
                Active
              </span>
              <span className="text-xs font-semibold text-white bg-flexBlue px-3 py-1 rounded-full">
                Guest Pass
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Access Details */}
      <section className="rounded-2xl border border-flexNavy/20 bg-white p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-flexNavy font-bold mb-4">
          Your Access Details
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-flexNavy/70 uppercase tracking-wider font-semibold">
              Type
            </p>
            <p className="mt-2 font-semibold text-flexBlack">Walk-In Guest</p>
          </div>
          <div>
            <p className="text-xs text-flexNavy/70 uppercase tracking-wider font-semibold">
              Started
            </p>
            <p className="mt-2 font-semibold text-flexBlack">
              {new Date(membership.start_date).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          </div>
        </div>
      </section>

      {/* End Session Button */}
      <section className="grid gap-3">
        <button
          onClick={onEndSession}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 rounded-xl border border-flexNavy/30 bg-flexWhite px-4 py-3 font-semibold text-flexNavy transition hover:bg-flexNavy/10 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          {isLoading ? "Ending Session..." : "End Session"}
        </button>

        <p className="text-center text-xs text-flexNavy/70">
          Your access will be revoked when this session ends
        </p>
      </section>
    </div>
  );
}
