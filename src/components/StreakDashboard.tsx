/**
 * StreakDashboard.tsx - Example integration of StreakCircle component
 * 
 * This is a reference implementation showing how to use the StreakCircle component
 * with the useStreak hook in your application.
 */

import React from "react";
import { useStreak } from "../hooks/useStreak";
import { StreakCircle } from "./StreakCircle";

interface StreakDashboardProps {
  /** Optional callback when streak data is loaded */
  onStreakLoaded?: (streak: number, last7Days: boolean[]) => void;
}

/**
 * StreakDashboard - Container component for streak visualization
 * 
 * Usage:
 * ```tsx
 * <StreakDashboard onStreakLoaded={(streak) => console.log('Streak:', streak)} />
 * ```
 */
export function StreakDashboard({ onStreakLoaded }: StreakDashboardProps) {
  const { streak, loading, error, refetch } = useStreak();

  // Notify parent when streak data is loaded
  React.useEffect(() => {
    if (!loading && !error && streak && onStreakLoaded) {
      onStreakLoaded(streak.streak, streak.last7Days);
    }
  }, [streak, loading, error, onStreakLoaded]);

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Daily Streak
        </h2>
        <p className="text-sm text-gray-600">
          Check in every day to build your streak and unlock achievements
        </p>
      </div>

      {/* StreakCircle component */}
      {streak && (
        <StreakCircle
          streak={streak.streak}
          last7Days={streak.last7Days}
          loading={loading}
          error={error}
        />
      )}

      {/* Refresh button */}
      <div className="mt-6">
        <button
          onClick={refetch}
          disabled={loading}
          className="w-full px-4 py-2 bg-[#0066CC] text-white rounded-lg font-medium hover:bg-[#0052A3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Loading..." : "Refresh Streak"}
        </button>
      </div>

      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === "development" && streak && (
        <div className="mt-6 p-3 bg-gray-100 rounded text-xs text-gray-700">
          <p className="font-mono">
            Streak: {streak.streak} | Days: {JSON.stringify(streak.last7Days)}
          </p>
          {streak.totalCheckIns !== undefined && (
            <p className="font-mono">Total Check-ins: {streak.totalCheckIns}</p>
          )}
        </div>
      )}
    </div>
  );
}
