export type ProfileFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  membershipStart: string;
  membershipEnd: string;
};

export type ProfileValidationErrors = Partial<Record<keyof ProfileFormState, string>>;

export type MembershipStatus = {
  isActive: boolean;
  daysRemaining: number;
};

export function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";

  return trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getFullName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim();
}

export function splitFullName(fullName: string): Pick<ProfileFormState, "firstName" | "lastName"> {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "—";

  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

export function calculateMembershipStatus(
  membershipEnd: string,
  now = new Date(),
): MembershipStatus {
  if (!membershipEnd) {
    return { isActive: false, daysRemaining: 0 };
  }

  const endDate = new Date(membershipEnd);
  if (Number.isNaN(endDate.getTime())) {
    return { isActive: false, daysRemaining: 0 };
  }

  const diff = endDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));

  return {
    isActive: endDate >= now,
    daysRemaining,
  };
}

function isEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isPhoneValid(phone: string): boolean {
  const trimmed = phone.trim();
  if (!trimmed) return true;
  return /^[+()\d\s-]{7,}$/.test(trimmed);
}

export function validateProfileForm(form: ProfileFormState): ProfileValidationErrors {
  const errors: ProfileValidationErrors = {};

  if (!form.firstName.trim()) {
    errors.firstName = "First name is required.";
  }

  if (!form.lastName.trim()) {
    errors.lastName = "Last name is required.";
  }

  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!isEmailValid(form.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!isPhoneValid(form.phone)) {
    errors.phone = "Enter a valid phone number.";
  }

  if (form.membershipStart && Number.isNaN(new Date(form.membershipStart).getTime())) {
    errors.membershipStart = "Start date is invalid.";
  }

  if (form.membershipEnd && Number.isNaN(new Date(form.membershipEnd).getTime())) {
    errors.membershipEnd = "End date is invalid.";
  }

  if (form.membershipStart && form.membershipEnd) {
    const start = new Date(form.membershipStart);
    const end = new Date(form.membershipEnd);
    if (start > end) {
      errors.membershipEnd = "End date must be later than start date.";
    }
  }

  return errors;
}
