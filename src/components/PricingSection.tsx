import type { ReactNode } from "react";
import type { MembershipTier } from "../types/membership";
import PlanCard from "./PlanCard";

type PricingPlan = {
  badge: string;
  title: string;
  amount: string;
  interval: string;
  quote: string;
  description: string;
  features: string[];
  isActive: boolean;
  tier: MembershipTier;
  ctaLabel: string;
  icon: ReactNode;
};

type PricingSectionProps = {
  plans: PricingPlan[];
  isLoading?: boolean;
  onSelectPlan: (plan: PricingPlan) => void;
};

export default function PricingSection({
  plans,
  isLoading = false,
  onSelectPlan,
}: PricingSectionProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-flexBlue/25 bg-gradient-to-r from-[#f7fbff] via-[#eef7ff] to-[#e5f3ff] p-6 shadow-[0_22px_60px_-36px_rgba(0,102,204,0.55)] sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-flexBlue/18 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-flexNavy/12 blur-3xl" />

      <div className="relative text-center">
        <div className="inline-flex items-center gap-3 rounded-full border border-flexBlue/25 bg-white/70 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.22em] text-flexBlue">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-flexBlue/18 text-flexNavy" aria-hidden="true">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="6" width="18" height="12" rx="2" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18" />
              <circle cx="17" cy="14" r="1" />
            </svg>
          </span>
          Payment Plans
        </div>

        <h3 className="mt-5 text-4xl font-bold tracking-tight text-flexNavy sm:text-5xl">Choose your membership option</h3>
      </div>

      <div className="relative mx-auto mt-8 grid w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <PlanCard
            key={plan.title}
            badge={plan.badge}
            title={plan.title}
            amount={plan.amount}
            interval={plan.interval}
            quote={plan.quote}
            description={plan.description}
            features={plan.features}
            ctaLabel={plan.ctaLabel}
            icon={plan.icon}
            isActive={plan.isActive}
            isLoading={isLoading}
            onSelect={() => onSelectPlan(plan)}
          />
        ))}
      </div>
    </section>
  );
}
