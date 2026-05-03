/**
 * StreakCircle Component - Visual representation of daily login streak
 * 
 * Displays 7-day history of check-ins with interactive circles:
 * - Inactive (no check-in): white circle with light grey border
 * - 1-day active: solid blue fill (#0066CC)
 * - Multi-day streak (>1): blue fill with glowing effect
 * - Active circles show a white "X" mark that scales beyond circle boundary
 */

import React from "react";
import { X } from "lucide-react";

interface StreakCircleProps {
  /** Current streak count */
  streak: number;
  /** Array of 7 booleans representing last 7 days (oldest to newest) */
  last7Days: boolean[];
  /** Loading state */
  loading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Optional callback when component mounts or data changes */
  onStatusChange?: (streak: number, last7Days: boolean[]) => void;
}

/**
 * Individual circle for a single day
 */
function DayCircle({
  isActive,
  dayOffset,
  streak,
}: {
  isActive: boolean;
  dayOffset: number;
  streak: number;
}) {
  // Calculate day label
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - (6 - dayOffset));
  const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" });

  function buildGlowStyle(streakCount: number) {
    if (streakCount <= 1) {
      return undefined;
    }

    const normalizedStreak = Math.min(Math.max(streakCount - 1, 1), 6);
    const glowOpacity = 0.28 + normalizedStreak * 0.08;
    const glowBlur = 10 + normalizedStreak * 4;
    const glowSpread = 1 + normalizedStreak;

    return {
      boxShadow: `0 0 ${glowBlur}px ${glowSpread}px rgba(51, 153, 255, ${glowOpacity}), 0 0 ${Math.max(14, glowBlur - 2)}px rgba(0, 102, 204, ${Math.min(glowOpacity + 0.12, 0.95)})`,
    };
  }

  // Determine circle styling based on active state and streak
  const isMultiDayStreak = streak > 1 && isActive;
  const baseClasses =
    "relative h-12 w-12 overflow-visible rounded-full border-2 flex items-center justify-center transition-all duration-200";
  const inactiveClasses = "bg-white border-gray-300";
  const activeClasses = isMultiDayStreak
    ? "bg-[#0066CC] border-[#0066CC]"
    : "bg-[#0066CC] border-[#0066CC]";

  const circleClasses = `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;
  const circleStyle = isMultiDayStreak ? buildGlowStyle(streak) : undefined;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={circleClasses}
        style={circleStyle}
        title={`${dayLabel}: ${isActive ? "Checked in" : "No check-in"}`}
        role="img"
        aria-label={`${dayLabel}: ${isActive ? "checked in" : "no check-in"}`}
      >
        {isActive && (
          <X
            className="absolute text-white scale-150 pointer-events-none"
            strokeWidth={3}
            size={16}
          />
        )}
      </div>
      <span className="text-xs font-medium text-gray-600">{dayLabel}</span>
    </div>
  );
}

/**
 * StreakCircle - Main component showing 7-day streak visualization
 */
export function StreakCircle({
  streak,
  last7Days,
  loading = false,
  error = null,
  onStatusChange,
}: StreakCircleProps) {
  // Notify parent component of status changes
  React.useEffect(() => {
    if (onStatusChange && !loading && !error) {
      onStatusChange(streak, last7Days);
    }
  }, [streak, last7Days, loading, error, onStatusChange]);

  // Error state
  if (error) {
    return (
      <div
        className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
        role="alert"
      >
        <p className="font-medium">Failed to load streak data</p>
        <p className="text-xs mt-1">{error}</p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex gap-2 justify-center">
        {Array(7)
          .fill(null)
          .map((_, i) => (
            <div
              key={i}
              className="h-12 w-12 rounded-full bg-gray-200 animate-pulse"
            />
          ))}
      </div>
    );
  }

  // Ensure last7Days has exactly 7 elements
  const safeLast7Days = Array.isArray(last7Days)
    ? last7Days.slice(0, 7).concat(Array(7).fill(false)).slice(0, 7)
    : Array(7).fill(false);

  return (
    <div className="flex flex-col gap-4">
      {/* Streak counter header */}
      <div className="text-center">
        <div className="text-3xl font-bold text-[#0066CC]">{streak}</div>
        <p className="text-sm text-gray-600">
          {streak === 0
            ? "Start your streak today"
            : streak === 1
              ? "1 day streak"
              : `${streak} day streak`}
        </p>
      </div>

      {/* 7-day circle visualization */}
      <div className="flex gap-3 justify-center flex-wrap">
        {safeLast7Days.map((isActive, dayIndex) => (
          <DayCircle
            key={dayIndex}
            isActive={isActive}
            dayOffset={dayIndex}
            streak={streak}
          />
        ))}
      </div>

      {/* Streak info */}
      <div className="text-xs text-gray-500 text-center">
        <p>
          {streak > 0
            ? "Keep up your daily visits to maintain your streak!"
            : "Visit the gym to start building your streak"}
        </p>
      </div>
    </div>
  );
}

