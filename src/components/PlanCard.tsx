import { memo, useCallback } from "react";
import type { ReactNode } from "react";
import type { MembershipTier } from "../types/membership";

type PlanCardProps = {
  tier: MembershipTier;
  badge: string;
  title: string;
  amount: string;
  interval: string;
  quote: string;
  description: string;
  features: string[];
  ctaLabel: string;
  icon: ReactNode;
  isActive?: boolean;
  isLoading?: boolean;
  showCta?: boolean;
  isCurrentSubscription?: boolean;
  onSelectPlan: (tier: MembershipTier) => void;
};

function PlanCard({
  tier,
  badge,
  title,
  amount,
  interval,
  quote,
  description,
  features,
  ctaLabel,
  icon,
  isActive = false,
  isLoading = false,
  showCta = true,
  isCurrentSubscription = false,
  onSelectPlan,
}: PlanCardProps) {
  const handleSelect = useCallback(() => {
    onSelectPlan(tier);
  }, [onSelectPlan, tier]);

  return (
    <article
      className={`group relative flex h-full flex-col rounded-[24px] border p-6 transition-all duration-300 ${
        isActive
          ? "border-blue-500/50 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] -translate-y-2 ring-1 ring-blue-500/20"
          : "border-slate-100 bg-white shadow-sm hover:border-slate-300 hover:shadow-lg"
      }`}
    >
      {isActive && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
          Best Value
        </div>
      )}

      <div className="mb-5">
        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {badge}
        </span>
      </div>

      <header className="flex items-center gap-4">
        {/* Unified Icon Style for all cards */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm transition-transform group-hover:scale-110">
          {icon}
        </div>

        <div>
          <h4 className="text-xl font-black tracking-tight text-slate-900">{title}</h4>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">{amount}</span>
            <span className="text-[10px] font-bold uppercase text-slate-400">{interval}</span>
          </div>
        </div>
      </header>

      <blockquote className="mt-5 text-sm font-medium italic leading-relaxed text-slate-500">
        "{quote}"
      </blockquote>

      <div className="my-5 h-px w-full bg-slate-100" />

      <p className="text-sm leading-relaxed text-slate-600 mb-6">
        {description}
      </p>

      <ul className="mb-8 space-y-3.5 text-sm font-medium text-slate-700">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <svg 
              className="h-5 w-5 shrink-0 text-blue-500" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {isCurrentSubscription ? (
        <button
          type="button"
          disabled
          className="mt-auto w-full cursor-not-allowed rounded-xl border border-emerald-300 bg-emerald-50 py-4 text-sm font-bold tracking-widest uppercase text-emerald-700"
        >
          Current Subscription
        </button>
      ) : null}

      {showCta && !isCurrentSubscription ? (
        <button
          type="button"
          onClick={handleSelect}
          disabled={isLoading}
          className={`mt-auto w-full rounded-xl py-4 text-sm font-bold tracking-widest text-white uppercase transition-all active:scale-[0.98] disabled:opacity-50
            bg-[#0c2149] border border-blue-900/30
            shadow-[0_0_15px_rgba(12,33,73,0.4)]
            hover:shadow-[0_0_25px_rgba(12,33,73,0.6)]
            hover:bg-[#142d5f] hover:-translate-y-0.5
          `}
        >
          {isLoading ? "Processing..." : ctaLabel}
        </button>
      ) : null}
    </article>
  );
}

export default memo(PlanCard);