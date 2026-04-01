/**
 * Analytics Service - Process and aggregate walk-in vs member data
 */

import { getAllTransactions } from "./paymentSimulator";

export interface DailyStats {
  date: string;
  members: number;
  memberRevenue: number;
  walkIns: number;
  walkInRevenue: number;
}

export interface AggregateStats {
  totalMembers: number;
  totalMemberRevenue: number;
  totalWalkIns: number;
  totalWalkInRevenue: number;
  memberRatio: number; // percentage
  walkInRatio: number; // percentage
}

export interface AnalyticsData {
  dailyStats: DailyStats[];
  aggregateStats: AggregateStats;
}

/**
 * Format date to YYYY-MM-DD for grouping
 */
function formatDateKey(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().split("T")[0];
}

/**
 * Get analytics data for walk-in vs members over time
 * @returns Analytics data with daily trends and aggregate stats
 */
export function getWalkInVsMemberAnalytics(): AnalyticsData {
  const transactions = getAllTransactions();

  // Filter only completed or paid transactions
  const validTransactions = transactions.filter(
    (t) => t.status === "paid" || t.status === "awaiting-confirmation"
  );

  // Group transactions by date
  const dailyMap = new Map<string, DailyStats>();

  validTransactions.forEach((transaction) => {
    const dateKey = formatDateKey(transaction.createdAt);
    
    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        date: dateKey,
        members: 0,
        memberRevenue: 0,
        walkIns: 0,
        walkInRevenue: 0,
      });
    }

    const dayStats = dailyMap.get(dateKey)!;

    if (transaction.userType === "walk-in") {
      dayStats.walkIns += 1;
      dayStats.walkInRevenue += transaction.amount;
    } else {
      dayStats.members += 1;
      dayStats.memberRevenue += transaction.amount;
    }
  });

  // Convert to sorted array
  const dailyStats = Array.from(dailyMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate aggregate stats
  const totalMembers = validTransactions.filter(
    (t) => t.userType !== "walk-in"
  ).length;
  const totalMemberRevenue = validTransactions
    .filter((t) => t.userType !== "walk-in")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWalkIns = validTransactions.filter(
    (t) => t.userType === "walk-in"
  ).length;
  const totalWalkInRevenue = validTransactions
    .filter((t) => t.userType === "walk-in")
    .reduce((sum, t) => sum + t.amount, 0);

  const total = totalMembers + totalWalkIns;
  const memberRatio = total > 0 ? (totalMembers / total) * 100 : 0;
  const walkInRatio = total > 0 ? (totalWalkIns / total) * 100 : 0;

  return {
    dailyStats,
    aggregateStats: {
      totalMembers,
      totalMemberRevenue,
      totalWalkIns,
      totalWalkInRevenue,
      memberRatio,
      walkInRatio,
    },
  };
}

/**
 * Get last N days of analytics data
 * @param days - Number of days to retrieve
 */
export function getWalkInVsMemberAnalyticsByDays(
  days: number = 30
): AnalyticsData {
  const analytics = getWalkInVsMemberAnalytics();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const filteredDailyStats = analytics.dailyStats.filter(
    (stat) => new Date(stat.date) >= cutoffDate
  );

  // Recalculate aggregate for the filtered period
  let totalMembers = 0;
  let totalMemberRevenue = 0;
  let totalWalkIns = 0;
  let totalWalkInRevenue = 0;

  filteredDailyStats.forEach((stat) => {
    totalMembers += stat.members;
    totalMemberRevenue += stat.memberRevenue;
    totalWalkIns += stat.walkIns;
    totalWalkInRevenue += stat.walkInRevenue;
  });

  const total = totalMembers + totalWalkIns;
  const memberRatio = total > 0 ? (totalMembers / total) * 100 : 0;
  const walkInRatio = total > 0 ? (totalWalkIns / total) * 100 : 0;

  return {
    dailyStats: filteredDailyStats,
    aggregateStats: {
      totalMembers,
      totalMemberRevenue,
      totalWalkIns,
      totalWalkInRevenue,
      memberRatio,
      walkInRatio,
    },
  };
}
