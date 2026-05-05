import { describe, expect, it } from "@jest/globals";
import {
  countSelectedDays,
  createEmptyWeeklyPlan,
  readWeeklyPlan,
  toggleWeeklyPlanDay,
  writeWeeklyPlan,
  type WeeklyPlanDay,
} from "../../src/lib/weeklyGymPlan";

class LocalStorageMock {
  private store = new Map<string, string>();

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

describe("weekly gym plan", () => {
  const storage = new LocalStorageMock();
  const monday: WeeklyPlanDay = "mon";
  const friday: WeeklyPlanDay = "fri";

  it("starts with no selected days when storage is empty", () => {
    expect(readWeeklyPlan(storage)).toEqual(createEmptyWeeklyPlan());
    expect(countSelectedDays(readWeeklyPlan(storage))).toBe(0);
  });

  it("toggles a day on and off", () => {
    const withMonday = toggleWeeklyPlanDay(createEmptyWeeklyPlan(), monday);
    expect(withMonday[monday]).toBe(true);
    expect(countSelectedDays(withMonday)).toBe(1);

    const withoutMonday = toggleWeeklyPlanDay(withMonday, monday);
    expect(withoutMonday[monday]).toBe(false);
    expect(countSelectedDays(withoutMonday)).toBe(0);
  });

  it("writes selected days and reads them back later", () => {
    const plan = toggleWeeklyPlanDay(
      toggleWeeklyPlanDay(createEmptyWeeklyPlan(), monday),
      friday,
    );

    writeWeeklyPlan(storage, plan);

    const savedPlan = readWeeklyPlan(storage);
    expect(savedPlan[monday]).toBe(true);
    expect(savedPlan[friday]).toBe(true);
    expect(countSelectedDays(savedPlan)).toBe(2);
  });

  it("falls back to empty plan when stored data is broken", () => {
    storage.setItem("flex_republic_weekly_gym_plan", "{bad json");

    expect(readWeeklyPlan(storage)).toEqual(createEmptyWeeklyPlan());
  });
});
