/**
 * Check-In Service - Core business logic for gym access tracking
 * Handles check-in, check-out, and walk-in validations
 */

import { supabase } from "./supabaseClient";

export interface QRData {
  id?: string;
  type: "checkin" | "checkout" | "walkin";
  tier?: string;
  timestamp?: string;
  date?: string;
  access?: string;
}

export interface CheckInResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    user_id: string;
    check_in_type: string;
    check_in_time: string;
    status: string;
  };
  error?: string;
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
    if (qrData.type === "walkin") {
      return await handleWalkIn(qrData, adminId);
    }

    // Handle member check-in/check-out
    if (!qrData.id) {
      return { success: false, message: "Invalid QR code: Missing user ID", error: "Invalid QR" };
    }

    // Check if user exists and has active membership
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(qrData.id);

    if (userError || !userData?.user) {
      return { success: false, message: "User not found", error: "User not found" };
    }

    const user = userData.user;

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
    const { data: checkIn, error: checkInError } = await supabase
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
      message: `${qrData.type === "checkin" ? "Check-in" : "Check-out"} successful for ${(user.user_metadata?.full_name as string | undefined) || user.email || "user"}`,
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