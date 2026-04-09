import { describe, it, expect } from "@jest/globals";
import {
  PAYMENT_TIER_OPTIONS,
  resolveTierSelection,
} from "../src/lib/paymentTierSelection";
import type { UserType } from "../src/types/payment";

describe("Payment modal tier selection", () => {
  it("includes walk-in in selectable tier options", () => {
    expect(PAYMENT_TIER_OPTIONS).toContain("walk-in");
  });

  it("selects walk-in correctly from another tier", () => {
    const current: UserType = "monthly";
    const next = resolveTierSelection(current, "walk-in");
    expect(next).toBe("walk-in");
  });

  it("keeps other tiers selectable", () => {
    expect(resolveTierSelection("walk-in", "monthly")).toBe("monthly");
    expect(resolveTierSelection("walk-in", "semi-yearly")).toBe("semi-yearly");
    expect(resolveTierSelection("walk-in", "yearly")).toBe("yearly");
  });

  it("handles rapid switching between tiers consistently", () => {
    const sequence = [
      "monthly",
      "walk-in",
      "yearly",
      "walk-in",
      "semi-yearly",
      "walk-in",
    ];

    let selected: UserType = "monthly";
    for (const candidate of sequence) {
      selected = resolveTierSelection(selected, candidate);
    }

    expect(selected).toBe("walk-in");
  });

  it("ignores invalid candidate tier and keeps current selection", () => {
    const current: UserType = "walk-in";
    const next = resolveTierSelection(current, "invalid-tier");
    expect(next).toBe("walk-in");
  });

  it("supports default state transitioning to walk-in", () => {
    const defaultTier: UserType = "monthly";
    const afterSelection = resolveTierSelection(defaultTier, "walk-in");
    expect(afterSelection).toBe("walk-in");
  });
});
