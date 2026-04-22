import { useCallback, useEffect, useMemo, useState } from "react";
import MembershipDashboard from "../components/MembershipDashboard";
import { useNavigate } from "react-router-dom";
import AppTopBar from "../components/ui/AppTopBar";
import { useAuth } from "../hooks";
import { fetchBackendCrowdPanelData } from "../lib/crowdService";
import { fetchUserMembership } from "../lib/membershipService";
import { supabase } from "../lib/supabaseClient";
import { calculateMembershipStats, type Membership } from "../types/membership";

// --- JSON Configuration Mapping ---
const THEME = {
  background: {
    base_layer: {
      color: "#EDEDED", // flexWhite
      grid_size: "28px 28px",
      grid_color: "rgba(0, 102, 204, 0.05)",
    },
    lighting_layers: [
      {
        type: "radial-gradient",
        position: "50% 0%",
        color: "rgba(0, 0, 51, 0.15)", // flexBlack
        spread: "50%",
      },
      {
        type: "radial-gradient",
        position: "0% 0%",
        color: "rgba(0, 153, 255, 0.12)", // flexBlue
        spread: "40%",
      },
      {
        type: "linear-gradient",
        direction: "180deg",
        colors: [
          "#000033 0%",     // flexBlack
          "#0066CC 40%",    // flexNavy
          "rgba(237, 237, 237, 0) 100%", // flexWhite transparent
        ],
        height: "350px",
      },
    ],
  },
};

type WalkInRow = { walk_in_time: string; walk_in_type: string | null };
type WeeklyDayStatus = "complete" | "today" | "empty";
type WeeklyDay = { label: string; status: WeeklyDayStatus };
type LinearLightingLayer = { type: "linear-gradient"; direction: string; colors: string[]; height: string };

const MAX_CROWD_CAPACITY = 50;
const DEFAULT_WEEKLY_GOAL = 4;
const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

function getGoalStorageKey(userId: string): string { return `flex_weekly_goal_${userId}`; }
function readGoal(userId: string): number {
  if (typeof window === "undefined") return DEFAULT_WEEKLY_GOAL;
  const stored = window.localStorage.getItem(getGoalStorageKey(userId));
  const parsed = parseInt(stored ?? "", 10);
  return isNaN(parsed) ? DEFAULT_WEEKLY_GOAL : Math.max(1, Math.min(parsed, 14));
}
function writeGoal(userId: string, goal: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getGoalStorageKey(userId), String(goal));
}
function ordinal(week: number): string {
  if (week === 1) return "1st";
  if (week === 2) return "2nd";
  if (week === 3) return "3rd";
  return `${week}th`;
}
function getWeekOfMonth(date: Date): number { return Math.max(1, Math.ceil(date.getDate() / 7)); }
function getMonthLabel(date: Date): string { return date.toLocaleDateString("en-US", { month: "long" }).toUpperCase(); }
function isCheckIn(type: string | null | undefined): boolean {
  const normalized = String(type ?? "").toLowerCase();
  return normalized === "checkin" || normalized === "walk_in" || normalized === "walkin" || normalized === "walk-in";
}
function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const mondayOffset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - mondayOffset);
  d.setHours(0, 0, 0, 0);
  return d;
}
function computeStreak(daySet: Set<string>, today: Date): number {
  let streak = 0;
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  while (streak <= 366) {
    if (!daySet.has(dateKey(cursor))) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [walkIns, setWalkIns] = useState<WalkInRow[]>([]);
  const [crowdActiveUsers, setCrowdActiveUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyGoal, setWeeklyGoal] = useState(DEFAULT_WEEKLY_GOAL);
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [goalInputValue, setGoalInputValue] = useState(String(DEFAULT_WEEKLY_GOAL));
  const [membershipActionTick, setMembershipActionTick] = useState(0);
  const [freezeTick, setFreezeTick] = useState(0);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [m, w, c] = await Promise.all([
        fetchUserMembership(user.id),
        supabase.from("walk_ins").select("walk_in_time, walk_in_type").eq("user_id", user.id).order("walk_in_time", { ascending: false }).limit(2000),
        fetchBackendCrowdPanelData({ days: 7 }).catch(() => null)
      ]);
      setMembership(m);
      setWalkIns((w.data as WalkInRow[]) ?? []);
      setCrowdActiveUsers(c?.stats.activeUsers ?? 0);
    } finally { setIsLoading(false); }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (user) { const g = readGoal(user.id); setWeeklyGoal(g); setGoalInputValue(String(g)); } }, [user]);

  const now = new Date();
  const currentWeekOfMonth = getWeekOfMonth(now);
  const weekLabel = `${ordinal(currentWeekOfMonth).toUpperCase()}-WEEK`;

  const checkInDates = useMemo(() => 
    walkIns.filter(r => isCheckIn(r.walk_in_type))
           .map(r => new Date(r.walk_in_time))
           .filter(d => !isNaN(d.getTime())), [walkIns]);
  
  const checkInDaySet = useMemo(() => new Set(checkInDates.map(d => dateKey(d))), [checkInDates]);
  const currentWeekStart = useMemo(() => startOfWeek(now), []);
  const streakDays = useMemo(() => computeStreak(checkInDaySet, now), [checkInDaySet, now]);

  const monthSessions = checkInDates.filter(d => d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()).length;
  const weekSessions = checkInDates.filter(d => d >= currentWeekStart).length;

  const weeklyDays = useMemo<WeeklyDay[]>(() => {
    return WEEKDAY_LABELS.map((label, index) => {
      const d = new Date(currentWeekStart);
      d.setDate(currentWeekStart.getDate() + index);
      const key = dateKey(d);
      return { label, status: checkInDaySet.has(key) ? "complete" : (key === dateKey(now) ? "today" : "empty") };
    });
  }, [checkInDaySet, currentWeekStart]);

  const membershipStats = membership ? calculateMembershipStats(membership) : null;
  const crowdPercent = Math.min(100, Math.round((crowdActiveUsers / MAX_CROWD_CAPACITY) * 100));

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
      linear-gradient(${layer2.direction}, ${layer2.colors.join(', ')}),
      linear-gradient(${THEME.background.base_layer.grid_color} 1px, transparent 1px),
      linear-gradient(90deg, ${THEME.background.base_layer.grid_color} 1px, transparent 1px)
    `,
    backgroundSize: `100% 100%, 100% 100%, 100% ${layer2.height}, ${THEME.background.base_layer.grid_size}, ${THEME.background.base_layer.grid_size}`,
    backgroundRepeat: "no-repeat, no-repeat, no-repeat, repeat, repeat",
  };

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
          
          {/* SECTION 1 · SESSIONS & CROWD (GLASS MORPHISM FIX) */}
          <div className="grid grid-cols-12 gap-4 animate-fade-up rounded-2xl border border-[#0066CC]/45 p-3 sm:p-4">
            <section className="col-span-10">
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">Your Sessions</p>
              </div>
              <div className="rounded-2xl bg-[#000033]/45 p-3 shadow-xl ring-1 ring-[#0099FF]/45 backdrop-blur-md sm:p-5">
                <div className="flex justify-between gap-2 sm:gap-4 sm:divide-x sm:divide-white/10">
                  {[
                    { value: checkInDates.length, label: "Total" },
                    { value: monthSessions, label: getMonthLabel(now) },
                    { value: weekSessions, label: weekLabel },
                  ].map(({ value, label }) => (
                    <article key={label} className="min-w-0 flex-1 px-1 sm:px-4">
                      <p className="text-2xl font-black leading-none text-white sm:text-4xl">{isLoading ? "—" : value}</p>
                      <p className="mt-2 text-[9px] font-black uppercase tracking-[0.18em] text-white/50">{label}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="col-span-2 flex flex-col items-center">
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-white/60 text-center">Crowd</p>
              <div className="relative h-20 w-4 bg-[#000033]/50 rounded-full overflow-hidden ring-1 ring-white/15 backdrop-blur-md shadow-inner">
                <div 
                   className="absolute bottom-0 left-0 right-0 w-full bg-gradient-to-t from-[#001a66] via-[#0047b3] to-[#0077e6] transition-all duration-1000 shadow-[0_0_10px_rgba(0,102,204,0.5)]"
                   style={{ height: `${isLoading ? 0 : crowdPercent}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] font-black text-[#005fcc]">{isLoading ? "—" : `${crowdPercent}%`}</p>
            </section>
          </div>

          {/* SECTION 2 · WEEKLY ACTIVITY */}
          <section className="animate-fade-up mt-12 rounded-2xl border border-[#0066CC]/45 bg-white/25 p-4 sm:p-5">
            <p className="text-[12px] font-black uppercase tracking-[0.2em] text-[#000033] mb-5 px-1">This Week</p>
            
            <div className="grid grid-cols-7 gap-2">
              {weeklyDays.map((day, i) => {
                const isComplete = day.status === "complete";
                const hasStreak = streakDays > 0;
                return (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <p className="text-[9px] font-black text-[#000033]/30 uppercase tracking-widest">{day.label}</p>
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                      isComplete 
                        ? (hasStreak ? "bg-[#0066CC] shadow-lg shadow-blue-900/10" : "bg-[#0099FF]") 
                        : (day.status === "today" ? "border-2 border-[#0066CC] bg-white" : "bg-white/60 border border-gray-200")
                    }`}>
                      {isComplete && <span className="text-white text-xs">✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 px-1">
              <p className="text-sm font-black text-[#0066CC] italic">
                {isLoading ? "" : streakDays > 0 ? `🔥 ${streakDays} day streak` : "Start your streak today!"}
              </p>
            </div>

            <div className="mt-10 px-1">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#0066CC]/60">Goal Progress</p>
                <button
                  type="button"
                  onClick={() => setShowGoalEditor(!showGoalEditor)}
                  className="rounded-full border border-[#0099FF]/20 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#0099FF] shadow-sm transition hover:-translate-y-0.5 hover:border-[#0099FF]/35 hover:shadow-md"
                >
                  {showGoalEditor ? "Close" : "Set Goal"}
                </button>
              </div>
              {showGoalEditor && (
                <div className="flex gap-2 mb-4">
                  <input type="number" value={goalInputValue} onChange={(e) => setGoalInputValue(e.target.value)} className="w-16 rounded-lg border-none bg-white px-2 py-1 text-sm font-black shadow-sm" />
                  <button
                    type="button"
                    onClick={() => { const g = parseInt(goalInputValue); if(user && !isNaN(g)) { setWeeklyGoal(g); writeGoal(user.id, g); setShowGoalEditor(false); }}}
                    className="rounded-full bg-[#0066CC] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#0052a3] hover:shadow-md"
                  >
                    Save
                  </button>
                </div>
              )}
              <div className="h-2.5 w-full bg-white p-0.5 rounded-full ring-1 ring-black/5 shadow-inner">
                <div className="h-full bg-gradient-to-r from-[#0099FF] to-[#0066CC] rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (weekSessions / weeklyGoal) * 100)}%` }} />
              </div>
            </div>
          </section>

          {/* SECTION 3 · EXPIRY CIRCLE */}
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
                    const membershipSection = document.getElementById("membership-dashboard");
                    membershipSection?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="rounded-full border border-[#000033]/10 bg-[#000033] px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#001a66] hover:shadow-md"
                >
                  Change Membership
                </button>
                {membership &&
                  membership.status === "active" &&
                  (membership.tier === "yearly" || membership.tier === "semi-yearly") && (
                  <button
                    type="button"
                    onClick={() => {
                      setFreezeTick((prev) => prev + 1);
                      const membershipSection = document.getElementById("membership-dashboard");
                      membershipSection?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="rounded-full border border-[#0066CC]/25 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#0066CC] shadow-sm transition hover:-translate-y-0.5 hover:border-[#0066CC]/45 hover:shadow-md"
                  >
                    Request Freeze 
                  </button>
                )}
              </div>
            </div>
            
            <div className="relative py-4">
              <div className="h-1.5 w-full bg-gray-200/50 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#0099FF] to-[#0066CC] animate-dash-in" style={{ width: `${Math.min(100, ((membershipStats?.daysUntilRenewal ?? 0) / 30) * 100)}%` }} />
              </div>
              <div 
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700" 
                style={{ left: `${Math.min(90, Math.max(10, ((membershipStats?.daysUntilRenewal ?? 0) / 30) * 100))}%` }}
              >
                <div className={`flex flex-col items-center justify-center rounded-full border-[3px] ${membershipStats?.daysUntilRenewal && membershipStats.daysUntilRenewal <= 7 ? 'border-amber-400' : 'border-[#0066CC]'} bg-white shadow-xl aspect-square w-16`}>
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