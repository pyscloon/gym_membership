import { useEffect, useState } from "react";
import {
  fetchBackendCrowdPanelData,
  getBestTimeSuggestions,
  getCurrentCrowdStats,
  updateBackendTotalEquipmentCount,
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

export default function CrowdEstimationPanel({
  showAdminControls = false,
  minimalView = false,
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

  const refreshData = async () => {
    const backendData = await fetchBackendCrowdPanelData({ days: 7 });

    setStats(backendData.stats);
    setSuggestions(
      backendData.suggestions.hourly_averages.length > 0
        ? backendData.suggestions
        : getBestTimeSuggestions({ days: 7, topCount: 3 })
    );
    setEquipmentInput(String(backendData.stats.totalEquipment));
    setLastUpdated(new Date(backendData.lastUpdated));
  };

  useEffect(() => {
    void refreshData();

    const interval = window.setInterval(() => {
      void refreshData();
    }, 30_000);
    const handleStorage = () => {
      void refreshData();
    };

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
      await updateBackendTotalEquipmentCount(nextValue);
      await refreshData();
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
          Updated {lastUpdated.toLocaleTimeString()}
        </div>
      </div>

      <div className={minimalView ? "mt-5 grid grid-cols-2 gap-2 border-y border-flexNavy/15 py-3 sm:grid-cols-4" : "mt-5 grid gap-4 md:grid-cols-4"}>
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
          <div className={minimalView ? "flex min-h-[20px] items-start justify-between gap-1" : "flex items-center justify-between gap-2"}>
            <p className={minimalView ? "text-[9px] uppercase tracking-[0.06em] text-flexNavy font-semibold leading-tight" : "text-xs uppercase tracking-[0.16em] text-flexNavy font-semibold"}>
              Total Equipment
            </p>
            {showAdminControls && (
              <button
                type="button"
                onClick={isEditingEquipment ? handleCancelEditEquipment : handleEditEquipment}
                disabled={isSaving}
                className={minimalView
                  ? "inline-flex h-5 w-5 items-center justify-center rounded border border-flexNavy/20 bg-white text-flexNavy transition hover:bg-flexNavy/5 disabled:cursor-not-allowed disabled:opacity-70"
                  : "inline-flex items-center justify-center rounded-md border border-flexNavy/20 bg-white px-2.5 py-1 text-xs font-semibold text-flexNavy transition hover:bg-flexNavy/5 disabled:cursor-not-allowed disabled:opacity-70"}
                aria-label={isEditingEquipment ? "Cancel edit equipment count" : "Edit equipment count"}
                title={isEditingEquipment ? "Cancel" : "Edit equipment count"}
              >
                {minimalView ? (
                  isEditingEquipment ? (
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M17.414 2.586a2 2 0 010 2.828l-9.9 9.9a1 1 0 01-.42.25l-3.5 1a1 1 0 01-1.237-1.237l1-3.5a1 1 0 01.25-.42l9.9-9.9a2 2 0 012.828 0zm-2.121 2.121L5.94 14.06l-.47 1.645 1.645-.47 9.353-9.353-1.175-1.175z" />
                    </svg>
                  )
                ) : isEditingEquipment ? "Cancel" : "Edit"}
              </button>
            )}
          </div>

          {!showAdminControls || !isEditingEquipment ? (
            <p className={minimalView ? "mt-1 text-base font-bold text-flexBlack" : "mt-2 text-3xl font-bold text-flexBlack"}>
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