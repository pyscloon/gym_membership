type GoalProgressBarProps = {
  currentSessions: number;
  weeklyGoal: number;
  isLoading?: boolean;
};

export default function GoalProgressBar({
  currentSessions,
  weeklyGoal,
  isLoading = false,
}: GoalProgressBarProps) {
  const safeGoal = Math.max(1, Math.floor(weeklyGoal || 0));
  const safeCurrent = Math.max(0, Math.floor(currentSessions || 0));
  const progressPercent = Math.min(100, (safeCurrent / safeGoal) * 100);
  const daysLeft = Math.max(0, safeGoal - safeCurrent);
  const isComplete = safeCurrent >= safeGoal;
  const showLabel = !isLoading && !isComplete && daysLeft > 0;
  const label = daysLeft === 1 ? "1 day left" : `${daysLeft} days left`;

  return (
    <div className="relative h-2.5 w-full rounded-full bg-white p-0.5 shadow-inner ring-1 ring-black/5">
      {showLabel && (
        <span className="pointer-events-none absolute inset-0.5 z-10 flex items-center justify-center text-[9px] font-black uppercase tracking-[0.16em] text-white mix-blend-difference">
          {label}
        </span>
      )}
      <div
        className={`h-full rounded-full transition-all duration-1000 ${
          isComplete
            ? "bg-gradient-to-r from-[#16a34a] to-[#22c55e]"
            : "bg-gradient-to-r from-[#0099FF] to-[#0066CC]"
        }`}
        style={{ width: `${progressPercent}%` }}
      />
    </div>
  );
}
