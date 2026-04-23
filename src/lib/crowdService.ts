import { supabase } from "./supabaseClient";

export type CrowdStatus = "Not Busy" | "Getting Busy" | "Busy" | "Packed";
type AttendanceType = "checkin" | "checkout" | "walk-in";

type WalkInRow = {
  user_id: string | null;
  walk_in_type: string;
  walk_in_time: string;
};

export interface CrowdStats {
  activeUsers: number;
  crowdLevel: number;
  crowdStatus: CrowdStatus;
  totalMembers: number;
  todayWalkIns: number;
  todayMemberCheckIns: number;
}

export interface CrowdHistoryPoint {
  timestamp: string;
  label: string;
  activeUsers: number;
  crowdLevel: number;
  crowdStatus: CrowdStatus;
}

export interface HourlyAverage {
  hour: number;
  avgUsers: number;
  avgCrowd: number;
  status: CrowdStatus;
  sampleCount: number;
}

export interface TimeRangeSuggestion {
  startHour: number;
  endHour: number;
  label: string;
  avgCrowd: number;
  status: CrowdStatus;
}

export interface BestTimeSuggestions {
  best_time_ranges: TimeRangeSuggestion[];
  worst_time_ranges: TimeRangeSuggestion[];
  hourly_averages: HourlyAverage[];
  message?: string;
  daysAnalyzed: number;
  generatedAt: string;
}

type DerivedSnapshot = {
  timestamp: string;
  activeUsers: number;
  crowdLevel: number;
  crowdStatus: CrowdStatus;
};

function normalizeWalkInType(value: string): AttendanceType {
  const normalized = value.toLowerCase();
  if (normalized === "checkout") return "checkout";
  if (normalized === "walk_in" || normalized === "walkin" || normalized === "walk-in") {
    return "walk-in";
  }
  return "checkin";
}

function getStartOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getEndOfDay(date: Date): Date {
  const end = getStartOfDay(date);
  end.setDate(end.getDate() + 1);
  return end;
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value;
}

export function getCrowdStatusFromRatio(ratio: number): CrowdStatus {
  const safeRatio = clampRatio(ratio);

  if (safeRatio <= 0.25) return "Not Busy";
  if (safeRatio <= 0.5) return "Getting Busy";
  if (safeRatio <= 0.75) return "Busy";
  return "Packed";
}

export function getCrowdStatus(activeUsers: number, denominator: number): CrowdStatus {
  if (denominator <= 0) return "Not Busy";
  return getCrowdStatusFromRatio(activeUsers / denominator);
}

export function getCrowdStatusColor(status: CrowdStatus): string {
  switch (status) {
    case "Getting Busy":
      return "bg-yellow-100 text-yellow-800 ring-yellow-200";
    case "Busy":
      return "bg-orange-100 text-orange-800 ring-orange-200";
    case "Packed":
      return "bg-red-100 text-red-700 ring-red-200";
    default:
      return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  }
}

function createEmptyStats(): CrowdStats {
  return {
    activeUsers: 0,
    crowdLevel: 0,
    crowdStatus: "Not Busy",
    totalMembers: 0,
    todayWalkIns: 0,
    todayMemberCheckIns: 0,
  };
}

export function getCurrentCrowdStats(): CrowdStats {
  return createEmptyStats();
}

function formatHourLabel(hour: number): string {
  const normalizedHour = ((hour % 24) + 24) % 24;
  const period = normalizedHour >= 12 ? "PM" : "AM";
  const hour12 = normalizedHour % 12 === 0 ? 12 : normalizedHour % 12;
  return `${hour12} ${period}`;
}

function buildTimeRangeLabel(startHour: number, endHour: number): string {
  return `${formatHourLabel(startHour)} - ${formatHourLabel(endHour)}`;
}

function toRangeSuggestions(entries: HourlyAverage[]): TimeRangeSuggestion[] {
  if (entries.length === 0) return [];

  const sorted = [...entries].sort((left, right) => left.hour - right.hour);
  const groups: HourlyAverage[][] = [];
  let currentGroup: HourlyAverage[] = [];

  for (const entry of sorted) {
    if (currentGroup.length === 0) {
      currentGroup = [entry];
      continue;
    }

    const previousHour = currentGroup[currentGroup.length - 1].hour;
    if (entry.hour === previousHour + 1) {
      currentGroup.push(entry);
      continue;
    }

    groups.push(currentGroup);
    currentGroup = [entry];
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups.map((group) => {
    const startHour = group[0].hour;
    const endHour = (group[group.length - 1].hour + 1) % 24;
    const avgCrowd = group.reduce((sum, entry) => sum + entry.avgCrowd, 0) / group.length;

    return {
      startHour,
      endHour,
      label: buildTimeRangeLabel(startHour, endHour),
      avgCrowd,
      status: getCrowdStatusFromRatio(avgCrowd),
    };
  });
}

function deriveTodayStats(rows: WalkInRow[], totalMembers: number): CrowdStats {
  const latestMemberEvent = new Map<string, { type: AttendanceType; time: number }>();
  let activeGuestCount = 0;
  let todayWalkIns = 0;
  let todayMemberCheckIns = 0;

  for (const row of rows) {
    const timestamp = new Date(row.walk_in_time).getTime();
    if (Number.isNaN(timestamp)) continue;

    const type = normalizeWalkInType(row.walk_in_type);

    if (!row.user_id) {
      if (type === "walk-in") {
        todayWalkIns += 1;
        activeGuestCount += 1;
      } else if (type === "checkout" && activeGuestCount > 0) {
        activeGuestCount -= 1;
      }
      continue;
    }

    if (type === "checkin") {
      todayMemberCheckIns += 1;
    }

    const existing = latestMemberEvent.get(row.user_id);
    if (!existing || timestamp > existing.time) {
      latestMemberEvent.set(row.user_id, { type, time: timestamp });
    }
  }

  let activeMemberCount = 0;
  for (const entry of latestMemberEvent.values()) {
    if (entry.type === "checkin") {
      activeMemberCount += 1;
    }
  }

  const denominator = totalMembers + todayWalkIns;
  const crowdLevel = denominator > 0 ? todayMemberCheckIns / denominator : 0;

  return {
    activeUsers: activeMemberCount + activeGuestCount,
    crowdLevel,
    crowdStatus: getCrowdStatusFromRatio(crowdLevel),
    totalMembers,
    todayWalkIns,
    todayMemberCheckIns,
  };
}

function buildDerivedSnapshots(rows: WalkInRow[], totalMembers: number): DerivedSnapshot[] {
  const sortedRows = [...rows].sort(
    (left, right) => new Date(left.walk_in_time).getTime() - new Date(right.walk_in_time).getTime()
  );
  const latestMemberEvent = new Map<string, AttendanceType>();
  let activeGuestCount = 0;
  let todayWalkIns = 0;
  let todayMemberCheckIns = 0;
  const snapshots: DerivedSnapshot[] = [];

  for (const row of sortedRows) {
    const timestamp = new Date(row.walk_in_time);
    if (Number.isNaN(timestamp.getTime())) continue;

    const type = normalizeWalkInType(row.walk_in_type);

    if (!row.user_id) {
      if (type === "walk-in") {
        todayWalkIns += 1;
        activeGuestCount += 1;
      } else if (type === "checkout" && activeGuestCount > 0) {
        activeGuestCount -= 1;
      }
    } else {
      if (type === "checkin") {
        todayMemberCheckIns += 1;
      }
      latestMemberEvent.set(row.user_id, type);
    }

    let activeMembers = 0;
    for (const eventType of latestMemberEvent.values()) {
      if (eventType === "checkin") {
        activeMembers += 1;
      }
    }

    const denominator = totalMembers + todayWalkIns;
    const crowdLevel = denominator > 0 ? todayMemberCheckIns / denominator : 0;

    snapshots.push({
      timestamp: timestamp.toISOString(),
      activeUsers: activeMembers + activeGuestCount,
      crowdLevel,
      crowdStatus: getCrowdStatusFromRatio(crowdLevel),
    });
  }

  return snapshots;
}

export function getCrowdHistory(): CrowdHistoryPoint[] {
  return [];
}

export function buildBestTimeSuggestionsFromSnapshots(options: {
  snapshots: DerivedSnapshot[];
  days?: number;
  filterCurrentWeekday?: boolean;
  topCount?: number;
  now?: Date;
}): BestTimeSuggestions {
  const days = options.days ?? 7;
  const filterCurrentWeekday = options.filterCurrentWeekday ?? false;
  const topCount = options.topCount ?? 3;
  const now = options.now ?? new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);

  const filtered = options.snapshots.filter((snapshot) => {
    const timestamp = new Date(snapshot.timestamp);
    if (timestamp < cutoff) return false;

    if (filterCurrentWeekday) {
      return timestamp.getDay() === now.getDay();
    }

    return true;
  });

  const hourlyMap = new Map<number, { sumUsers: number; sumCrowd: number; count: number }>();

  for (const snapshot of filtered) {
    const hour = new Date(snapshot.timestamp).getHours();
    const current = hourlyMap.get(hour) ?? { sumUsers: 0, sumCrowd: 0, count: 0 };

    hourlyMap.set(hour, {
      sumUsers: current.sumUsers + snapshot.activeUsers,
      sumCrowd: current.sumCrowd + snapshot.crowdLevel,
      count: current.count + 1,
    });
  }

  const hourlyAverages: HourlyAverage[] = Array.from(hourlyMap.entries())
    .map(([hour, aggregate]) => {
      const avgUsers = aggregate.sumUsers / aggregate.count;
      const avgCrowd = aggregate.sumCrowd / aggregate.count;

      return {
        hour,
        avgUsers,
        avgCrowd,
        status: getCrowdStatusFromRatio(avgCrowd),
        sampleCount: aggregate.count,
      };
    })
    .sort((left, right) => left.hour - right.hour);

  if (hourlyAverages.length < 2) {
    return {
      best_time_ranges: [],
      worst_time_ranges: [],
      hourly_averages: hourlyAverages,
      message: "Not enough data yet",
      daysAnalyzed: days,
      generatedAt: now.toISOString(),
    };
  }

  const ranked = [...hourlyAverages].sort((left, right) => left.avgCrowd - right.avgCrowd);
  const chosenCount = Math.max(2, Math.min(topCount, Math.floor(ranked.length / 2) || 1));
  const bestEntries = ranked.slice(0, chosenCount);
  const worstEntries = ranked.slice(-chosenCount);
  const avgCrowdOverall =
    hourlyAverages.reduce((sum, entry) => sum + entry.avgCrowd, 0) / hourlyAverages.length;

  let message: string | undefined;
  if (avgCrowdOverall <= 0.25) {
    message = "Gym usually chill";
  } else if (avgCrowdOverall > 0.75) {
    message = "Gym usually packed";
  }

  return {
    best_time_ranges: toRangeSuggestions(bestEntries),
    worst_time_ranges: toRangeSuggestions(worstEntries),
    hourly_averages: hourlyAverages,
    message,
    daysAnalyzed: days,
    generatedAt: now.toISOString(),
  };
}

export function getBestTimeSuggestions(): BestTimeSuggestions {
  return {
    best_time_ranges: [],
    worst_time_ranges: [],
    hourly_averages: [],
    message: "Not enough data yet",
    daysAnalyzed: 7,
    generatedAt: new Date().toISOString(),
  };
}

async function fetchActiveMemberCount(): Promise<number> {
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  if (error) {
    console.error("Error fetching active member count:", error);
    return 0;
  }

  return count ?? 0;
}

export async function fetchBackendCrowdPanelData(options?: {
  days?: number;
}): Promise<{
  stats: CrowdStats;
  suggestions: BestTimeSuggestions;
  lastUpdated: string;
}> {
  const days = options?.days ?? 7;

  if (!supabase) {
    return {
      stats: createEmptyStats(),
      suggestions: getBestTimeSuggestions(),
      lastUpdated: new Date().toISOString(),
    };
  }

  const now = new Date();
  const cutoff = getStartOfDay(now);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const startOfToday = getStartOfDay(now);
  const endOfToday = getEndOfDay(now);

  try {
    const [totalMembers, suggestionsRowsResult, todayRowsResult] = await Promise.all([
      fetchActiveMemberCount(),
      supabase
        .from("walk_ins")
        .select("user_id, walk_in_type, walk_in_time")
        .gte("walk_in_time", cutoff.toISOString())
        .order("walk_in_time", { ascending: true })
        .limit(5000),
      supabase
        .from("walk_ins")
        .select("user_id, walk_in_type, walk_in_time")
        .gte("walk_in_time", startOfToday.toISOString())
        .lt("walk_in_time", endOfToday.toISOString())
        .order("walk_in_time", { ascending: true })
        .limit(3000),
    ]);

    const todayRows = (todayRowsResult.data ?? []) as WalkInRow[];
    const suggestionRows = (suggestionsRowsResult.data ?? []) as WalkInRow[];
    const stats = deriveTodayStats(todayRows, totalMembers);
    const recentSnapshots = buildDerivedSnapshots(suggestionRows, totalMembers);
    const suggestions = buildBestTimeSuggestionsFromSnapshots({
      snapshots: recentSnapshots,
      days,
      topCount: 3,
      now,
    });
    const latestSnapshot = recentSnapshots.at(-1);
    const resolvedStats =
      todayRows.length > 0 || !latestSnapshot
        ? stats
        : {
            ...stats,
            activeUsers: latestSnapshot.activeUsers,
            crowdLevel: latestSnapshot.crowdLevel,
            crowdStatus: latestSnapshot.crowdStatus,
          };

    const lastRow = todayRows[todayRows.length - 1] ?? suggestionRows[suggestionRows.length - 1];

    return {
      stats: resolvedStats,
      suggestions,
      lastUpdated: lastRow?.walk_in_time ?? now.toISOString(),
    };
  } catch (error) {
    console.error("Error fetching crowd panel data:", error);
    return {
      stats: createEmptyStats(),
      suggestions: getBestTimeSuggestions(),
      lastUpdated: new Date().toISOString(),
    };
  }
}
