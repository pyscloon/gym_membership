/**
 * Check-In Service - Core business logic for gym access tracking
 * Handles check-in, check-out, and walk-in validations
 */

import type { ActivityMetricRow } from "./activityMetrics";
import { buildCompletedSessionMetrics, dateKey } from "./activityMetrics";
import { supabase } from "./supabaseClient";

export interface QRData {
  id?: string;
  type: "checkin" | "checkout" | "walk_in";
  tier?: string;
  timestamp?: string;
  date?: string;
  access?: string;
}

export interface CheckInResponse {
  success: boolean;
  message: string;
  actionType?: QRData["type"];
  data?: {
    id: string;
    user_id: string;
    check_in_type: string;
    check_in_time: string;
    status: string;
  };
  error?: string;
}

export interface TodayActivityRecord {
  id: string;
  name: string;
  membershipType: string;
  actionType: "checkin" | "checkout" | "walk_in";
  time: string;
}

export interface StreakData {
  streak: number;
  last7Days: boolean[];
  totalCheckIns?: number;
}

type TodayWalkInRow = {
  id: string;
  user_id: string | null;
  membership_id?: string | null;
  walk_in_type: string;
  walk_in_time: string;
};

type ActivityProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type ActivityMembershipRow = {
  id: string;
  tier: string | null;
};

function buildLast7Days(daySet: Set<string>, today: Date): boolean[] {
  const days: boolean[] = [];

  for (let i = 6; i >= 0; i -= 1) {
    const cursor = new Date(today);
    cursor.setDate(today.getDate() - i);
    cursor.setHours(0, 0, 0, 0);
    days.push(daySet.has(dateKey(cursor)));
  }

  return days;
}

export function buildStreakDataFromActivityRows(
  rows: ActivityMetricRow[],
  today: Date = new Date()
): StreakData {
  const metrics = buildCompletedSessionMetrics(rows, today);

  return {
    streak: metrics.streakDays,
    last7Days: buildLast7Days(metrics.completedDaySet, today),
    totalCheckIns: metrics.totalSessions,
  };
}

export async function getMemberCompletedSessionRows(
  userId: string,
  limit: number = 2000
): Promise<ActivityMetricRow[]> {
  if (!supabase || !userId) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("walk_ins")
      .select("walk_in_time, walk_in_type")
      .eq("user_id", userId)
      .eq("walk_in_type", "checkout")
      .order("walk_in_time", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching member completed session rows:", error);
      return [];
    }

    return (data as ActivityMetricRow[] | null) ?? [];
  } catch (err) {
    console.error("Error in getMemberCompletedSessionRows:", err);
    return [];
  }
}

export async function getCurrentUserStreakData(): Promise<StreakData> {
  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("User not authenticated");
  }

  const rows = await getMemberCompletedSessionRows(user.id);
  return buildStreakDataFromActivityRows(rows);
}

/**
 * Validate and process QR code scan
 * @param qrData - Parsed QR code data
 * @param adminId - Admin user ID performing the validation
 * @returns CheckInResponse with validation result
 */
export async function processQRCheckIn(
  qrData: QRData,
  adminId: string
): Promise<CheckInResponse> {
  if (!supabase) {
    return { success: false, message: "Supabase client not initialized", error: "Client error" };
  }

  try {
    // Handle walk-in access
    if (qrData.type === "walk_in") {
      return await handleWalkIn(qrData, adminId);
    }

    // Handle member check-in/check-out
    if (!qrData.id) {
      return { success: false, message: "Invalid QR code: Missing user ID", error: "Invalid QR" };
    }

    // Check if user exists and has active membership
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", qrData.id)
      .single();

    if (profileError || !profile) {
      return { success: false, message: "User not found", error: "User not found" };
    }

    // Fetch user's membership info
    const { data: membership, error: membershipError } = await supabase
      .from("memberships")
      .select("id, status, tier")
      .eq("user_id", qrData.id)
      .eq("status", "active")
      .single();

    if (membershipError || !membership) {
      return {
        success: false,
        message: "No active membership found for this user",
        error: "No active membership",
      };
    }

    // Check if the scanned tier matches the membership tier (if provided)
    if (qrData.tier && qrData.tier !== membership.tier) {
      return {
        success: false,
        message: `QR code tier (${qrData.tier}) doesn't match membership tier (${membership.tier})`,
        error: "Tier mismatch",
      };
    }

    // Insert check-in/check-out record
    const { data:  checkIn, error: checkInError } = await supabase
      .from("walk_ins")
      .insert({
        user_id: qrData.id,
        membership_id: membership.id,
        walk_in_type: qrData.type,
        walk_in_time: qrData.timestamp || new Date().toISOString(),
        qr_data: qrData,
        validated_by: adminId,
        status: "completed",
      })
      .select()
      .single();

    if (checkInError) {
      console.error("Error recording check-in:", checkInError);
      return {
        success: false,
        message: "Failed to record check-in",
        error: checkInError.message,
      };
    }

    return {
      success: true,
      actionType: qrData.type,
      message: `${qrData.type === "checkin" ? "Check-in" : "Check-out"} successful for ${profile.full_name || profile.email || "user"}`,
      data: {
        id: checkIn.id,
        user_id: checkIn.user_id,
        check_in_type: checkIn.check_in_type,
        check_in_time: checkIn.check_in_time,
        status: checkIn.status,
      },
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("Error in processQRCheckIn:", err);
    return {
      success: false,
      message: "An error occurred while processing check-in",
      error: errorMsg,
    };
  }
}

/**
 * Handle walk-in guest pass validation
 * @param qrData - Parsed walk-in QR data
 * @param adminId - Admin user ID performing the validation
 * @returns CheckInResponse with validation result
 */
async function handleWalkIn(qrData: QRData, adminId: string): Promise<CheckInResponse> {
  if (!supabase) {
    return { success: false, message: "Supabase client not initialized", error: "Client error" };
  }

  try {
    // For walk-in, we create a temporary guest entry
    // In a real system, you might want to require payment or pre-registration
    const walkInData = {
      user_id: null, // Walk-in guests don't have user accounts
      walk_in_type: "walk-in" as const,
      walk_in_time: new Date().toISOString(),
      qr_data: qrData,
      validated_by: adminId,
      status: "completed",
      notes: `Walk-in guest for ${qrData.date || "today"}`,
    };

    const { data: checkIn, error: checkInError } = await supabase
      .from("walk_ins")
      .insert(walkInData)
      .select()
      .single();

    if (checkInError) {
      console.error("Error recording walk-in:", checkInError);
      return {
        success: false,
        message: "Failed to record walk-in access",
        error: checkInError.message,
      };
    }

    return {
      success: true,
      actionType: "walk_in",
      message: "Walk-in guest pass validated successfully",
      data: {
        id: checkIn.id,
        user_id: checkIn.user_id || "guest",
        check_in_type: checkIn.check_in_type,
        check_in_time: checkIn.check_in_time,
        status: checkIn.status,
      },
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("Error in handleWalkIn:", err);
    return {
      success: false,
      message: "An error occurred while processing walk-in",
      error: errorMsg,
    };
  }
}

/**
 * Get recent check-ins for dashboard display
 * @param limit - Number of recent check-ins to fetch
 * @returns Array of recent check-in records
 */
export async function getRecentCheckIns(limit: number = 10) {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("walk_ins")
      .select("id, user_id, walk_in_type, walk_in_time, status")
      .order("walk_in_time", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching recent check-ins:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Error in getRecentCheckIns:", err);
    return [];
  }
}

export async function getTodayCheckActivities(): Promise<TodayActivityRecord[]> {
  if (!supabase) {
    return [];
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: walkIns, error } = await supabase
      .from("walk_ins")
      .select("id, user_id, membership_id, walk_in_type, walk_in_time")
      .gte("walk_in_time", today.toISOString())
      .lt("walk_in_time", tomorrow.toISOString())
      .order("walk_in_time", { ascending: false });

    if (error || !walkIns) {
      console.error("Error fetching today's check activities:", error);
      return [];
    }

    const walkInRows = walkIns as TodayWalkInRow[];
    const userIds = [...new Set(walkInRows.map((row: TodayWalkInRow) => row.user_id).filter(Boolean))] as string[];
    const membershipIds = [...new Set(walkInRows.map((row: TodayWalkInRow) => row.membership_id).filter(Boolean))] as string[];

    const [profilesResult, membershipsResult] = await Promise.all([
      userIds.length > 0
        ? supabase.from("profiles").select("id, full_name, email").in("id", userIds)
        : Promise.resolve({ data: [], error: null }),
      membershipIds.length > 0
        ? supabase.from("memberships").select("id, tier").in("id", membershipIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (profilesResult.error) {
      console.error("Error fetching activity profiles:", profilesResult.error);
    }

    if (membershipsResult.error) {
      console.error("Error fetching activity memberships:", membershipsResult.error);
    }

    const profileMap = new Map(
      ((profilesResult.data ?? []) as ActivityProfileRow[]).map((profile: ActivityProfileRow) => [
        profile.id,
        profile.full_name?.trim() || profile.email || "Unknown member",
      ])
    );

    const membershipMap = new Map(
      ((membershipsResult.data ?? []) as ActivityMembershipRow[]).map((membership: ActivityMembershipRow) => [membership.id, membership.tier || "Unknown"])
    );

    return walkInRows.map((row: TodayWalkInRow) => ({
      id: row.id,
      name: row.user_id ? profileMap.get(row.user_id) || "Unknown member" : "Walk-in Guest",
      membershipType: row.membership_id ? membershipMap.get(row.membership_id) || "Unknown" : "Walk-in",
      actionType:
        row.walk_in_type === "checkout"
          ? "checkout"
          : row.walk_in_type === "walk_in" || row.walk_in_type === "walk-in" || row.walk_in_type === "walkin"
            ? "walk_in"
            : "checkin",
      time: row.walk_in_time,
    }));
  } catch (err) {
    console.error("Error in getTodayCheckActivities:", err);
    return [];
  }
}

/**
 * Record a walk-in entry after payment confirmation
 * @param adminId - Admin who confirmed the payment
 * @param notes - Optional notes (e.g. transaction ID)
 */
export async function recordConfirmedWalkIn(
  adminId: string,
  notes?: string
): Promise<CheckInResponse> {
  if (!supabase) {
    return { success: false, message: "Supabase client not initialized", error: "Client error" };
  }

  const { data: checkIn, error } = await supabase
    .from("walk_ins")
    .insert({
      user_id: null,           // no account
      walk_in_type: "walk-in",
      walk_in_time: new Date().toISOString(),
      validated_by: adminId,
      status: "completed",
      notes: notes ?? "Walk-in via confirmed payment",
    })
    .select()
    .single();

  if (error) {
    return { success: false, message: "Failed to record walk-in", error: error.message };
  }

  return {
    success: true,
    actionType: "walk_in",
    message: "Walk-in recorded successfully",
    data: {
      id: checkIn.id,
      user_id: "guest",
      check_in_type: checkIn.walk_in_type,
      check_in_time: checkIn.walk_in_time,
      status: checkIn.status,
    },
  };
}
