import { describe, expect, it } from "@jest/globals";
import { appFeatures, branchLocations, testimonials, whyChooseFeatures } from "../../src/lib/landingContent";

describe("landingContent", () => {
  it("keeps four testimonial cards for the testimonials masonry section", () => {
    expect(testimonials).toHaveLength(4);
    expect(new Set(testimonials.map((item) => item.name)).size).toBe(4);
  });

  it("exposes exactly three mobile app features in the requested order", () => {
    expect(appFeatures.map((item) => item.title)).toEqual([
      "Login / Register",
      "Dashboard",
      "Check-in / Check-out",
    ]);
  });

  it("preserves existing signature location copy", () => {
    expect(branchLocations).toHaveLength(2);
    expect(branchLocations[0]?.name).toBe("Jaro Plaza Branch");
    expect(branchLocations[1]?.name).toBe("B-Complex Branch ");
  });

  it("retains why choose feature blocks", () => {
    expect(whyChooseFeatures).toHaveLength(4);
    expect(whyChooseFeatures[0]?.title).toBe("Live Capacity");
    expect(whyChooseFeatures[3]?.title).toBe("Seamless Check-In");
  });
});
