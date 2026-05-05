export const WEEKLY_GYM_PLAN_STORAGE_KEY = "flex_republic_weekly_gym_plan";

export const WEEKLY_PLAN_DAYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

export type WeeklyPlanDay = (typeof WEEKLY_PLAN_DAYS)[number];

export type WeeklyGymPlan = Record<WeeklyPlanDay, boolean>;

type StorageLike = Pick<Storage, "getItem" | "setItem"> | null | undefined;

export function createEmptyWeeklyPlan(): WeeklyGymPlan {
  return {
    mon: false,
    tue: false,
    wed: false,
    thu: false,
    fri: false,
    sat: false,
    sun: false,
  };
}

function isWeeklyPlanDay(value: string): value is WeeklyPlanDay {
  return WEEKLY_PLAN_DAYS.includes(value as WeeklyPlanDay);
}

function normalizeWeeklyPlan(value: unknown): WeeklyGymPlan {
  const emptyPlan = createEmptyWeeklyPlan();
  if (!value || typeof value !== "object") return emptyPlan;

  const nextPlan = { ...emptyPlan };
  for (const [day, selected] of Object.entries(value)) {
    if (isWeeklyPlanDay(day) && typeof selected === "boolean") {
      nextPlan[day] = selected;
    }
  }

  return nextPlan;
}

export function readWeeklyPlan(storage: StorageLike): WeeklyGymPlan {
  if (!storage) return createEmptyWeeklyPlan();

  try {
    const rawPlan = storage.getItem(WEEKLY_GYM_PLAN_STORAGE_KEY);
    if (!rawPlan) return createEmptyWeeklyPlan();
    return normalizeWeeklyPlan(JSON.parse(rawPlan));
  } catch {
    return createEmptyWeeklyPlan();
  }
}

export function writeWeeklyPlan(storage: StorageLike, plan: WeeklyGymPlan) {
  if (!storage) return;
  storage.setItem(WEEKLY_GYM_PLAN_STORAGE_KEY, JSON.stringify(plan));
}

export function toggleWeeklyPlanDay(
  plan: WeeklyGymPlan,
  day: WeeklyPlanDay,
): WeeklyGymPlan {
  return {
    ...plan,
    [day]: !plan[day],
  };
}

export function countSelectedDays(plan: WeeklyGymPlan) {
  return WEEKLY_PLAN_DAYS.reduce((count, day) => count + (plan[day] ? 1 : 0), 0);
}
