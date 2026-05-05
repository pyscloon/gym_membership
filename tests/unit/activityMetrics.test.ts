import {
  buildCompletedSessionMetrics,
  type ActivityMetricRow,
} from "../../src/lib/activityMetrics";

describe("completed session activity metrics", () => {
  const now = new Date("2026-05-05T10:00:00+08:00");

  test("counts only checkout rows as completed sessions", () => {
    const rows: ActivityMetricRow[] = [
      { walk_in_time: "2026-05-05T08:00:00+08:00", walk_in_type: "checkin" },
      { walk_in_time: "2026-05-05T09:00:00+08:00", walk_in_type: "checkout" },
      { walk_in_time: "2026-05-04T09:00:00+08:00", walk_in_type: "walk_in" },
      { walk_in_time: "2026-05-03T09:00:00+08:00", walk_in_type: "checkout" },
    ];

    const metrics = buildCompletedSessionMetrics(rows, now);

    expect(metrics.completedSessionDates).toHaveLength(2);
    expect(metrics.totalSessions).toBe(2);
    expect(metrics.monthSessions).toBe(2);
    expect(metrics.weekSessions).toBe(1);
    expect(metrics.streakDays).toBe(1);
    expect(metrics.completedDaySet.has("2026-05-05")).toBe(true);
    expect(metrics.completedDaySet.has("2026-05-04")).toBe(false);
  });

  test("does not start a streak when today only has checkin activity", () => {
    const rows: ActivityMetricRow[] = [
      { walk_in_time: "2026-05-05T08:00:00+08:00", walk_in_type: "checkin" },
    ];

    const metrics = buildCompletedSessionMetrics(rows, now);

    expect(metrics.totalSessions).toBe(0);
    expect(metrics.weekSessions).toBe(0);
    expect(metrics.streakDays).toBe(0);
    expect(metrics.completedDaySet.has("2026-05-05")).toBe(false);
  });

  test("starts a streak when today has checkout activity", () => {
    const rows: ActivityMetricRow[] = [
      { walk_in_time: "2026-05-05T09:00:00+08:00", walk_in_type: "checkout" },
    ];

    const metrics = buildCompletedSessionMetrics(rows, now);

    expect(metrics.totalSessions).toBe(1);
    expect(metrics.weekSessions).toBe(1);
    expect(metrics.streakDays).toBe(1);
    expect(metrics.completedDaySet.has("2026-05-05")).toBe(true);
  });
});
