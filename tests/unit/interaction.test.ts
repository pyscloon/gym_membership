import { describe, expect, it } from "@jest/globals";
import { shouldProcessInteraction } from "../../src/lib/interaction";

describe("shouldProcessInteraction", () => {
  it("allows the first interaction when enough time passed", () => {
    expect(shouldProcessInteraction(0, 250, 120)).toBe(true);
  });

  it("blocks rapid repeated interactions under threshold", () => {
    expect(shouldProcessInteraction(1000, 1080, 120)).toBe(false);
  });

  it("allows interaction when threshold is reached", () => {
    expect(shouldProcessInteraction(1000, 1120, 120)).toBe(true);
  });
});
