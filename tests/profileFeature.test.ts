import { describe, expect, it } from "@jest/globals";
import {
  calculateMembershipStatus,
  getFullName,
  type ProfileFormState,
  validateProfileForm,
} from "../src/lib/profileUtils";

describe("Profile feature integration tests", () => {
  it("accepts a valid profile update flow", () => {
    const form: ProfileFormState = {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@email.com",
      phone: "+1234567890",
      membershipStart: "2026-01-01",
      membershipEnd: "2026-12-31",
    };

    const validationErrors = validateProfileForm(form);
    const status = calculateMembershipStatus(form.membershipEnd, new Date("2026-06-01"));

    expect(validationErrors).toEqual({});
    expect(getFullName(form.firstName, form.lastName)).toBe("John Doe");
    expect(status.isActive).toBe(true);
    expect(status.daysRemaining).toBeGreaterThan(0);
  });

  it("blocks save flow for invalid profile inputs", () => {
    const form: ProfileFormState = {
      firstName: "",
      lastName: "",
      email: "john.doeemail.com",
      phone: "not-a-phone",
      membershipStart: "2026-12-31",
      membershipEnd: "2026-01-01",
    };

    const validationErrors = validateProfileForm(form);

    expect(Object.keys(validationErrors).length).toBeGreaterThan(0);
    expect(validationErrors.firstName).toBe("First name is required.");
    expect(validationErrors.lastName).toBe("Last name is required.");
    expect(validationErrors.email).toBe("Enter a valid email address.");
    expect(validationErrors.phone).toBe("Enter a valid phone number.");
    expect(validationErrors.membershipEnd).toBe("End date must be later than start date.");
  });
});
