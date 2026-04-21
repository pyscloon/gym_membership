import type { ReactNode } from "react";

export type AdminActionKey =
  | "scanQr"
  | "pendingPayment"
  | "customers"
  | "peakHours"
  | "recentTransactions"
  | "analytics"
  | "frozenMembers";

type AdminActionItem = {
  key: AdminActionKey;
  label: string;
  icon: ReactNode;
  badgeCount?: number;
};

type AdminActionGridProps = {
  actions: AdminActionItem[];
  activeSection: Exclude<AdminActionKey, "scanQr">;
  onActionClick: (key: AdminActionKey) => void;
};

export default function AdminActionGrid({
  actions,
  activeSection,
  onActionClick,
}: AdminActionGridProps) {
  return (
    <section className="mt-10 grid grid-cols-3 gap-x-2 gap-y-10 sm:gap-x-6">
      {actions.map((action) => {
        const isActive = action.key !== "scanQr" && action.key === activeSection;

        return (
          <button
            key={action.key}
            type="button"
            onClick={() => onActionClick(action.key)}
            className="group flex flex-col items-center justify-center gap-3 rounded-xl p-1 text-center"
          >
            <div
              className={`relative inline-flex items-center justify-center rounded-2xl transition ${
                isActive ? "ring-2 ring-[#0066CC]/35 ring-offset-2 ring-offset-[#F8F9FA]" : ""
              }`}
            >
              {action.icon}
              {typeof action.badgeCount === "number" && action.badgeCount > 0 && (
                <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ef4444] px-1.5 text-[10px] font-bold text-white">
                  {action.badgeCount}
                </span>
              )}
            </div>
            <p className={`text-sm font-medium transition sm:text-base ${isActive ? "text-[#0066CC]" : "text-[#000033]"}`}>
              {action.label}
            </p>
          </button>
        );
      })}
    </section>
  );
}
