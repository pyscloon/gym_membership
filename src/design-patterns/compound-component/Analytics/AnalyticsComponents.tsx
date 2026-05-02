import React from 'react';
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
import { useAnalytics } from './AnalyticsContext';

const MEMBER_COLOR = "#1e3a8a"; 
const WALKIN_COLOR = "#0f766e"; 
const MEMBER_REVENUE_COLOR = "#3b82f6"; 
const WALKIN_REVENUE_COLOR = "#14b8a6"; 

const MONTHLY_MEMBER_COLOR = "#60a5fa";
const SEMI_YEARLY_MEMBER_COLOR = "#3b82f6";
const YEARLY_MEMBER_COLOR = "#1e3a8a";

export const AnalyticsStatus: React.FC = () => {
  const { isLoading, error, data, minimalView } = useAnalytics();

  if (isLoading) {
    return (
      <section className={minimalView ? "mt-6" : "mt-6 rounded-2xl border border-flexNavy/15 bg-flexWhite/70 p-6"}>
        <p className="text-center text-sm text-flexNavy py-8">Loading analytics...</p>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className={minimalView ? "mt-6" : "mt-6 rounded-2xl border border-red-200 bg-red-50/80 p-6"}>
        <p className="text-center text-sm font-semibold text-red-700 py-2">Unable to load analytics data</p>
        <p className="text-center text-sm text-red-600/90">{error ?? "No analytics data is available."}</p>
      </section>
    );
  }

  return null;
};

export const AnalyticsHeader: React.FC = () => {
  const { showBackButton, minimalView, navigate } = useAnalytics();

  return (
    <div className={minimalView ? "border-y border-flexNavy/15 py-4" : "rounded-2xl border border-flexNavy/15 bg-flexWhite/70 p-6"}>
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        {showBackButton && (
          <button
            type="button"
            onClick={() => navigate("/admin/dashboard")}
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-flexBlue px-4 py-2 text-sm font-semibold text-white transition hover:bg-flexBlue/90"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
        )}
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-flexNavy font-semibold">Analytics & Trends</p>
          <p className="text-sm text-flexNavy/60 mt-0.5">Walk-In vs Member Performance Metrics</p>
        </div>
      </div>
    </div>
  );
};

export const AnalyticsStatGrid: React.FC = () => {
  const { data } = useAnalytics();
  if (!data) return null;

  const { aggregateStats } = data;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
      <StatCard label="Total Members" value={aggregateStats.totalMembers} subValue={`${aggregateStats.memberRatio.toFixed(1)}%`} />
      <StatCard label="Member Revenue" value={`₱${aggregateStats.totalMemberRevenue.toLocaleString()}`} subValue="Total" />
      <StatCard label="Total Walk-Ins" value={aggregateStats.totalWalkIns} subValue={`${aggregateStats.walkInRatio.toFixed(1)}%`} />
      <StatCard label="Walk-In Revenue" value={`₱${aggregateStats.totalWalkInRevenue.toLocaleString()}`} subValue="Total" />
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number; subValue: string }> = ({ label, value, subValue }) => (
  <div className="rounded-lg border border-flexNavy/10 bg-flexWhite p-4">
    <p className="text-xs uppercase tracking-wider text-flexNavy font-semibold">{label}</p>
    <p className="text-2xl font-bold text-flexBlack mt-2">{value}</p>
    <p className="text-xs text-flexNavy/60 mt-1">{subValue}</p>
  </div>
);

export const AnalyticsActivityChart: React.FC = () => {
  const { data, minimalView } = useAnalytics();
  if (!data) return null;

  return (
    <div className={minimalView ? "border-y border-flexNavy/15 py-4 mt-6" : "rounded-2xl border border-flexNavy/15 bg-flexWhite/70 p-6 mt-6"}>
      <ChartHeader title="Daily Activity Trends" subtitle="Number of members vs walk-ins per day" />
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data.dailyStats}>
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#334155" }} angle={-45} textAnchor="end" height={80} />
          <YAxis tick={{ fontSize: 12, fill: "#334155" }} />
          <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "0.5rem" }} />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
          <Line type="monotone" dataKey="members" stroke={MEMBER_COLOR} name="Members" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="walkIns" stroke={WALKIN_COLOR} name="Walk-Ins" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const AnalyticsRevenueChart: React.FC = () => {
  const { data, minimalView } = useAnalytics();
  if (!data) return null;

  return (
    <div className={minimalView ? "border-y border-flexNavy/15 py-4 mt-6" : "rounded-2xl border border-flexNavy/15 bg-flexWhite/70 p-6 mt-6"}>
      <ChartHeader title="Daily Revenue Trends" subtitle="Revenue comparison between members and walk-ins" />
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data.dailyStats}>
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#334155" }} angle={-45} textAnchor="end" height={80} />
          <YAxis tick={{ fontSize: 12, fill: "#334155" }} />
          <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "0.5rem" }} formatter={(value) => `₱${Number(value).toLocaleString()}`} />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
          <Bar dataKey="memberRevenue" fill={MEMBER_REVENUE_COLOR} name="Member Revenue" />
          <Bar dataKey="walkInRevenue" fill={WALKIN_REVENUE_COLOR} name="Walk-In Revenue" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const AnalyticsRatioAnalysis: React.FC = () => {
  const { data, minimalView } = useAnalytics();
  if (!data) return null;

  const pieData = [
    { name: "Monthly Members", value: data.aggregateStats.monthlyMembers, color: MONTHLY_MEMBER_COLOR },
    { name: "Semi-Yearly Members", value: data.aggregateStats.semiYearlyMembers, color: SEMI_YEARLY_MEMBER_COLOR },
    { name: "Yearly Members", value: data.aggregateStats.yearlyMembers, color: YEARLY_MEMBER_COLOR },
    { name: "Walk-Ins", value: data.aggregateStats.totalWalkIns, color: WALKIN_COLOR },
  ].filter(item => item.value > 0);

  const totalRevenue = data.aggregateStats.totalMemberRevenue + data.aggregateStats.totalWalkInRevenue;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <div className={minimalView ? "border-y border-flexNavy/15 py-4" : "rounded-2xl border border-flexNavy/15 bg-flexWhite/70 p-6"}>
        <ChartHeader title="Activity Ratio" subtitle="Proportion of members vs walk-ins" />
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
              {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
            </Pie>
            <Tooltip formatter={(value) => `${value} visits`} contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "0.5rem" }} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className={minimalView ? "border-y border-flexNavy/15 py-4" : "rounded-2xl border border-flexNavy/15 bg-flexWhite/70 p-6"}>
        <ChartHeader title="Revenue Distribution" subtitle="Total revenue breakdown" />
        <div className="space-y-4">
          <RevenueProgress label="Monthly Member Revenue" amount={data.aggregateStats.monthlyMemberRevenue} total={totalRevenue} color={MONTHLY_MEMBER_COLOR} barColor="bg-blue-400" />
          <RevenueProgress label="Semi-Yearly Member Revenue" amount={data.aggregateStats.semiYearlyMemberRevenue} total={totalRevenue} color={SEMI_YEARLY_MEMBER_COLOR} barColor="bg-blue-500" />
          <RevenueProgress label="Yearly Member Revenue" amount={data.aggregateStats.yearlyMemberRevenue} total={totalRevenue} color={YEARLY_MEMBER_COLOR} barColor="bg-flexBlue" />
          <RevenueProgress label="Walk-In Revenue" amount={data.aggregateStats.totalWalkInRevenue} total={totalRevenue} color={WALKIN_COLOR} barColor="bg-teal-600" />
          <div className="pt-4 border-t border-flexNavy/10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-flexBlack">Total Revenue</p>
              <p className="text-lg font-bold text-flexBlack">₱{totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChartHeader: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div className="mb-4">
    <p className="text-xs uppercase tracking-[0.18em] text-flexNavy font-semibold">{title}</p>
    <p className="text-sm text-flexNavy/60 mt-0.5">{subtitle}</p>
  </div>
);

const RevenueProgress: React.FC<{ label: string; amount: number; total: number; color: string; barColor: string }> = ({ label, amount, total, color, barColor }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
        <p className="text-sm font-semibold text-flexBlack">{label}</p>
      </div>
      <p className="text-sm font-bold text-flexBlack">₱{amount.toLocaleString()}</p>
    </div>
    <div className="w-full bg-flexNavy/10 rounded-full h-2">
      <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${(amount / total) * 100}%` }}></div>
    </div>
    <p className="text-xs text-flexNavy/60 mt-1">{((amount / total) * 100).toFixed(1)}%</p>
  </div>
);
