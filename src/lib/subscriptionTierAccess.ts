import type { Membership } from "../types/membership";

const BLOCKED_SUBSCRIPTION_TIER_STATUSES = new Set<Membership["status"]>([
  "active",
  "pending",
  "frozen",
  "freeze-requested",
  "freeze_pending",
  "unfreeze-requested",
]);

export function canBuyMembershipFromSubscriptionTier(membership: Membership | null): boolean {
  if (!membership) return true;
  return !BLOCKED_SUBSCRIPTION_TIER_STATUSES.has(membership.status);
}
