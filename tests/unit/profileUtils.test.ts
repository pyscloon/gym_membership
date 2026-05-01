import { describe, expect, it } from "@jest/globals";
import {
  calculateMembershipStatus,
  formatDate,
  getFullName,
  getInitials,
  splitFullName,
  validateProfileForm,
} from "../../src/lib/profileUtils";

describe("profileUtils unit tests", () => {
  it("returns initials for multi-word names", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("builds and splits full names", () => {
    expect(getFullName("John", "Doe")).toBe("John Doe");
    expect(splitFullName("John Doe")).toEqual({ firstName: "John", lastName: "Doe" });
  });

  it("returns fallback initial when name is empty", () => {
    expect(getInitials("")).toBe("?");
  });

  it("formats date as month/day/year", () => {
    expect(formatDate("2026-01-15")).toBe("1/15/2026");
  });

  it("returns fallback when date is invalid", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });

  it("calculates active membership and days remaining", () => {
    const status = calculateMembershipStatus("2026-01-20", new Date("2026-01-15"));
    expect(status.isActive).toBe(true);
    expect(status.daysRemaining).toBe(5);
  });

  it("returns inactive membership when end date is missing", () => {
    const status = calculateMembershipStatus("");
    expect(status.isActive).toBe(false);
    expect(status.daysRemaining).toBe(0);
  });

  it("validates required fields and date order", () => {
    const errors = validateProfileForm({
      firstName: "",
      lastName: "",
      email: "bad-email",
      phone: "abc",
      membershipStart: "2026-01-20",
      membershipEnd: "2026-01-10",
    });

    expect(errors.firstName).toBeDefined();
    expect(errors.lastName).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.phone).toBeDefined();
    expect(errors.membershipEnd).toBe("End date must be later than start date.");
  });
});
