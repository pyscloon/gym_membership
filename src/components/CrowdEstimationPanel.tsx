import { useEffect, useState } from "react";
import {
  captureCrowdSnapshot,
  getBestTimeSuggestions,
  getCrowdStatusColor,
  getCurrentCrowdStats,
  updateTotalEquipmentCount,
  type BestTimeSuggestions,
  type CrowdStats,
} from "../lib/crowdService";

interface CrowdEstimationPanelProps {
  showAdminControls?: boolean;
}

function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export default function CrowdEstimationPanel({
  showAdminControls = false,
}: CrowdEstimationPanelProps) {
  const [stats, setStats] = useState<CrowdStats>(getCurrentCrowdStats());
  const [suggestions, setSuggestions] = useState<BestTimeSuggestions>(
    getBestTimeSuggestions({ days: 7, topCount: 3 })
  );
  const [equipmentInput, setEquipmentInput] = useState(String(stats.totalEquipment));
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingEquipment, setIsEditingEquipment] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const refreshData = () => {
    captureCrowdSnapshot();
    const nextStats = getCurrentCrowdStats();
    const nextSuggestions = getBestTimeSuggestions({ days: 7, topCount: 3 });

    setStats(nextStats);
    setSuggestions(nextSuggestions);
    setEquipmentInput(String(nextStats.totalEquipment));
    setLastUpdated(new Date());
  };

  useEffect(() => {
    refreshData();

    const interval = window.setInterval(refreshData, 30_000);
    const handleStorage = () => refreshData();

    window.addEventListener("storage", handleStorage);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const handleSaveEquipment = async () => {
    const nextValue = Number.parseInt(equipmentInput, 10);

    if (!Number.isFinite(nextValue) || nextValue <= 0) {
      setMessage("Enter a valid equipment count greater than zero.");
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      updateTotalEquipmentCount(nextValue);
      refreshData();
      setMessage("Equipment count updated.");
      setIsEditingEquipment(false);
    } catch (error) {
      console.error("Failed to update equipment count:", error);
      setMessage("Unable to update equipment count right now.");
    } finally {
      setIsSaving(false);
    }
  };

  const percentValue = formatPercentage(stats.crowdLevel);

  const handleEditEquipment = () => {
    setEquipmentInput(String(stats.totalEquipment));
    setMessage(null);
    setIsEditingEquipment(true);
  };

  const handleCancelEditEquipment = () => {
    setEquipmentInput(String(stats.totalEquipment));
    setMessage(null);
    setIsEditingEquipment(false);
  };

  return (
    <section className="mt-6 rounded-2xl border border-flexNavy/15 bg-flexWhite/70 p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-flexNavy font-semibold">
            Peak Hours Estimation
          </p>
        </div>
        <div className="rounded-full border border-flexNavy/10 bg-flexWhite px-3 py-1 text-xs font-semibold text-flexNavy">
          Updated {lastUpdated.toLocaleTimeString()}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <article className="rounded-xl border border-flexNavy/10 bg-flexWhite p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-flexNavy font-semibold">
            Active Now
          </p>
          <p className="mt-2 text-3xl font-bold text-flexBlack">
            {stats.activeUsers}
          </p>
        </article>

        <article className="rounded-xl border border-flexNavy/10 bg-flexWhite p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.16em] text-flexNavy font-semibold">
              Total Equipment
            </p>
            {showAdminControls && (
              <button
                type="button"
                onClick={isEditingEquipment ? handleCancelEditEquipment : handleEditEquipment}
                disabled={isSaving}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-flexNavy/20 bg-white text-flexNavy transition hover:bg-flexNavy/5 disabled:cursor-not-allowed disabled:opacity-70"
                aria-label={isEditingEquipment ? "Cancel edit equipment count" : "Edit equipment count"}
                title={isEditingEquipment ? "Cancel" : "Edit equipment count"}
              >
                {isEditingEquipment ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 0 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 1 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <path d="M13.5 6.75 17.25 3a2.121 2.121 0 1 1 3 3l-12 12a2.25 2.25 0 0 1-.954.56l-3.35.838a.75.75 0 0 1-.91-.91l.838-3.35a2.25 2.25 0 0 1 .56-.954l12-12Z" />
                    <path d="M10.5 9.75 14.25 13.5" />
                  </svg>
                )}
              </button>
            )}
          </div>

          {!showAdminControls || !isEditingEquipment ? (
            <p className="mt-2 text-3xl font-bold text-flexBlack">
              {stats.totalEquipment}
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              <input
                type="number"
                min={1}
                step={1}
                value={equipmentInput}
                onChange={(event) => setEquipmentInput(event.target.value)}
                className="w-full rounded-lg border border-flexNavy/20 bg-white px-3 py-2 text-flexBlack outline-none transition focus:border-flexBlue focus:ring-2 focus:ring-flexBlue/20"
              />
              <button
                type="button"
                onClick={handleSaveEquipment}
                disabled={isSaving}
                className="rounded-lg bg-flexBlue px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-flexNavy disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          )}

          {showAdminControls && message && (
            <p className="mt-2 text-xs text-flexNavy/70">{message}</p>
          )}
        </article>

        <article className="rounded-xl border border-flexNavy/10 bg-flexWhite p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-flexNavy font-semibold">
            Crowd Level
          </p>
          <p className="mt-2 text-3xl font-bold text-flexBlack">
            {percentValue}
          </p>
        </article>

        <article className="rounded-xl border border-flexNavy/10 bg-flexWhite p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-flexNavy font-semibold">
            Status
          </p>
          <div className="mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ring-1">
            <span className={`rounded-full px-3 py-1 ring-1 ${getCrowdStatusColor(stats.crowdStatus)}`}>
              {stats.crowdStatus}
            </span>
          </div>
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