/**
 * Membership Types - Comprehensive type definitions for the gym membership system
 */

export type MembershipStatus = "active" | "pending" | "canceled" | "expired";

export type MembershipTier = "monthly" | "semi-yearly" | "yearly" | "walk-in";

export interface Membership {
  id: string;
  user_id: string;
  status: MembershipStatus;
  tier: MembershipTier;
  start_date: string;
  renewal_date: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface MembershipResponse {
  success: boolean;
  error?: string;
  data?: Membership;
}

export interface ApplyMembershipParams {
  userId: string;
  tier: MembershipTier;
}

export interface MembershipStats {
  daysUntilRenewal: number;
  daysActive: number;
  isRenewalWindowOpen: boolean;
  isCanceled: boolean;
  isExpired: boolean;
}

export interface MembershipAction {
  type: "apply" | "renew" | "cancel" | "reactivate";
  userId: string;
}

// Helper function to calculate membership stats
export function calculateMembershipStats(
  membership: Membership
): MembershipStats {
  const now = new Date();
  const renewalDate = new Date(membership.renewal_date);
  const startDate = new Date(membership.start_date);

  const daysUntilRenewal = Math.max(
    0,
    Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  const daysActive = Math.ceil(
    (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const isRenewalWindowOpen =
    membership.status === "active" && daysUntilRenewal <= 30 && daysUntilRenewal > 0;
  const isCanceled = membership.cancel_at_period_end;
  const isExpired = membership.status === "expired";

  return {
    daysUntilRenewal,
    daysActive,
    isRenewalWindowOpen,
    isCanceled,
    isExpired,
  };
}
