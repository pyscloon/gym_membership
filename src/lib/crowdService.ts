import { supabase } from "./supabaseClient";

export type CrowdSessionType = "member" | "walk-in";

export type CrowdStatus = "Not Busy" | "Moderate" | "Crowded";

export interface CrowdSessionRecord {
  id: string;
  userId: string | null;
  sessionType: CrowdSessionType;
  checkInTime: string;
  checkOutTime: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrowdSnapshot {
  id: string;
  timestamp: string;
  activeUsers: number;
  totalEquipment: number;
  crowdLevel: number;
  crowdStatus: CrowdStatus;
}

export interface CrowdStats {
  activeUsers: number;
  totalEquipment: number;
  crowdLevel: number;
  crowdStatus: CrowdStatus;
}

export interface CrowdSettings {
  totalEquipment: number;
  updatedAt: string;
}

export interface CrowdHistoryPoint {
  timestamp: string;
  label: string;
  activeUsers: number;
  totalEquipment: number;
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

const STORAGE_KEYS = {
  sessions: "flex_republic_crowd_sessions",
  snapshots: "flex_republic_crowd_snapshots",
  settings: "flex_republic_crowd_settings",
} as const;

const DEFAULT_EQUIPMENT_COUNT = 50;
const SNAPSHOT_DEDUP_WINDOW_MS = 25_000;
const MAX_SNAPSHOTS = 800;

let fallbackSettings: CrowdSettings = {
  totalEquipment: DEFAULT_EQUIPMENT_COUNT,
  updatedAt: new Date().toISOString(),
};
let fallbackSessions: CrowdSessionRecord[] = [];
let fallbackSnapshots: CrowdSnapshot[] = [];

type CrowdSettingsRow = {
  total_equipment: number;
  updated_at: string;
};

type CrowdSnapshotRow = {
  id: string;
  timestamp: string;
  active_users: number;
  total_equipment: number;
  crowd_level: number;
  crowd_status: CrowdStatus;
};

type WalkInRow = {
  user_id: string | null;
  walk_in_type: string;
  walk_in_time: string;
};

function hasLocalStorage(): boolean {
  return typeof localStorage !== "undefined";
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeEquipmentCount(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_EQUIPMENT_COUNT;

  const rounded = Math.floor(value);
  return rounded > 0 ? rounded : DEFAULT_EQUIPMENT_COUNT;
}

function readSessions(): CrowdSessionRecord[] {
  if (!hasLocalStorage()) return fallbackSessions;
  return safeParse(localStorage.getItem(STORAGE_KEYS.sessions), fallbackSessions);
}

function saveSessions(sessions: CrowdSessionRecord[]): void {
  fallbackSessions = sessions;

  if (hasLocalStorage()) {
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
  }
}

function normalizeWalkInType(value: string): "checkin" | "checkout" | "walk-in" {
  const normalized = value.toLowerCase();
  if (normalized === "checkout") return "checkout";
  if (normalized === "walk_in" || normalized === "walkin" || normalized === "walk-in") {
    return "walk-in";
  }
  return "checkin";
}

function deriveActiveUsersFromWalkIns(rows: WalkInRow[]): number {
  const latestByUser = new Map<string, { type: "checkin" | "checkout" | "walk-in"; time: number }>();
  let activeGuestCount = 0;

  for (const row of rows) {
    const timestamp = new Date(row.walk_in_time).getTime();
    if (Number.isNaN(timestamp)) continue;

    const normalizedType = normalizeWalkInType(row.walk_in_type);

    // Guest walk-ins are QR-scanned entries without an account. Count each as active.
    if (!row.user_id) {
      if (normalizedType === "walk-in") {
        activeGuestCount += 1;
      }
      continue;
    }

    const existing = latestByUser.get(row.user_id);
    if (!existing || timestamp > existing.time) {
      latestByUser.set(row.user_id, {
        type: normalizedType,
        time: timestamp,
      });
    }
  }

  let activeMemberCount = 0;
  for (const entry of latestByUser.values()) {
    if (entry.type === "checkin" || entry.type === "walk-in") {
      activeMemberCount += 1;
    }
  }

  return activeMemberCount + activeGuestCount;
}

function buildSnapshotsFromWalkIns(rows: WalkInRow[], totalEquipment: number): CrowdSnapshot[] {
  const hourly = new Map<string, number>();

  for (const row of rows) {
    const type = normalizeWalkInType(row.walk_in_type);
    if (type === "checkout") continue;

    const timestamp = new Date(row.walk_in_time);
    if (Number.isNaN(timestamp.getTime())) continue;

    timestamp.setMinutes(0, 0, 0);
    const key = timestamp.toISOString();
    hourly.set(key, (hourly.get(key) ?? 0) + 1);
  }

  return Array.from(hourly.entries()).map(([timestamp, activeUsers], index) => {
    const crowdLevel = totalEquipment > 0 ? activeUsers / totalEquipment : 0;
    return {
      id: `derived-${index}-${timestamp}`,
      timestamp,
      activeUsers,
      totalEquipment,
      crowdLevel,
      crowdStatus: getCrowdStatus(activeUsers, totalEquipment),
    };
  });
}

async function syncStartSessionToBackend(record: CrowdSessionRecord): Promise<void> {
  if (!supabase) return;

  try {
    if (record.userId) {
      const { data: existing, error: existingError } = await supabase
        .from("crowd_sessions")
        .select("id")
        .eq("user_id", record.userId)
        .is("check_out_time", null)
        .limit(1);

      if (!existingError && existing && existing.length > 0) {
        return;
      }
    }

    await supabase.from("crowd_sessions").insert({
      user_id: record.userId,
      session_type: record.sessionType,
      check_in_time: record.checkInTime,
      check_out_time: null,
    });
  } catch {
    // Non-blocking backend sync.
  }
}

async function syncEndSessionToBackend(params: {
  userId?: string | null;
  sessionId?: string;
}): Promise<void> {
  if (!supabase) return;

  try {
    if (params.userId) {
      const { data: activeRows, error: activeError } = await supabase
        .from("crowd_sessions")
        .select("id")
        .eq("user_id", params.userId)
        .is("check_out_time", null)
        .order("check_in_time", { ascending: false })
        .limit(1);

      if (!activeError && activeRows && activeRows.length > 0) {
        await supabase
          .from("crowd_sessions")
          .update({ check_out_time: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", activeRows[0].id);
      }
      return;
    }

    const { data: walkInRows, error: walkInError } = await supabase
      .from("crowd_sessions")
      .select("id")
      .is("user_id", null)
      .is("check_out_time", null)
      .order("check_in_time", { ascending: false })
      .limit(1);

    if (!walkInError && walkInRows && walkInRows.length > 0) {
      await supabase
        .from("crowd_sessions")
        .update({ check_out_time: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", walkInRows[0].id);
    }
  } catch {
    // Non-blocking backend sync.
  }
}

async function syncSnapshotToBackend(snapshot: CrowdSnapshot): Promise<void> {
  if (!supabase) return;

  try {
    await supabase.from("crowd_snapshots").insert({
      timestamp: snapshot.timestamp,
      active_users: snapshot.activeUsers,
      total_equipment: snapshot.totalEquipment,
      crowd_level: snapshot.crowdLevel,
      crowd_status: snapshot.crowdStatus,
    });
  } catch {
    // Non-blocking backend sync.
  }
}

function readSnapshots(): CrowdSnapshot[] {
  if (!hasLocalStorage()) return fallbackSnapshots;
  return safeParse(localStorage.getItem(STORAGE_KEYS.snapshots), fallbackSnapshots);
}

function saveSnapshots(snapshots: CrowdSnapshot[]): void {
  fallbackSnapshots = snapshots;

  if (hasLocalStorage()) {
    localStorage.setItem(STORAGE_KEYS.snapshots, JSON.stringify(snapshots));
  }
}

function readSettings(): CrowdSettings {
  if (!hasLocalStorage()) return fallbackSettings;

  const stored = safeParse<CrowdSettings | null>(
    localStorage.getItem(STORAGE_KEYS.settings),
    null
  );

  if (!stored || typeof stored.totalEquipment !== "number") {
    return fallbackSettings;
  }

  return {
    totalEquipment: normalizeEquipmentCount(stored.totalEquipment),
    updatedAt: stored.updatedAt || new Date().toISOString(),
  };
}

function saveSettings(settings: CrowdSettings): void {
  fallbackSettings = settings;

  if (hasLocalStorage()) {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  }
}

export function getCrowdStatus(activeUsers: number, totalEquipment: number): CrowdStatus {
  if (totalEquipment <= 0) return "Not Busy";

  const percentage = (activeUsers / totalEquipment) * 100;

  if (percentage <= 40) return "Not Busy";
  if (percentage <= 70) return "Moderate";
  return "Crowded";
}

export function getCrowdStatusColor(status: CrowdStatus): string {
  switch (status) {
    case "Moderate":
      return "bg-amber-100 text-amber-800 ring-amber-200";
    case "Crowded":
      return "bg-red-100 text-red-700 ring-red-200";
    default:
      return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  }
}

export function getTotalEquipmentCount(): number {
  return readSettings().totalEquipment;
}

export function updateTotalEquipmentCount(totalEquipment: number): CrowdSettings {
  const settings: CrowdSettings = {
    totalEquipment: normalizeEquipmentCount(totalEquipment),
    updatedAt: new Date().toISOString(),
  };

  saveSettings(settings);
  captureCrowdSnapshot();

  if (supabase) {
    void supabase.from("crowd_settings").upsert({
      id: 1,
      total_equipment: settings.totalEquipment,
      updated_at: settings.updatedAt,
    });
  }

  return settings;
}

export function getActiveCrowdSessions(): CrowdSessionRecord[] {
  return readSessions().filter((session) => session.checkOutTime === null);
}

export function startCrowdSession(params: {
  userId: string | null;
  sessionType: CrowdSessionType;
  sessionId?: string;
}): CrowdSessionRecord {
  const sessions = readSessions();
  const now = new Date().toISOString();

  if (params.userId) {
    const existingActive = sessions.find(
      (session) => session.userId === params.userId && session.checkOutTime === null
    );

    if (existingActive) {
      return existingActive;
    }
  }

  const record: CrowdSessionRecord = {
    id: params.sessionId ?? createId("crowd-session"),
    userId: params.userId,
    sessionType: params.sessionType,
    checkInTime: now,
    checkOutTime: null,
    createdAt: now,
    updatedAt: now,
  };

  saveSessions([...sessions, record]);
  captureCrowdSnapshot();
  void syncStartSessionToBackend(record);

  return record;
}

export function endCrowdSession(params: {
  userId?: string | null;
  sessionId?: string;
}): CrowdSessionRecord | null {
  const sessions = readSessions();
  const sessionIndex = sessions.findIndex((session) => {
    if (params.sessionId) {
      return session.id === params.sessionId && session.checkOutTime === null;
    }

    if (params.userId) {
      return session.userId === params.userId && session.checkOutTime === null;
    }

    return false;
  });

  if (sessionIndex === -1) {
    return null;
  }

  const endedSession = {
    ...sessions[sessionIndex],
    checkOutTime: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const nextSessions = [...sessions];
  nextSessions[sessionIndex] = endedSession;
  saveSessions(nextSessions);
  captureCrowdSnapshot();
  void syncEndSessionToBackend(params);

  return endedSession;
}

export function getCurrentCrowdStats(): CrowdStats {
  const totalEquipment = getTotalEquipmentCount();
  const activeUsers = getActiveCrowdSessions().length;
  const crowdLevel = totalEquipment > 0 ? activeUsers / totalEquipment : 0;

  return {
    activeUsers,
    totalEquipment,
    crowdLevel,
    crowdStatus: getCrowdStatus(activeUsers, totalEquipment),
  };
}

export function captureCrowdSnapshot(): CrowdSnapshot {
  const currentStats = getCurrentCrowdStats();
  const snapshots = readSnapshots();
  const timestamp = new Date().toISOString();
  const previousSnapshot = snapshots[snapshots.length - 1];

  if (previousSnapshot) {
    const previousTime = new Date(previousSnapshot.timestamp).getTime();
    const currentTime = new Date(timestamp).getTime();

    if (
      currentTime - previousTime < SNAPSHOT_DEDUP_WINDOW_MS &&
      previousSnapshot.activeUsers === currentStats.activeUsers &&
      previousSnapshot.totalEquipment === currentStats.totalEquipment
    ) {
      return previousSnapshot;
    }
  }

  const snapshot: CrowdSnapshot = {
    id: createId("crowd-snapshot"),
    timestamp,
    activeUsers: currentStats.activeUsers,
    totalEquipment: currentStats.totalEquipment,
    crowdLevel: currentStats.crowdLevel,
    crowdStatus: currentStats.crowdStatus,
  };

  const nextSnapshots = [...snapshots, snapshot].slice(-MAX_SNAPSHOTS);
  saveSnapshots(nextSnapshots);
  void syncSnapshotToBackend(snapshot);

  return snapshot;
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
      stats: getCurrentCrowdStats(),
      suggestions: getBestTimeSuggestions({ days, topCount: 3 }),
      lastUpdated: new Date().toISOString(),
    };
  }

  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  try {
    const settingsPromise = supabase
      .from("crowd_settings")
      .select("total_equipment, updated_at")
      .eq("id", 1)
      .maybeSingle();

    const snapshotsPromise = supabase
      .from("crowd_snapshots")
      .select("id, timestamp, active_users, total_equipment, crowd_level, crowd_status")
      .gte("timestamp", cutoff.toISOString())
      .order("timestamp", { ascending: true })
      .limit(1500);

    const walkInsForSuggestionsPromise = supabase
      .from("walk_ins")
      .select("user_id, walk_in_type, walk_in_time")
      .gte("walk_in_time", cutoff.toISOString())
      .order("walk_in_time", { ascending: false })
      .limit(3000);

    const walkInsForActiveUsersPromise = supabase
      .from("walk_ins")
      .select("user_id, walk_in_type, walk_in_time")
      .gte("walk_in_time", startOfToday.toISOString())
      .order("walk_in_time", { ascending: false })
      .limit(3000);

    const [settingsResult, snapshotsResult, walkInsForSuggestionsResult, walkInsForActiveUsersResult] = await Promise.all([
      settingsPromise,
      snapshotsPromise,
      walkInsForSuggestionsPromise,
      walkInsForActiveUsersPromise,
    ]);

    const settingsRow = settingsResult.data as CrowdSettingsRow | null;
    const totalEquipment = normalizeEquipmentCount(
      settingsRow?.total_equipment ?? getTotalEquipmentCount()
    );

    const walkInRowsForSuggestions = (walkInsForSuggestionsResult.data ?? []) as WalkInRow[];
    const walkInRowsForActiveUsers = (walkInsForActiveUsersResult.data ?? []) as WalkInRow[];
    const activeUsers = deriveActiveUsersFromWalkIns(walkInRowsForActiveUsers);

    const backendSnapshots = (snapshotsResult.data ?? []) as CrowdSnapshotRow[];
    const normalizedSnapshots: CrowdSnapshot[] = backendSnapshots.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      activeUsers: row.active_users,
      totalEquipment: row.total_equipment,
      crowdLevel: Number(row.crowd_level),
      crowdStatus: row.crowd_status,
    }));

    const derivedSnapshots = buildSnapshotsFromWalkIns(walkInRowsForSuggestions, totalEquipment);
    const snapshots = normalizedSnapshots.length > 0 ? normalizedSnapshots : derivedSnapshots;

    const stats: CrowdStats = {
      activeUsers,
      totalEquipment,
      crowdLevel: totalEquipment > 0 ? activeUsers / totalEquipment : 0,
      crowdStatus: getCrowdStatus(activeUsers, totalEquipment),
    };

    const suggestions = buildBestTimeSuggestionsFromSnapshots({
      snapshots,
      totalEquipment,
      days,
      topCount: 3,
    });

    return {
      stats,
      suggestions,
      lastUpdated: settingsRow?.updated_at ?? new Date().toISOString(),
    };
  } catch {
    return {
      stats: getCurrentCrowdStats(),
      suggestions: getBestTimeSuggestions({ days, topCount: 3 }),
      lastUpdated: new Date().toISOString(),
    };
  }
}

export async function updateBackendTotalEquipmentCount(totalEquipment: number): Promise<CrowdSettings> {
  const normalized = normalizeEquipmentCount(totalEquipment);
  const updatedAt = new Date().toISOString();

  saveSettings({ totalEquipment: normalized, updatedAt });

  if (!supabase) {
    return updateTotalEquipmentCount(normalized);
  }

  try {
    const { data } = await supabase
      .from("crowd_settings")
      .upsert({
        id: 1,
        total_equipment: normalized,
        updated_at: updatedAt,
      })
      .select("total_equipment, updated_at")
      .single();

    captureCrowdSnapshot();

    return {
      totalEquipment: data?.total_equipment ?? normalized,
      updatedAt: data?.updated_at ?? updatedAt,
    };
  } catch {
    return updateTotalEquipmentCount(normalized);
  }
}

export function getCrowdHistory(days = 7): CrowdHistoryPoint[] {
  const snapshots = readSnapshots();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const filteredSnapshots = snapshots.filter(
    (snapshot) => new Date(snapshot.timestamp) >= cutoff
  );

  const hourlyBuckets = new Map<
    string,
    {
      timestamp: string;
      totalEquipment: number;
      maxActiveUsers: number;
      maxCrowdLevel: number;
      latestCrowdStatus: CrowdStatus;
    }
  >();

  filteredSnapshots.forEach((snapshot) => {
    const bucketDate = new Date(snapshot.timestamp);
    bucketDate.setMinutes(0, 0, 0);
    const bucketKey = bucketDate.toISOString();

    const existingBucket = hourlyBuckets.get(bucketKey);
    if (!existingBucket) {
      hourlyBuckets.set(bucketKey, {
        timestamp: bucketKey,
        totalEquipment: snapshot.totalEquipment,
        maxActiveUsers: snapshot.activeUsers,
        maxCrowdLevel: snapshot.crowdLevel,
        latestCrowdStatus: snapshot.crowdStatus,
      });
      return;
    }

    existingBucket.totalEquipment = snapshot.totalEquipment;
    existingBucket.maxActiveUsers = Math.max(
      existingBucket.maxActiveUsers,
      snapshot.activeUsers
    );
    existingBucket.maxCrowdLevel = Math.max(
      existingBucket.maxCrowdLevel,
      snapshot.crowdLevel
    );
    existingBucket.latestCrowdStatus = snapshot.crowdStatus;
  });

  return Array.from(hourlyBuckets.values())
    .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
    .map((bucket) => ({
      timestamp: bucket.timestamp,
      label: new Date(bucket.timestamp).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
      }),
      activeUsers: bucket.maxActiveUsers,
      totalEquipment: bucket.totalEquipment,
      crowdLevel: bucket.maxCrowdLevel,
      crowdStatus: bucket.latestCrowdStatus,
    }));
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

  sorted.forEach((entry) => {
    if (currentGroup.length === 0) {
      currentGroup = [entry];
      return;
    }

    const previousHour = currentGroup[currentGroup.length - 1].hour;
    if (entry.hour === previousHour + 1) {
      currentGroup.push(entry);
      return;
    }

    groups.push(currentGroup);
    currentGroup = [entry];
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups.map((group) => {
    const startHour = group[0].hour;
    const endHour = (group[group.length - 1].hour + 1) % 24;
    const avgCrowd =
      group.reduce((sum, entry) => sum + entry.avgCrowd, 0) / group.length;
    const avgUsers =
      group.reduce((sum, entry) => sum + entry.avgUsers, 0) / group.length;
    const avgEquipment = avgUsers / Math.max(avgCrowd, 0.00001);

    return {
      startHour,
      endHour,
      label: buildTimeRangeLabel(startHour, endHour),
      avgCrowd,
      status: getCrowdStatus(avgUsers, avgEquipment),
    };
  });
}

export function buildBestTimeSuggestionsFromSnapshots(options: {
  snapshots: CrowdSnapshot[];
  totalEquipment: number;
  days?: number;
  filterCurrentWeekday?: boolean;
  topCount?: number;
  now?: Date;
}): BestTimeSuggestions {
  const days = options.days ?? 7;
  const filterCurrentWeekday = options.filterCurrentWeekday ?? false;
  const topCount = options.topCount ?? 3;
  const now = options.now ?? new Date();
  const safeEquipment = normalizeEquipmentCount(options.totalEquipment);
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

  const hourlyMap = new Map<number, { sumUsers: number; count: number }>();

  filtered.forEach((snapshot) => {
    const hour = new Date(snapshot.timestamp).getHours();
    const current = hourlyMap.get(hour) ?? { sumUsers: 0, count: 0 };

    hourlyMap.set(hour, {
      sumUsers: current.sumUsers + snapshot.activeUsers,
      count: current.count + 1,
    });
  });

  const hourlyAverages: HourlyAverage[] = Array.from(hourlyMap.entries())
    .map(([hour, aggregate]) => {
      const avgUsers = aggregate.sumUsers / aggregate.count;
      const avgCrowd = avgUsers / safeEquipment;

      return {
        hour,
        avgUsers,
        avgCrowd,
        status: getCrowdStatus(avgUsers, safeEquipment),
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
    hourlyAverages.reduce((sum, entry) => sum + entry.avgCrowd, 0) /
    hourlyAverages.length;

  let message: string | undefined;
  if (avgCrowdOverall <= 0.4) {
    message = "Gym is usually not busy";
  } else if (avgCrowdOverall >= 0.71) {
    message = "Gym is usually crowded";
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

export function getBestTimeSuggestions(options?: {
  days?: number;
  filterCurrentWeekday?: boolean;
  topCount?: number;
}): BestTimeSuggestions {
  return buildBestTimeSuggestionsFromSnapshots({
    snapshots: readSnapshots(),
    totalEquipment: getTotalEquipmentCount(),
    days: options?.days,
    filterCurrentWeekday: options?.filterCurrentWeekday,
    topCount: options?.topCount,
  });
}

export function resetCrowdData(): void {
  fallbackSettings = {
    totalEquipment: DEFAULT_EQUIPMENT_COUNT,
    updatedAt: new Date().toISOString(),
  };
  fallbackSessions = [];
  fallbackSnapshots = [];

  if (hasLocalStorage()) {
    localStorage.removeItem(STORAGE_KEYS.sessions);
    localStorage.removeItem(STORAGE_KEYS.snapshots);
    localStorage.removeItem(STORAGE_KEYS.settings);
  }
}