import { useEffect, useState } from "react";
import {
  fetchBackendCrowdPanelData,
  getBestTimeSuggestions,
  getCurrentCrowdStats,
  type BestTimeSuggestions,
  type CrowdStats,
} from "../lib/crowdService";

interface CrowdEstimationPanelProps {
  showAdminControls?: boolean;
  minimalView?: boolean;
}

function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatPhilippineTime(value: Date): string {
  return value.toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function CrowdEstimationPanel({
  showAdminControls = false,
  minimalView = false,
}: CrowdEstimationPanelProps) {
  const [stats, setStats] = useState<CrowdStats>(getCurrentCrowdStats());
  const [suggestions, setSuggestions] = useState<BestTimeSuggestions>(getBestTimeSuggestions());
  const [currentPhilippineTime, setCurrentPhilippineTime] = useState(new Date());

  const refreshData = async () => {
    const backendData = await fetchBackendCrowdPanelData({ days: 7 });

    setStats(backendData.stats);
    setSuggestions(
      backendData.suggestions.hourly_averages.length > 0
        ? backendData.suggestions
        : getBestTimeSuggestions()
    );
  };

  useEffect(() => {
    void refreshData();

    const refreshInterval = window.setInterval(() => {
      void refreshData();
    }, 30_000);
    const clockInterval = window.setInterval(() => {
      setCurrentPhilippineTime(new Date());
    }, 1_000);
    const handleStorage = () => {
      void refreshData();
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.clearInterval(refreshInterval);
      window.clearInterval(clockInterval);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const percentValue = formatPercentage(stats.crowdLevel);

  return (
    <section className={minimalView ? "mt-6" : "mt-6 rounded-2xl border border-flexNavy/15 bg-flexWhite/70 p-6 shadow-sm"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {!minimalView && (
            <p className="text-xs uppercase tracking-[0.18em] text-flexNavy font-semibold">
              Peak Hours Estimation
            </p>
          )}
        </div>
        <div className={minimalView ? "px-1 py-1 text-xs font-semibold text-flexNavy" : "rounded-full border border-flexNavy/10 bg-flexWhite px-3 py-1 text-xs font-semibold text-flexNavy"}>
          Time: {formatPhilippineTime(currentPhilippineTime)}
        </div>
      </div>

      <div className={minimalView ? "mt-5 grid grid-cols-2 gap-2 border-y border-flexNavy/15 py-3 sm:grid-cols-3" : "mt-5 grid gap-4 md:grid-cols-3"}>
        <article className={minimalView ? "min-w-0 rounded-lg border border-flexNavy/10 bg-white/80 p-2" : "rounded-xl border border-flexNavy/10 bg-flexWhite p-4"}>
          <div className={minimalView ? "mb-0.5 min-h-[20px]" : ""}>
            <p className={minimalView ? "text-[9px] uppercase tracking-[0.06em] text-flexNavy font-semibold leading-tight" : "text-xs uppercase tracking-[0.16em] text-flexNavy font-semibold"}>
              Active Now
            </p>
          </div>
          <p className={minimalView ? "mt-1 text-base font-bold text-flexBlack" : "mt-2 text-3xl font-bold text-flexBlack"}>
            {stats.activeUsers}
          </p>
        </article>

        <article className={minimalView ? "min-w-0 rounded-lg border border-flexNavy/10 bg-white/80 p-2" : "rounded-xl border border-flexNavy/10 bg-flexWhite p-4"}>
          <div className={minimalView ? "mb-0.5 min-h-[20px]" : ""}>
            <p className={minimalView ? "text-[9px] uppercase tracking-[0.06em] text-flexNavy font-semibold leading-tight" : "text-xs uppercase tracking-[0.16em] text-flexNavy font-semibold"}>
              Crowd Level
            </p>
          </div>
          <p className={minimalView ? "mt-1 text-base font-bold text-flexBlack" : "mt-2 text-3xl font-bold text-flexBlack"}>
            {percentValue}
          </p>
        </article>

        <article className={minimalView ? "min-w-0 rounded-lg border border-flexNavy/10 bg-white/80 p-2" : "rounded-xl border border-flexNavy/10 bg-flexWhite p-4"}>
          <div className={minimalView ? "mb-0.5 min-h-[20px]" : ""}>
            <p className={minimalView ? "text-[9px] uppercase tracking-[0.06em] text-flexNavy font-semibold leading-tight" : "text-xs uppercase tracking-[0.16em] text-flexNavy font-semibold"}>
              Status
            </p>
          </div>
          <p className={minimalView ? "mt-1 text-[13px] font-bold capitalize text-flexBlack leading-tight" : "mt-2 text-3xl font-bold capitalize text-flexBlack"}>{stats.crowdStatus}</p>
        </article>
      </div>

      {!showAdminControls && (
      <div className="mt-6 rounded-2xl border border-flexNavy/15 bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-flexNavy font-semibold">
              Smart Insights
            </p>
            <p className="mt-1 text-sm text-flexNavy/60">
              On the past {suggestions.daysAnalyzed} days.
            </p>
          </div>
        </div>

        {suggestions.message && (
          <div className="mb-4 rounded-lg border border-flexNavy/10 bg-flexNavy/5 px-3 py-2 text-sm text-flexNavy">
            {suggestions.message}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs uppercase tracking-[0.16em] font-semibold text-emerald-800">
              Best Time to Go
            </p>
            <div className="mt-3 space-y-2">
              {suggestions.best_time_ranges.length > 0 ? (
                suggestions.best_time_ranges.map((range) => (
                  <div key={`best-${range.label}`} className="rounded-lg bg-white/70 px-3 py-2">
                    <p className="text-sm font-semibold text-emerald-900">{range.label}</p>
                    <p className="text-xs text-emerald-700">
                      {Math.round(range.avgCrowd * 100)}% crowd ({range.status})
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-emerald-800">Not enough data yet</p>
              )}
            </div>
          </article>

          <article className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-xs uppercase tracking-[0.16em] font-semibold text-red-800">
              Usually Busy
            </p>
            <div className="mt-3 space-y-2">
              {suggestions.worst_time_ranges.length > 0 ? (
                suggestions.worst_time_ranges.map((range) => (
                  <div key={`worst-${range.label}`} className="rounded-lg bg-white/70 px-3 py-2">
                    <p className="text-sm font-semibold text-red-900">{range.label}</p>
                    <p className="text-xs text-red-700">
                      {Math.round(range.avgCrowd * 100)}% crowd ({range.status})
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-red-800">Not enough data yet</p>
              )}
            </div>
          </article>
        </div>
      </div>
      )}
    </section>
  );
}
