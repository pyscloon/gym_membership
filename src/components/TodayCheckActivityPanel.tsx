import { useCallback, useEffect, useState } from "react";
import { getTodayCheckActivities, type TodayActivityRecord } from "../lib/checkInService";

type TodayCheckActivityPanelProps = {
  refreshKey?: number;
};

export default function TodayCheckActivityPanel({
  refreshKey = 0,
}: TodayCheckActivityPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [activities, setActivities] = useState<TodayActivityRecord[]>([]);

  const loadActivities = useCallback(async () => {
    setIsLoading(true);
    try {
      const rows = await getTodayCheckActivities();
      setActivities(rows);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities, refreshKey]);

  const formatActivityTime = (value: string) =>
    new Date(value).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

  const formatMembershipType = (value: string) =>
    value
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  const formatActionLabel = (value: TodayActivityRecord["actionType"]) => {
    if (value === "checkout") return "Check-Out";
    if (value === "walk_in") return "Walk-In";
    return "Check-In";
  };

  return (
    <section className="mt-4 rounded-2xl border border-[#0066CC]/10 bg-white/85 p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-[#003B8F]">Today's Check Activity</p>
          <p className="mt-1 text-xs text-gray-500">
            Resets daily. Shows check-in and check-out activity for today only.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadActivities()}
          className="rounded-lg border border-[#0066CC]/20 bg-white px-4 py-2 text-sm font-semibold text-[#003B8F] transition hover:border-[#0066CC] hover:bg-[#EAF4FF]"
        >
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-dashed border-[#0066CC]/15 bg-[#F8FBFF] px-4 py-8 text-center text-sm text-gray-500">
          Loading today's activity...
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#0066CC]/15 bg-[#F8FBFF] px-4 py-8 text-center text-sm text-gray-500">
          No check activity yet today.
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-0">
          <div className="hidden grid-cols-[1.4fr_1fr_0.9fr_0.8fr] gap-3 rounded-t-xl bg-[#003B8F] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white sm:grid">
            <span>Name</span>
            <span>Membership</span>
            <span>Action</span>
            <span>Time</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#0066CC]/10 bg-white sm:rounded-t-none">
            {activities.map((activity, index) => (
              <div
                key={activity.id}
                className={`grid gap-3 px-4 py-4 text-sm text-[#000033] sm:grid-cols-[1.4fr_1fr_0.9fr_0.8fr] sm:items-center ${
                  index !== activities.length - 1 ? "border-b border-[#0066CC]/10" : ""
                }`}
              >
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 sm:hidden">Name</p>
                  <p className="font-semibold">{activity.name}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 sm:hidden">Membership</p>
                  <p>{formatMembershipType(activity.membershipType)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 sm:hidden">Action</p>
                  <p
                    className={`font-semibold ${
                      activity.actionType === "checkin"
                        ? "text-blue-700"
                        : activity.actionType === "checkout"
                          ? "text-orange-700"
                          : "text-purple-700"
                    }`}
                  >
                    {formatActionLabel(activity.actionType)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 sm:hidden">Time</p>
                  <p>{formatActivityTime(activity.time)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
