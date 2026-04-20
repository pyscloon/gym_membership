/**
 * AnalyticsDashboard Component - Displays walk-in vs member trends and revenue analytics
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getWalkInVsMemberAnalyticsByDays } from "../lib/analyticsService";
import type { AnalyticsData } from "../lib/analyticsService";

const MEMBER_COLOR = "#1e3a8a"; // flexBlue
const WALKIN_COLOR = "#0f766e"; // flexNavy teal
const MEMBER_REVENUE_COLOR = "#3b82f6"; // lighter blue
const WALKIN_REVENUE_COLOR = "#14b8a6"; // teal

type AnalyticsDashboardProps = {
  showBackButton?: boolean;
  minimalView?: boolean;
};

export default function AnalyticsDashboard({
  showBackButton = true,
  minimalView = false,
}: AnalyticsDashboardProps) {
  const navigate = useNavigate();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [timeRange, setTimeRange] = useState<30 | 60 | 90>(30);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadAnalytics = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await getWalkInVsMemberAnalyticsByDays(timeRange);

        if (!isMounted) return;
        setAnalyticsData(data);
      } catch (error) {
        if (!isMounted) return;
        setAnalyticsData(null);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load analytics right now."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAnalytics();

    const refreshInterval = window.setInterval(loadAnalytics, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(refreshInterval);
    };
  }, [timeRange]);

  if (isLoading) {
    return (
      <section className={minimalView ? "mt-6" : "mt-6 rounded-2xl border border-flexNavy/15 bg-flexWhite/70 p-6"}>
        <p className="text-center text-sm text-flexNavy py-8">
          Loading analytics...
        </p>
      </section>
    );
  }

  if (errorMessage || !analyticsData) {
    return (
      <section className={minimalView ? "mt-6" : "mt-6 rounded-2xl border border-red-200 bg-red-50/80 p-6"}>
        <p className="text-center text-sm font-semibold text-red-700 py-2">
          Unable to load analytics data
        </p>
        <p className="text-center text-sm text-red-600/90">
          {errorMessage ?? "No analytics data is available."}
        </p>
      </section>
    );
  }

  const { dailyStats, aggregateStats } = analyticsData;

  // Transform data for pie chart
  const pieData = [
    {
      name: "Members",
      value: aggregateStats.totalMembers,
      color: MEMBER_COLOR,
    },
    {
      name: "Walk-Ins",
      value: aggregateStats.totalWalkIns,
      color: WALKIN_COLOR,
    },
  ];

  return (
    <section className="mt-6 space-y-6">
      {/* Header and Time Range Controls */}
      <div className={minimalView ? "border-y border-flexNavy/15 py-4" : "rounded-2xl border border-flexNavy/15 bg-flexWhite/70 p-6"}>
        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
          {showBackButton && (
            <button
              type="button"
              onClick={() => navigate("/admin/dashboard")}
              className="inline-flex w-fit items-center gap-2 rounded-lg bg-flexBlue px-4 py-2 text-sm font-semibold text-white transition hover:bg-flexBlue/90"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Dashboard
            </button>
          )}
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-flexNavy font-semibold">
              Analytics & Trends
            </p>
            <p className="text-sm text-flexNavy/60 mt-0.5">
              Walk-In vs Member Performance Metrics
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {[30, 60, 90].map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range as 30 | 60 | 90)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  timeRange === range
                    ? "bg-flexBlue text-white"
                    : "bg-flexWhite border border-flexNavy/15 text-flexNavy hover:bg-flexNavy/5"
                }`}
              >
                {range}d
              </button>
            ))}
          </div>
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border border-flexNavy/10 bg-flexWhite p-4">
            <p className="text-xs uppercase tracking-wider text-flexNavy font-semibold">
              Total Members
            </p>
            <p className="text-2xl font-bold text-flexBlack mt-2">
              {aggregateStats.totalMembers}
            </p>
            <p className="text-xs text-flexNavy/60 mt-1">
              {aggregateStats.memberRatio.toFixed(1)}%
            </p>
          </div>

          <div className="rounded-lg border border-flexNavy/10 bg-flexWhite p-4">
            <p className="text-xs uppercase tracking-wider text-flexNavy font-semibold">
              Member Revenue
            </p>
            <p className="text-2xl font-bold text-flexBlack mt-2">
              ₱{aggregateStats.totalMemberRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-flexNavy/60 mt-1">Total</p>
          </div>

          <div className="rounded-lg border border-flexNavy/10 bg-flexWhite p-4">
            <p className="text-xs uppercase tracking-wider text-flexNavy font-semibold">
              Total Walk-Ins
            </p>
            <p className="text-2xl font-bold text-flexBlack mt-2">
              {aggregateStats.totalWalkIns}
            </p>
            <p className="text-xs text-flexNavy/60 mt-1">
              {aggregateStats.walkInRatio.toFixed(1)}%
            </p>
          </div>

          <div className="rounded-lg border border-flexNavy/10 bg-flexWhite p-4">
            <p className="text-xs uppercase tracking-wider text-flexNavy font-semibold">
              Walk-In Revenue
            </p>
            <p className="text-2xl font-bold text-flexBlack mt-2">
              ₱{aggregateStats.totalWalkInRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-flexNavy/60 mt-1">Total</p>
          </div>
        </div>
      </div>

      {/* Daily Traffic Trends */}
      <div className={minimalView ? "border-y border-flexNavy/15 py-4" : "rounded-2xl border border-flexNavy/15 bg-flexWhite/70 p-6"}>
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.18em] text-flexNavy font-semibold">
            Daily Activity Trends
          </p>
          <p className="text-sm text-flexNavy/60 mt-0.5">
            Number of members vs walk-ins per day
          </p>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyStats}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: "#334155" }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12, fill: "#334155" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "0.5rem",
              }}
              formatter={(value) => value}
            />
            <Legend wrapperStyle={{ paddingTop: "20px" }} />
            <Line
              type="monotone"
              dataKey="members"
              stroke={MEMBER_COLOR}
              name="Members"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="walkIns"
              stroke={WALKIN_COLOR}
              name="Walk-Ins"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Daily Revenue Trends */}
      <div className={minimalView ? "border-y border-flexNavy/15 py-4" : "rounded-2xl border border-flexNavy/15 bg-flexWhite/70 p-6"}>
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.18em] text-flexNavy font-semibold">
            Daily Revenue Trends
          </p>
          <p className="text-sm text-flexNavy/60 mt-0.5">
            Revenue comparison between members and walk-ins
          </p>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dailyStats}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: "#334155" }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12, fill: "#334155" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "0.5rem",
              }}
              formatter={(value) =>
                typeof value === "number"
                  ? `₱${value.toLocaleString()}`
                  : value
              }
            />
            <Legend wrapperStyle={{ paddingTop: "20px" }} />
            <Bar
              dataKey="memberRevenue"
              fill={MEMBER_REVENUE_COLOR}
              name="Member Revenue"
            />
            <Bar
              dataKey="walkInRevenue"
              fill={WALKIN_REVENUE_COLOR}
              name="Walk-In Revenue"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Ratio Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Members vs Walk-Ins Pie Chart */}
        <div className={minimalView ? "border-y border-flexNavy/15 py-4" : "rounded-2xl border border-flexNavy/15 bg-flexWhite/70 p-6"}>
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.18em] text-flexNavy font-semibold">
              Activity Ratio
            </p>
            <p className="text-sm text-flexNavy/60 mt-0.5">
              Proportion of members vs walk-ins
            </p>
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => `${value} visits`}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "0.5rem",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Distribution */}
        <div className={minimalView ? "border-y border-flexNavy/15 py-4" : "rounded-2xl border border-flexNavy/15 bg-flexWhite/70 p-6"}>
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.18em] text-flexNavy font-semibold">
              Revenue Distribution
            </p>
            <p className="text-sm text-flexNavy/60 mt-0.5">
              Total revenue breakdown
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: MEMBER_COLOR }}
                  ></div>
                  <p className="text-sm font-semibold text-flexBlack">
                    Member Revenue
                  </p>
                </div>
                <p className="text-sm font-bold text-flexBlack">
                  ₱{aggregateStats.totalMemberRevenue.toLocaleString()}
                </p>
              </div>
              <div className="w-full bg-flexNavy/10 rounded-full h-2">
                <div
                  className="bg-flexBlue h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      (aggregateStats.totalMemberRevenue /
                        (aggregateStats.totalMemberRevenue +
                          aggregateStats.totalWalkInRevenue)) *
                      100
                    }%`,
                  }}
                ></div>
              </div>
              <p className="text-xs text-flexNavy/60 mt-1">
                {(
                  (aggregateStats.totalMemberRevenue /
                    (aggregateStats.totalMemberRevenue +
                      aggregateStats.totalWalkInRevenue)) *
                  100
                ).toFixed(1)}
                %
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: WALKIN_COLOR }}
                  ></div>
                  <p className="text-sm font-semibold text-flexBlack">
                    Walk-In Revenue
                  </p>
                </div>
                <p className="text-sm font-bold text-flexBlack">
                  ₱{aggregateStats.totalWalkInRevenue.toLocaleString()}
                </p>
              </div>
              <div className="w-full bg-flexNavy/10 rounded-full h-2">
                <div
                  className="bg-teal-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      (aggregateStats.totalWalkInRevenue /
                        (aggregateStats.totalMemberRevenue +
                          aggregateStats.totalWalkInRevenue)) *
                      100
                    }%`,
                  }}
                ></div>
              </div>
              <p className="text-xs text-flexNavy/60 mt-1">
                {(
                  (aggregateStats.totalWalkInRevenue /
                    (aggregateStats.totalMemberRevenue +
                      aggregateStats.totalWalkInRevenue)) *
                  100
                ).toFixed(1)}
                %
              </p>
            </div>

            <div className="pt-4 border-t border-flexNavy/10">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-flexBlack">
                  Total Revenue
                </p>
                <p className="text-lg font-bold text-flexBlack">
                  ₱
                  {(
                    aggregateStats.totalMemberRevenue +
                    aggregateStats.totalWalkInRevenue
                  ).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
