import type { UserType } from "../types/payment";

export const PAYMENT_TIER_OPTIONS: readonly UserType[] = [
  "monthly",
  "semi-yearly",
  "yearly",
  "walk-in",
] as const;

export function resolveTierSelection(
  currentTier: UserType,
  candidateTier: string
): UserType {
  return PAYMENT_TIER_OPTIONS.includes(candidateTier as UserType)
    ? (candidateTier as UserType)
    : currentTier;
}
