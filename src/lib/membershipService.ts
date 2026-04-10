/**
 * Membership Service - Core business logic for membership operations
 * Handles all membership operations using Supabase
 */

import { supabase } from "./supabaseClient";
import type {
  Membership,
  MembershipResponse,
  MembershipTier,
} from "../types/membership";
import { AccessFactory } from "../design-patterns";

function getRenewalDays(tier: MembershipTier): number {
  // exclude the walk in 
  if (tier === "walk-in") return 1;

  return AccessFactory.create_access(tier).get_duration();
}

/**
 * Apply for membership - Creates a new membership record
 * @param userId - User's ID from auth
 * @param tier - membership tier selection
 * @returns MembershipResponse with success status
 */
export async function applyMembership(
  userId: string,
  tier: MembershipTier = "monthly"
): Promise<MembershipResponse> {
  if (!userId || userId === "walk-in-guest" || userId.startsWith("walk-in-")) {
    return { success: false, error: "Walk-in sessions cannot be stored in the database." };
  }
  if (!supabase) {
    return { success: false, error: "Supabase client not initialized" };
  }

  try {
    // Check if user already has an active membership
    const { data: existing } = await supabase
      .from("memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (existing) {
      return {
        success: false,
        error: "You already have an active membership",
      };
    }

    // Calculate renewal date based on tier
    const now = new Date();
    const renewalDays = getRenewalDays(tier);
    const renewalDate = new Date(
      now.getTime() + renewalDays * 24 * 60 * 60 * 1000
    );

    // Insert new membership
    const { data, error } = await supabase
      .from("memberships")
      .insert({
        user_id: userId,
        status: "active",
        tier,
        start_date: now.toISOString(),
        renewal_date: renewalDate.toISOString(),
        cancel_at_period_end: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error applying for membership:", error);
      return {
        success: false,
        error: error.message || "Failed to apply for membership",
      };
    }

    return { success: true, data };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("Error in applyMembership:", err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Renew membership - Extends renewal date and resets cancel flag
 * @param userId - User's ID from auth
 * @returns MembershipResponse with success status
 */
export async function renewMembership(
  userId: string
): Promise<MembershipResponse> {
  if (!supabase) {
    return { success: false, error: "Supabase client not initialized" };
  }

  try {
    // Get current membership to determine tier
    const { data: membership, error: fetchError } = await supabase
      .from("memberships")
      .select("tier")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (fetchError || !membership) {
      return {
        success: false,
        error: "No active membership found to renew",
      };
    }

    // Calculate new renewal date based on tier
    const now = new Date();
    const renewalDays = getRenewalDays(membership.tier as MembershipTier);
    const newRenewalDate = new Date(
      now.getTime() + renewalDays * 24 * 60 * 60 * 1000
    );

    // Update membership
    const { data, error } = await supabase
      .from("memberships")
      .update({
        renewal_date: newRenewalDate.toISOString(),
        cancel_at_period_end: false,
        status: "active",
      })
      .eq("user_id", userId)
      .eq("status", "active")
      .select()
      .single();

    if (error) {
      console.error("Error renewing membership:", error);
      return {
        success: false,
        error: error.message || "Failed to renew membership",
      };
    }

    return { success: true, data };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("Error in renewMembership:", err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Cancel membership - Sets cancel_at_period_end flag
 * User retains access until renewal_date
 * @param userId - User's ID from auth
 * @returns MembershipResponse with success status
 */
export async function cancelMembership(
  userId: string
): Promise<MembershipResponse> {
  if (!supabase) {
    return { success: false, error: "Supabase client not initialized" };
  }

  try {
    // Update membership to mark for cancellation
    const { data, error } = await supabase
      .from("memberships")
      .update({
        cancel_at_period_end: true,
      })
      .eq("user_id", userId)
      .eq("status", "active")
      .select()
      .single();

    if (error) {
      console.error("Error canceling membership:", error);
      return {
        success: false,
        error: error.message || "Failed to cancel membership",
      };
    }

    return { success: true, data };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("Error in cancelMembership:", err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Change membership - Updates the active membership tier in place
 * @param userId - User's ID from auth
 * @param tier - New membership tier selection
 * @returns MembershipResponse with success status
 */
export async function changeMembership(
  userId: string,
  tier: MembershipTier
): Promise<MembershipResponse> {
  if (!supabase) {
    return { success: false, error: "Supabase client not initialized" };
  }

  try {
    const { data: existingMembership, error: fetchError } = await supabase
      .from("memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (fetchError || !existingMembership) {
      return {
        success: false,
        error: "No active membership found to change",
      };
    }

    const now = new Date();
    const renewalDays = getRenewalDays(tier);
    const renewalDate = new Date(
      now.getTime() + renewalDays * 24 * 60 * 60 * 1000
    );

    const { data, error } = await supabase
      .from("memberships")
      .update({
        tier,
        start_date: now.toISOString(),
        renewal_date: renewalDate.toISOString(),
        cancel_at_period_end: false,
        status: "active",
      })
      .eq("user_id", userId)
      .eq("status", "active")
      .select()
      .single();

    if (error) {
      console.error("Error changing membership:", error);
      return {
        success: false,
        error: error.message || "Failed to change membership",
      };
    }

    return { success: true, data };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("Error in changeMembership:", err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Fetch user's current membership
 * @param userId - User's ID from auth
 * @returns Membership record or null if no active membership
 */
export async function fetchUserMembership(
  userId: string
): Promise<Membership | null> {
  if (!supabase) {
    console.error("Supabase client not initialized");
    return null;
  }

  try {
    // Try to get active membership first
    const { data, error } = await supabase
      .from("memberships")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // Expected error if no membership exists
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Error fetching membership:", error);
      return null;
    }

    return data as Membership;
  } catch (err) {
    console.error("Error in fetchUserMembership:", err);
    return null;
  }
}

/**
 * Calculate days until membership renewal
 * @param renewalDate - ISO string of renewal date
 * @returns Number of days until renewal
 */
export function calculateDaysUntilRenewal(renewalDate: string): number {
  try {
    const now = new Date();
    const renewal = new Date(renewalDate);
    const diffTime = renewal.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  } catch (err) {
    console.error("Error calculating days until renewal:", err);
    return 0;
  }
}

/**
 * Reactivate a canceled membership
 * @param userId - User's ID from auth
 * @returns MembershipResponse with success status
 */
export async function reactivateMembership(
  userId: string
): Promise<MembershipResponse> {
  if (!supabase) {
    return { success: false, error: "Supabase client not initialized" };
  }

  try {
    // Get the canceled membership
    const { data: membership, error: fetchError } = await supabase
      .from("memberships")
      .select("*")
      .eq("user_id", userId)
      .eq("cancel_at_period_end", true)
      .single();

    if (fetchError || !membership) {
      return {
        success: false,
        error: "No canceled membership found to reactivate",
      };
    }

    // Reactivate by resetting cancel flag and extending renewal date
    const now = new Date();
    const renewalDays = getRenewalDays(membership.tier as MembershipTier);
    const newRenewalDate = new Date(
      now.getTime() + renewalDays * 24 * 60 * 60 * 1000
    );

    const { data, error } = await supabase
      .from("memberships")
      .update({
        cancel_at_period_end: false,
        renewal_date: newRenewalDate.toISOString(),
        status: "active",
      })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error reactivating membership:", error);
      return {
        success: false,
        error: error.message || "Failed to reactivate membership",
      };
    }

    return { success: true, data };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("Error in reactivateMembership:", err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Create walk-in session - Returns mock membership for unauthenticated walk-in users
 * No database call - stored in browser localStorage only
 * Expires after 24 hours
 * @returns Membership object with walk-in tier and 24h expiry
 */
export function createWalkInSession(): Membership {
  const now = new Date();
  const renewalDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

  return {
    id: `walk-in-${Date.now()}`,
    user_id: "walk-in-guest",
    status: "active",
    tier: "walk-in",
    start_date: now.toISOString(),
    renewal_date: renewalDate.toISOString(),
    cancel_at_period_end: false,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}

/**
 * Fetch current total number of members (all memberships).
 * @returns Count of all memberships
 */
export async function fetchDashboardStats(): Promise<{
  totalMembers: number;
  activePlans: number;
  expiringSoon: number;
}> {
  if (!supabase) return { totalMembers: 0, activePlans: 0, expiringSoon: 0 };

  try {
    const { data, error } = await supabase.rpc("get_membership_stats");

    if (error) {
      console.error("Error fetching dashboard stats:", error);
      return { totalMembers: 0, activePlans: 0, expiringSoon: 0 };
    }

    return {
      totalMembers: data.total_active ?? 0,
      activePlans: data.total_active ?? 0,
      expiringSoon: data.expiring_soon ?? 0,
    };
  } catch (err) {
    console.error("Error in fetchDashboardStats:", err);
    return { totalMembers: 0, activePlans: 0, expiringSoon: 0 };
  }
}
/**
 * Fetch total number of active plans.
 * @returns Count of active memberships
 */
export async function fetchActivePlansCount(): Promise<number> {
  if (!supabase) {
    console.error("Supabase client not initialized");
    return 0;
  }

  try {
    const { count, error } = await supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    if (error) {
      console.error("Error fetching active plans count:", error);
      return 0;
    }

    return count ?? 0;
  } catch (err) {
    console.error("Error in fetchActivePlansCount:", err);
    return 0;
  }
}

/**
 * Fetch number of active memberships that will expire in the next 7 days.
 * @returns Count of memberships expiring soon
 */
export async function fetchExpiringSoonCount(): Promise<number> {
  if (!supabase) {
    console.error("Supabase client not initialized");
    return 0;
  }

  try {
    const now = new Date();
    const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { count, error } = await supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .gte("renewal_date", now.toISOString())
      .lte("renewal_date", inSevenDays.toISOString());

    if (error) {
      console.error("Error fetching expiring soon count:", error);
      return 0;
    }

    return count ?? 0;
  } catch (err) {
    console.error("Error in fetchExpiringSoonCount:", err);
    return 0;
  }
}
