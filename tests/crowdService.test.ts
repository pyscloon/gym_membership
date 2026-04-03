import { describe, expect, it, beforeEach, jest } from "@jest/globals";
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

const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.assign(global, { localStorage: localStorageMock });

describe("crowdService", () => {
  beforeEach(() => {
    resetCrowdData();
    localStorageMock.clear();
    jest.restoreAllMocks();
  });

  it("calculates crowd status from active users and equipment", () => {
    expect(getCrowdStatus(10, 50)).toBe("Not Busy");
    expect(getCrowdStatus(21, 50)).toBe("Moderate");
    expect(getCrowdStatus(40, 50)).toBe("Crowded");
  });

  it("tracks sessions and current crowd stats", () => {
    updateTotalEquipmentCount(20);
    startCrowdSession({ userId: "user-1", sessionType: "member" });
    startCrowdSession({ userId: null, sessionType: "walk-in", sessionId: "walk-1" });

    const stats = getCurrentCrowdStats();

    expect(stats.activeUsers).toBe(2);
    expect(stats.totalEquipment).toBe(20);
    expect(stats.crowdStatus).toBe("Not Busy");
  });

  it("ends sessions and records snapshots", () => {
    updateTotalEquipmentCount(10);
    startCrowdSession({ userId: "user-1", sessionType: "member" });
    endCrowdSession({ userId: "user-1" });
    captureCrowdSnapshot();

    const stats = getCurrentCrowdStats();
    const history = getCrowdHistory(7);

    expect(stats.activeUsers).toBe(0);
    expect(history.length).toBeGreaterThan(0);
  });

  it("falls back to a default equipment count when invalid values are provided", () => {
    updateTotalEquipmentCount(-5);

    expect(getTotalEquipmentCount()).toBeGreaterThan(0);
  });

  it("returns not-enough-data message when snapshots are insufficient", () => {
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

  it("builds grouped best and worst ranges from hourly snapshot averages", () => {
    const now = new Date("2026-04-03T12:00:00.000Z");

    const snapshots = [
      { id: "1", timestamp: "2026-04-03T05:00:00.000Z", activeUsers: 6, totalEquipment: 50, crowdLevel: 0.12, crowdStatus: "Not Busy" as const },
      { id: "2", timestamp: "2026-04-03T06:00:00.000Z", activeUsers: 8, totalEquipment: 50, crowdLevel: 0.16, crowdStatus: "Not Busy" as const },
      { id: "3", timestamp: "2026-04-03T18:00:00.000Z", activeUsers: 33, totalEquipment: 50, crowdLevel: 0.66, crowdStatus: "Moderate" as const },
      { id: "4", timestamp: "2026-04-03T19:00:00.000Z", activeUsers: 39, totalEquipment: 50, crowdLevel: 0.78, crowdStatus: "Crowded" as const },
      { id: "5", timestamp: "2026-04-02T05:00:00.000Z", activeUsers: 7, totalEquipment: 50, crowdLevel: 0.14, crowdStatus: "Not Busy" as const },
      { id: "6", timestamp: "2026-04-02T19:00:00.000Z", activeUsers: 36, totalEquipment: 50, crowdLevel: 0.72, crowdStatus: "Crowded" as const },
    ];

    const result = buildBestTimeSuggestionsFromSnapshots({
      snapshots,
      totalEquipment: 50,
      days: 7,
      topCount: 2,
      now,
    });

    expect(result.best_time_ranges.length).toBeGreaterThan(0);
    expect(result.worst_time_ranges.length).toBeGreaterThan(0);
    expect(result.best_time_ranges[0].avgCrowd).toBeLessThan(
      result.worst_time_ranges[0].avgCrowd
    );
  });
});