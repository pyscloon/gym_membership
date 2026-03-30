import type { ReactNode } from "react";

type PlanCardProps = {
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
  onSelect: () => void;
};

export default function PlanCard({
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
  onSelect,
}: PlanCardProps) {
  return (
    <article
      className={`group flex h-full flex-col rounded-2xl border p-5 shadow-sm transition duration-300 sm:p-6 xl:p-5 ${
        isActive
          ? "border-flexBlue/40 bg-gradient-to-b from-flexBlue/12 to-white"
          : "border-flexNavy/15 bg-white/95"
      } hover:-translate-y-1 hover:shadow-xl hover:border-flexBlue/45`}
    >
      <div className="mb-5">
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
            isActive
              ? "border-flexBlue/35 bg-flexBlue/18 text-flexNavy"
              : "border-flexBlue/20 bg-flexBlue/10 text-flexNavy/80"
          }`}
        >
          {badge}
        </span>
      </div>

      <header className="flex items-center gap-3 sm:gap-4">
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border ${
            isActive
              ? "border-flexBlue/40 bg-flexBlue/20 text-flexNavy"
              : "border-flexBlue/25 bg-flexBlue/12 text-flexNavy"
          }`}
          aria-hidden="true"
        >
          {icon}
        </span>

        <div>
          <h4 className="text-xl font-semibold leading-tight text-flexNavy sm:text-2xl xl:text-xl 2xl:text-2xl">{title}</h4>
          <p className="mt-1 text-2xl font-bold leading-tight text-flexBlack sm:text-3xl xl:text-2xl 2xl:text-3xl">
            {amount}
            <span className="ml-2 text-sm font-semibold text-flexNavy/75 sm:text-base xl:text-sm 2xl:text-base">{interval}</span>
          </p>
        </div>
      </header>

      <blockquote className="mt-4 text-center text-sm italic text-flexNavy/65">{quote}</blockquote>

      <div className="my-4 h-px w-full bg-flexBlue/20" aria-hidden="true" />

      <p className="text-sm leading-relaxed text-flexNavy/70 sm:text-base xl:text-sm 2xl:text-base">{description}</p>

      <ul className="mt-4 space-y-2 text-sm text-flexNavy/80 xl:text-[0.92rem]">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span className="mt-0.5 text-flexBlue" aria-hidden="true">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onSelect}
        disabled={isLoading}
        className={`mt-auto w-full rounded-xl border px-4 py-3 text-base font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flexBlue/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 sm:px-5 sm:py-3.5 sm:text-lg xl:px-4 xl:py-3 xl:text-base 2xl:px-5 2xl:py-3.5 2xl:text-lg ${
          isActive
            ? "border-flexBlue bg-flexBlue text-white hover:bg-flexNavy"
            : "border-flexBlue/35 bg-flexBlue/10 text-flexNavy hover:border-flexBlue/55 hover:bg-flexBlue/20"
        }`}
      >
        {isLoading ? "Processing..." : ctaLabel}
      </button>
    </article>
  );
}
