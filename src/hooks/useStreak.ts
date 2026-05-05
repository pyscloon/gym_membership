/**
 * useStreak Hook - Fetch and manage user's daily login streak
 * 
 * This hook handles:
 * - Fetching streak data from /api/streak endpoint
 * - Managing loading and error states
 * - Optional auto-refresh
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export interface StreakData {
  streak: number;
  last7Days: boolean[];
  totalCheckIns?: number;
}

interface UseStreakResult {
  streak: StreakData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch the current user's streak data
 * @returns StreakData or throws error
 */
async function fetchStreakData(): Promise<StreakData> {
  try {
    // Get the current user from Supabase auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("User not authenticated");
    }

    // Fetch streak from backend API
    const response = await fetch(`/api/streak?userId=${user.id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.data || { streak: 0, last7Days: [] };
  } catch (err) {
    throw err instanceof Error ? err : new Error("Failed to fetch streak data");
  }
}

export function useStreak(): UseStreakResult {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchStreakData();
      setStreak(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("useStreak error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    refetch();
  }, [refetch]);

  return { streak, loading, error, refetch };
}
