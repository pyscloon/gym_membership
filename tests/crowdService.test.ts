import { describe, expect, it, beforeEach, beforeAll, jest } from "@jest/globals";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import {
  buildBestTimeSuggestionsFromSnapshots,
  captureCrowdSnapshot,
  endCrowdSession,
  getCrowdHistory,
  getCrowdStatus,
  getCurrentCrowdStats,
  getTotalEquipmentCount,
  resetCrowdData,
  startCrowdSession,
  updateTotalEquipmentCount,
} from "../src/lib/crowdService";

dotenv.config();

const REQUIRED_ENV = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"] as const;

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`Missing required env variable: ${key}`);
  }
}

const supabaseUrl     = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase        = createClient(supabaseUrl, supabaseAnonKey);

// ── localStorage mock ──────────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem:    (key: string)              => (key in store ? store[key] : null),
    setItem:    (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string)              => { delete store[key]; },
    clear:      ()                         => { store = {}; },
  };
})();

Object.assign(global, { localStorage: localStorageMock });

// ── Fixtures ───────────────────────────────────────────────────────────────────

const MOCK_SNAPSHOTS = [
  { id: "1", timestamp: "2026-04-03T05:00:00.000Z", activeUsers: 6,  totalEquipment: 50, crowdLevel: 0.12, crowdStatus: "Not Busy"  as const },
  { id: "2", timestamp: "2026-04-03T06:00:00.000Z", activeUsers: 8,  totalEquipment: 50, crowdLevel: 0.16, crowdStatus: "Not Busy"  as const },
  { id: "3", timestamp: "2026-04-03T18:00:00.000Z", activeUsers: 33, totalEquipment: 50, crowdLevel: 0.66, crowdStatus: "Moderate"  as const },
  { id: "4", timestamp: "2026-04-03T19:00:00.000Z", activeUsers: 39, totalEquipment: 50, crowdLevel: 0.78, crowdStatus: "Crowded"   as const },
  { id: "5", timestamp: "2026-04-02T05:00:00.000Z", activeUsers: 7,  totalEquipment: 50, crowdLevel: 0.14, crowdStatus: "Not Busy"  as const },
  { id: "6", timestamp: "2026-04-02T19:00:00.000Z", activeUsers: 36, totalEquipment: 50, crowdLevel: 0.72, crowdStatus: "Crowded"   as const },
];

const NOW = new Date("2026-04-03T12:00:00.000Z");

// ── Suite ──────────────────────────────────────────────────────────────────────

describe("crowdService", () => {
  beforeAll(async () => {
    // Confirm Supabase is reachable before running any tests
    const { error } = await supabase.from("walk_ins").select("id").limit(1);
    const isReachable =
      !error ||
      error.message.includes("permission") ||
      error.code === "PGRST301";

    if (!isReachable) {
      throw new Error(`Supabase unreachable: ${error?.message}`);
    }
  });

  beforeEach(() => {
    resetCrowdData();
    localStorageMock.clear();
    jest.restoreAllMocks();
  });

  // ── getCrowdStatus ───────────────────────────────────────────────────────────

  describe("getCrowdStatus — Happy Path", () => {
    it("returns Not Busy when gym is under 40% capacity", () => {
      expect(getCrowdStatus(10, 50)).toBe("Not Busy");
    });

    it("returns Moderate when gym is between 40–79% capacity", () => {
      expect(getCrowdStatus(21, 50)).toBe("Moderate");
    });

    it("returns Crowded when gym is at or above 80% capacity", () => {
      expect(getCrowdStatus(40, 50)).toBe("Crowded");
    });
  });

  describe("getCrowdStatus — Sad Path", () => {
    it("handles zero equipment without throwing", () => {
      expect(() => getCrowdStatus(10, 0)).not.toThrow();
    });

    it("handles zero active users", () => {
      expect(getCrowdStatus(0, 50)).toBe("Not Busy");
    });
  });

  // ── Session tracking ─────────────────────────────────────────────────────────

  describe("startCrowdSession / getCurrentCrowdStats — Happy Path", () => {
    it("tracks member and walk-in sessions correctly", () => {
      updateTotalEquipmentCount(20);
      startCrowdSession({ userId: "user-1", sessionType: "member" });
      startCrowdSession({ userId: null, sessionType: "walk-in", sessionId: "walk-1" });

      const stats = getCurrentCrowdStats();

      expect(stats.activeUsers).toBe(2);
      expect(stats.totalEquipment).toBe(20);
      expect(stats.crowdStatus).toBe("Not Busy");
    });
  });

  describe("startCrowdSession / getCurrentCrowdStats — Sad Path", () => {
    it("does not double-count the same session started twice", () => {
      startCrowdSession({ userId: "user-1", sessionType: "member" });
      startCrowdSession({ userId: "user-1", sessionType: "member" });

      expect(getCurrentCrowdStats().activeUsers).toBeLessThanOrEqual(1);
    });
  });

  // ── endCrowdSession / snapshot ───────────────────────────────────────────────

  describe("endCrowdSession — Happy Path", () => {
    it("removes the session and records a snapshot", () => {
      updateTotalEquipmentCount(10);
      startCrowdSession({ userId: "user-1", sessionType: "member" });
      endCrowdSession({ userId: "user-1" });
      captureCrowdSnapshot();

      expect(getCurrentCrowdStats().activeUsers).toBe(0);
      expect(getCrowdHistory(7).length).toBeGreaterThan(0);
    });
  });

  describe("endCrowdSession — Sad Path", () => {
    it("does not throw when ending a session that was never started", () => {
      expect(() => endCrowdSession({ userId: "ghost-user" })).not.toThrow();
    });
  });

  // ── updateTotalEquipmentCount ────────────────────────────────────────────────

  describe("updateTotalEquipmentCount — Happy Path", () => {
    it("updates and persists the equipment count", () => {
      updateTotalEquipmentCount(30);
      expect(getTotalEquipmentCount()).toBe(30);
    });
  });

  describe("updateTotalEquipmentCount — Sad Path", () => {
    it("falls back to a positive default when a negative value is provided", () => {
      updateTotalEquipmentCount(-5);
      expect(getTotalEquipmentCount()).toBeGreaterThan(0);
    });

    it("falls back to a positive default when zero is provided", () => {
      updateTotalEquipmentCount(0);
      expect(getTotalEquipmentCount()).toBeGreaterThan(0);
    });
  });

  // ── buildBestTimeSuggestionsFromSnapshots ────────────────────────────────────

  describe("buildBestTimeSuggestionsFromSnapshots — Happy Path", () => {
    it("builds grouped best and worst ranges from snapshot averages", () => {
      const result = buildBestTimeSuggestionsFromSnapshots({
        snapshots: MOCK_SNAPSHOTS,
        totalEquipment: 50,
        days: 7,
        topCount: 2,
        now: NOW,
      });

      expect(result.best_time_ranges.length).toBeGreaterThan(0);
      expect(result.worst_time_ranges.length).toBeGreaterThan(0);
    });

    it("best ranges have lower avgCrowd than worst ranges", () => {
      const result = buildBestTimeSuggestionsFromSnapshots({
        snapshots: MOCK_SNAPSHOTS,
        totalEquipment: 50,
        days: 7,
        topCount: 2,
        now: NOW,
      });

      expect(result.best_time_ranges[0].avgCrowd).toBeLessThan(
        result.worst_time_ranges[0].avgCrowd
      );
    });

    it("each range has the required fields", () => {
      const result = buildBestTimeSuggestionsFromSnapshots({
        snapshots: MOCK_SNAPSHOTS,
        totalEquipment: 50,
        days: 7,
        topCount: 2,
        now: NOW,
      });

      for (const range of [...result.best_time_ranges, ...result.worst_time_ranges]) {
        expect(typeof range.label).toBe("string");
        expect(typeof range.startHour).toBe("number");
        expect(typeof range.endHour).toBe("number");
        expect(typeof range.avgCrowd).toBe("number");
      }
    });
  });

  describe("buildBestTimeSuggestionsFromSnapshots — Sad Path", () => {
    it("returns not-enough-data when snapshots array is empty", () => {
      const result = buildBestTimeSuggestionsFromSnapshots({
        snapshots: [],
        totalEquipment: 50,
        days: 7,
        topCount: 3,
      });

      expect(result.message).toBe("Not enough data yet");
      expect(result.best_time_ranges).toHaveLength(0);
      expect(result.worst_time_ranges).toHaveLength(0);
    });

    it("returns not-enough-data when only one snapshot is provided", () => {
      const result = buildBestTimeSuggestionsFromSnapshots({
        snapshots: [MOCK_SNAPSHOTS[0]],
        totalEquipment: 50,
        days: 7,
        topCount: 3,
      });

      expect(result.message).toBe("Not enough data yet");
    });

    it("excludes snapshots outside the requested day window", () => {
      const staleSnapshot = {
        ...MOCK_SNAPSHOTS[0],
        id: "stale",
        timestamp: "2025-01-01T05:00:00.000Z",
      };

      const result = buildBestTimeSuggestionsFromSnapshots({
        snapshots: [staleSnapshot],
        totalEquipment: 50,
        days: 7,
        topCount: 3,
        now: NOW,
      });

      expect(result.message).toBe("Not enough data yet");
    });
  });

  // ── Supabase live check ──────────────────────────────────────────────────────

  describe("Supabase — crowd_snapshots table", () => {
    it("confirms the crowd_snapshots table is accessible", async () => {
      const { error } = await supabase
        .from("crowd_snapshots")
        .select("id")
        .limit(1);

      const isAccessible =
        !error ||
        error.message.includes("permission") ||
        error.code === "PGRST301";

      expect(isAccessible).toBe(true);
    });
  });
});