/**
 * Analytics Service - Process and aggregate walk-in vs member data
 */

import { getAllTransactions } from "./paymentSimulator";
import { supabase } from "./supabaseClient";
import type { PaymentMethod, PaymentStatus, PaymentTransaction, UserType } from "../types/payment";

const ANALYTICS_TIMEZONE = "Asia/Manila";
const VALID_ANALYTICS_STATUSES: PaymentStatus[] = [
  "paid",
  "awaiting-confirmation",
  "awaiting-verification",
];

type TransactionRow = {
  id: string;
  user_id: string;
  user_type: string;
  amount: number;
  method: string;
  status: string;
  payment_proof_status: string | null;
  proof_of_payment_url: string | null;
  discount_id_proof_url: string | null;
  rejection_reason: string | null;
  failure_reason: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ANALYTICS_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export interface DailyStats {
  date: string;
  members: number;
  monthlyMembers: number;
  semiYearlyMembers: number;
  yearlyMembers: number;
  memberRevenue: number;
  monthlyMemberRevenue: number;
  semiYearlyMemberRevenue: number;
  yearlyMemberRevenue: number;
  walkIns: number;
  walkInRevenue: number;
}

export interface AggregateStats {
  totalMembers: number;
  monthlyMembers: number;
  semiYearlyMembers: number;
  yearlyMembers: number;
  totalMemberRevenue: number;
  monthlyMemberRevenue: number;
  semiYearlyMemberRevenue: number;
  yearlyMemberRevenue: number;
  totalWalkIns: number;
  totalWalkInRevenue: number;
  memberRatio: number;
  walkInRatio: number;
}

export interface AnalyticsData {
  dailyStats: DailyStats[];
  aggregateStats: AggregateStats;
}

function formatDateKey(dateString: string): string {
  return dateKeyFormatter.format(new Date(dateString));
}

function rowToTransaction(row: TransactionRow): PaymentTransaction {
  return {
    id: row.id,
    userId: row.user_id,
    userType: row.user_type as UserType,
    amount: row.amount,
    method: row.method as PaymentMethod,
    status: row.status as PaymentStatus,
    paymentProofStatus: (row.payment_proof_status as PaymentTransaction["paymentProofStatus"]) ?? undefined,
    proofOfPaymentUrl: row.proof_of_payment_url ?? undefined,
    discountIdProofUrl: row.discount_id_proof_url ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    failureReason: row.failure_reason ?? undefined,
    confirmedAt: row.confirmed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchTransactions(): Promise<PaymentTransaction[]> {
  if (!supabase) {
    return getAllTransactions();
  }

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .in("status", VALID_ANALYTICS_STATUSES)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message || "Failed to fetch analytics transactions");
  }

  return ((data ?? []) as TransactionRow[]).map(rowToTransaction);
}

function buildAnalyticsData(transactions: PaymentTransaction[]): AnalyticsData {
  const validTransactions = transactions.filter((transaction) =>
    VALID_ANALYTICS_STATUSES.includes(transaction.status)
  );

  const dailyMap = new Map<string, DailyStats>();

  validTransactions.forEach((transaction) => {
    const dateKey = formatDateKey(transaction.createdAt);

    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        date: dateKey,
        members: 0,
        monthlyMembers: 0,
        semiYearlyMembers: 0,
        yearlyMembers: 0,
        memberRevenue: 0,
        monthlyMemberRevenue: 0,
        semiYearlyMemberRevenue: 0,
        yearlyMemberRevenue: 0,
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
      if (transaction.userType === "monthly") {
        dayStats.monthlyMembers += 1;
        dayStats.monthlyMemberRevenue += transaction.amount;
      } else if (transaction.userType === "semi-yearly") {
        dayStats.semiYearlyMembers += 1;
        dayStats.semiYearlyMemberRevenue += transaction.amount;
      } else if (transaction.userType === "yearly") {
        dayStats.yearlyMembers += 1;
        dayStats.yearlyMemberRevenue += transaction.amount;
      }
    }
  });

  const dailyStats = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const totalMembers = validTransactions.filter((t) => t.userType !== "walk-in").length;
  const totalMemberRevenue = validTransactions
    .filter((t) => t.userType !== "walk-in")
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyMembers = validTransactions.filter((t) => t.userType === "monthly").length;
  const monthlyMemberRevenue = validTransactions
    .filter((t) => t.userType === "monthly")
    .reduce((sum, t) => sum + t.amount, 0);

  const semiYearlyMembers = validTransactions.filter((t) => t.userType === "semi-yearly").length;
  const semiYearlyMemberRevenue = validTransactions
    .filter((t) => t.userType === "semi-yearly")
    .reduce((sum, t) => sum + t.amount, 0);

  const yearlyMembers = validTransactions.filter((t) => t.userType === "yearly").length;
  const yearlyMemberRevenue = validTransactions
    .filter((t) => t.userType === "yearly")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWalkIns = validTransactions.filter((t) => t.userType === "walk-in").length;
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
      monthlyMembers,
      semiYearlyMembers,
      yearlyMembers,
      totalMemberRevenue,
      monthlyMemberRevenue,
      semiYearlyMemberRevenue,
      yearlyMemberRevenue,
      totalWalkIns,
      totalWalkInRevenue,
      memberRatio,
      walkInRatio,
    },
  };
}

export async function getWalkInVsMemberAnalytics(): Promise<AnalyticsData> {
  const transactions = await fetchTransactions();
  return buildAnalyticsData(transactions);
}

export async function getWalkInVsMemberAnalyticsByDays(
  days: number = 30
): Promise<AnalyticsData> {
  const analytics = await getWalkInVsMemberAnalytics();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffKey = formatDateKey(cutoffDate.toISOString());

  const filteredDailyStats = analytics.dailyStats.filter((stat) => stat.date >= cutoffKey);

  let totalMembers = 0;
  let monthlyMembers = 0;
  let semiYearlyMembers = 0;
  let yearlyMembers = 0;
  let totalMemberRevenue = 0;
  let monthlyMemberRevenue = 0;
  let semiYearlyMemberRevenue = 0;
  let yearlyMemberRevenue = 0;
  let totalWalkIns = 0;
  let totalWalkInRevenue = 0;

  filteredDailyStats.forEach((stat) => {
    totalMembers += stat.members;
    monthlyMembers += stat.monthlyMembers;
    semiYearlyMembers += stat.semiYearlyMembers;
    yearlyMembers += stat.yearlyMembers;
    totalMemberRevenue += stat.memberRevenue;
    monthlyMemberRevenue += stat.monthlyMemberRevenue;
    semiYearlyMemberRevenue += stat.semiYearlyMemberRevenue;
    yearlyMemberRevenue += stat.yearlyMemberRevenue;
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
      monthlyMembers,
      semiYearlyMembers,
      yearlyMembers,
      totalMemberRevenue,
      monthlyMemberRevenue,
      semiYearlyMemberRevenue,
      yearlyMemberRevenue,
      totalWalkIns,
      totalWalkInRevenue,
      memberRatio,
      walkInRatio,
    },
  };
}
