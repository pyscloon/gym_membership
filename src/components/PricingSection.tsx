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
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-r from-[#040b1e] via-[#081f4a] to-[#0d3472] p-6 shadow-2xl sm:p-10 lg:p-12">
      {/* Background Decorative Glows */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-64 w-64 rounded-full bg-blue-400/10 blur-[100px]" />

      <div className="relative text-center">
        {/* Updated Badge with Glowing Animated Credit Card */}
        <div className="inline-flex items-center gap-3 rounded-full border border-blue-400/30 bg-blue-600/20 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.22em] text-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.3)] backdrop-blur-md">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-blue-300">
            {/* Outer Glow Ring */}
            <span className="absolute h-full w-full animate-pulse rounded-full border border-blue-400/40" />
            
            {/* Floating Credit Card Icon */}
            <svg 
              className="h-4 w-4 animate-[bounce_3s_infinite]" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth={2.5} 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </span>
          Payment Plans
        </div>

        <h3 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
          Choose your membership option
        </h3>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
          Select a plan that fits your training goals with clear pricing, smooth activation, and secure payment processing.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {[
            "No hidden fees",
            "Instant activation",
            "Secure checkout",
          ].map((point) => (
            <span
              key={point}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/90 transition hover:bg-white/10"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              {point}
            </span>
          ))}
        </div>
      </div>

      <div className="relative mx-auto mt-12 grid w-full grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
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