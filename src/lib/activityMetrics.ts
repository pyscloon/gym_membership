export type ActivityMetricRow = {
  walk_in_time: string;
  walk_in_type: string | null;
};

export type CompletedSessionMetrics = {
  completedSessionDates: Date[];
  completedDaySet: Set<string>;
  currentWeekStart: Date;
  streakDays: number;
  totalSessions: number;
  monthSessions: number;
  weekSessions: number;
};

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isCheckout(type: string | null | undefined): boolean {
  return String(type ?? "").toLowerCase() === "checkout";
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
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function buildCompletedSessionMetrics(
  rows: ActivityMetricRow[],
  today: Date = new Date()
): CompletedSessionMetrics {
  const completedSessionDates = rows
    .filter((row) => isCheckout(row.walk_in_type))
    .map((row) => new Date(row.walk_in_time))
    .filter((date) => !isNaN(date.getTime()));

  const completedDaySet = new Set(completedSessionDates.map((date) => dateKey(date)));
  const currentWeekStart = startOfWeek(today);

  return {
    completedSessionDates,
    completedDaySet,
    currentWeekStart,
    streakDays: computeStreak(completedDaySet, today),
    totalSessions: completedSessionDates.length,
    monthSessions: completedSessionDates.filter(
      (date) => date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()
    ).length,
    weekSessions: completedSessionDates.filter((date) => date >= currentWeekStart).length,
  };
}
