import { useCallback, useEffect, useMemo, useState } from "react";
import MembershipDashboard from "../components/MembershipDashboard";
import { useNavigate } from "react-router-dom";
import AppTopBar from "../components/ui/AppTopBar";
import { useAuth } from "../hooks";
import { getMemberCompletedSessionRows } from "../lib/checkInService";
import { fetchBackendCrowdPanelData } from "../lib/crowdService";
import { fetchUserMembership } from "../lib/membershipService";
import {
  countSelectedDays,
  readWeeklyPlan,
  toggleWeeklyPlanDay,
  writeWeeklyPlan,
  type WeeklyGymPlan,
  type WeeklyPlanDay,
} from "../lib/weeklyGymPlan";
import { calculateMembershipStats, type Membership } from "../types/membership";
import { AccessFactory } from "../design-patterns";

// --- JSON Configuration Mapping ---
const THEME = {
  background: {
    base_layer: {
      color: "#EDEDED",
      grid_size: "28px 28px",
      grid_color: "rgba(0, 102, 204, 0.05)",
    },
    lighting_layers: [
      {
        type: "radial-gradient",
        position: "50% 0%",
        color: "rgba(0, 0, 51, 0.15)",
        spread: "50%",
      },
      {
        type: "radial-gradient",
        position: "0% 0%",
        color: "rgba(0, 153, 255, 0.12)",
        spread: "40%",
      },
      {
        type: "linear-gradient",
        direction: "180deg",
        colors: [
          "#000033 0%",
          "#0066CC 40%",
          "rgba(237, 237, 237, 0) 100%",
        ],
        height: "350px",
      },
    ],
  },
};

type LinearLightingLayer = { type: "linear-gradient"; direction: string; colors: string[]; height: string };

const WEEKLY_DAY_BUTTONS: Array<{ key: WeeklyPlanDay; shortLabel: string; fullLabel: string }> = [
  { key: "mon", shortLabel: "M", fullLabel: "Monday" },
  { key: "tue", shortLabel: "T", fullLabel: "Tuesday" },
  { key: "wed", shortLabel: "W", fullLabel: "Wednesday" },
  { key: "thu", shortLabel: "T", fullLabel: "Thursday" },
  { key: "fri", shortLabel: "F", fullLabel: "Friday" },
  { key: "sat", shortLabel: "S", fullLabel: "Saturday" },
  { key: "sun", shortLabel: "S", fullLabel: "Sunday" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [membershipActionTick, setMembershipActionTick] = useState(0);
  const [freezeTick, setFreezeTick] = useState(0);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyGymPlan>(() => {
    if (typeof window === "undefined") return readWeeklyPlan(null);
    return readWeeklyPlan(window.localStorage);
  });

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [m] = await Promise.all([
        fetchUserMembership(user.id),
        getMemberCompletedSessionRows(user.id),
        fetchBackendCrowdPanelData({ days: 7 }).catch(() => null),
      ]);
      setMembership(m)
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadData();

    const handleFocus = () => {
      void loadData();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadData();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadData]);


  const membershipStats = membership ? calculateMembershipStats(membership) : null;
  const membershipTotalDays = useMemo(() => {
    if (!membership) return 0;
    if (membership.tier === "walk-in") return 1;
    try {
      return AccessFactory.create_access(membership.tier).get_duration();
    } catch {
      return 30;
    }
  }, [membership]);
  const membershipProgressPercent = useMemo(() => {
    if (!membershipStats || membershipTotalDays <= 0) return 0;
    const percent = (membershipStats.daysUntilRenewal / membershipTotalDays) * 100;
    return Math.min(100, Math.max(0, percent));
  }, [membershipStats, membershipTotalDays]);
  const membershipMarkerPercent = Math.min(90, Math.max(10, membershipProgressPercent));
  const isExpiryCritical =
    membershipStats?.daysUntilRenewal !== undefined && membershipStats.daysUntilRenewal <= 5;

  const layer0 = THEME.background.lighting_layers[0] ?? {
    type: "radial-gradient",
    position: "50% 0%",
    color: "rgba(0, 0, 51, 0.15)",
    spread: "50%",
  };
  const layer1 = THEME.background.lighting_layers[1] ?? {
    type: "radial-gradient",
    position: "0% 0%",
    color: "rgba(0, 153, 255, 0.12)",
    spread: "40%",
  };
  const layer2 = (THEME.background.lighting_layers[2] as LinearLightingLayer | undefined) ?? {
    type: "linear-gradient",
    direction: "180deg",
    colors: ["#000033 0%", "#0066CC 40%", "rgba(237, 237, 237, 0) 100%"],
    height: "350px",
  };

  const dynamicBg = {
    backgroundColor: THEME.background.base_layer.color,
    backgroundImage: `
      ${layer0.type}(circle at ${layer0.position}, ${layer0.color}, transparent ${layer0.spread}),
      ${layer1.type}(circle at ${layer1.position}, ${layer1.color}, transparent ${layer1.spread}),
      linear-gradient(${layer2.direction}, ${layer2.colors.join(", ")}),
      linear-gradient(${THEME.background.base_layer.grid_color} 1px, transparent 1px),
      linear-gradient(90deg, ${THEME.background.base_layer.grid_color} 1px, transparent 1px)
    `,
    backgroundSize: `100% 100%, 100% 100%, 100% ${layer2.height}, ${THEME.background.base_layer.grid_size}, ${THEME.background.base_layer.grid_size}`,
    backgroundRepeat: "no-repeat, no-repeat, no-repeat, repeat, repeat",
  };

  const isEligibleForFreeze =
    membership?.tier === "yearly" || membership?.tier === "semi-yearly";
  const selectedGymDays = countSelectedDays(weeklyPlan);

  const handleToggleWeeklyPlanDay = useCallback((day: WeeklyPlanDay) => {
    setWeeklyPlan((currentPlan) => {
      const nextPlan = toggleWeeklyPlanDay(currentPlan, day);
      if (typeof window !== "undefined") {
        writeWeeklyPlan(window.localStorage, nextPlan);
      }
      return nextPlan;
    });
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={dynamicBg}>
      <style>{`
        @keyframes dash-in { from { width: 0%; } }
        @keyframes fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-dash-in { animation: dash-in 0.9s cubic-bezier(.22,1,.36,1) both; }
        .animate-fade-up { animation: fade-up 0.5s ease both; }
      `}</style>

      <div className="relative z-10">
        <AppTopBar />

        <main className="mx-auto w-full max-w-2xl px-4 pb-36 pt-24">
          <section className="animate-fade-up px-1">
            <div className="rounded-[32px] border border-[#0066CC]/25 bg-white/70 p-4 shadow-[0_24px_70px_rgba(0,51,102,0.12)] backdrop-blur-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[12px] font-black uppercase tracking-[0.24em] text-[#000033]">This Week</p>
                  <p className="mt-2 text-sm font-semibold text-[#0066CC]">
                    {selectedGymDays === 0
                      ? "Pick gym days."
                      : `You pick ${selectedGymDays} gym day${selectedGymDays === 1 ? "" : "s"}.`}
                  </p>
                </div>
                <p className="rounded-full border border-[#0066CC]/15 bg-[#0066CC]/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#0066CC]">
                  Save on this device
                </p>
              </div>

              <div className="mt-6 grid grid-cols-7 gap-x-1.5 gap-y-3 min-[380px]:gap-x-2 sm:mt-8 sm:gap-x-4 sm:gap-y-4">
                {WEEKLY_DAY_BUTTONS.map((day) => {
                  const isSelected = weeklyPlan[day.key];

                  return (
                    <button
                      key={day.key}
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={day.fullLabel}
                      onClick={() => handleToggleWeeklyPlanDay(day.key)}
                      className="group flex min-w-0 flex-col items-center gap-2 sm:gap-3"
                    >
                      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#000033]/35 transition group-hover:text-[#0066CC] min-[380px]:text-[10px] sm:text-[11px] sm:tracking-[0.24em]">
                        {day.shortLabel}
                      </span>
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-[11px] font-black transition duration-200 min-[380px]:h-10 min-[380px]:w-10 min-[380px]:text-xs sm:h-16 sm:w-16 sm:text-sm ${
                          isSelected
                            ? "border-[#0066CC] bg-[#0066CC] text-white shadow-[0_12px_30px_rgba(0,102,204,0.28)]"
                            : "border-[#0066CC] bg-white text-[#0066CC] group-hover:-translate-y-0.5 group-hover:shadow-[0_10px_25px_rgba(0,102,204,0.18)]"
                        }`}
                      >
                        {day.shortLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* SECTION 3 · EXPIRY */}
          <section className="animate-fade-up mt-14 px-1">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[12px] font-black uppercase tracking-[0.2em] text-[#000033]">Membership Expiry</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/subscription-tier")}
                  className="rounded-full border border-[#0066CC]/25 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#0066CC] shadow-sm transition hover:-translate-y-0.5 hover:border-[#0066CC]/45 hover:shadow-md"
                >
                  Renew Now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMembershipActionTick((prev) => prev + 1);
                    document.getElementById("membership-dashboard")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="rounded-full border border-[#000033]/10 bg-[#000033] px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#001a66] hover:shadow-md"
                >
                  Change Membership
                </button>

                {/* ── Freeze / Unfreeze / Pending buttons ── */}
                {isEligibleForFreeze && membership?.status === "active" && (
                  <button
                    type="button"
                    onClick={() => {
                      setFreezeTick((prev) => prev + 1);
                      document.getElementById("membership-dashboard")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="rounded-full border border-[#0066CC]/25 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#0066CC] shadow-sm transition hover:-translate-y-0.5 hover:border-[#0066CC]/45 hover:shadow-md"
                  >
                    Request Freeze
                  </button>
                )}

                {membership?.status === "freeze_pending" && (
                  <button
                    type="button"
                    disabled
                    className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-amber-600 shadow-sm cursor-not-allowed opacity-80"
                  >
                    Freeze Pending…
                  </button>
                )}

                {isEligibleForFreeze && membership?.status === "frozen" && (
                  <button
                    type="button"
                    onClick={() => {
                      setFreezeTick((prev) => prev + 1);
                      document.getElementById("membership-dashboard")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="rounded-full border border-[#0066CC]/25 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#0066CC] shadow-sm transition hover:-translate-y-0.5 hover:border-[#0066CC]/45 hover:shadow-md"
                  >
                    Request Unfreeze
                  </button>
                )}
              </div>
            </div>

            <div className="relative py-4">
              <div className="h-1.5 w-full bg-gray-200/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0099FF] to-[#0066CC] animate-dash-in"
                  style={{ width: `${membershipProgressPercent}%` }}
                />
              </div>
              <div
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700"
                style={{ left: `${membershipMarkerPercent}%` }}
              >
                <div className={`flex flex-col items-center justify-center rounded-full border-[3px] ${isExpiryCritical ? "border-amber-400" : "border-[#0066CC]"} bg-white shadow-xl aspect-square w-16`}>
                  <p className="text-xl font-black text-[#000033] leading-none">{isLoading ? "—" : (membershipStats?.daysUntilRenewal ?? 0)}</p>
                  <p className="text-[7px] font-black uppercase text-[#000033]/50 tracking-tighter">days left</p>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-10 px-1" aria-hidden="true">
            <div className="relative h-5 w-full overflow-hidden">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-[#0066CC]/75 to-transparent" />
              <div className="absolute inset-x-12 top-1/2 h-3 -translate-y-1/2 bg-gradient-to-r from-transparent via-[#0099FF]/15 to-transparent blur-md" />
            </div>
          </div>

          <section id="membership-dashboard" className="mt-16 pb-24">
            <MembershipDashboard
              changeMembershipTick={membershipActionTick}
              freezeTick={freezeTick}
            />
          </section>
        </main>
      </div>
    </div>
  );
}
