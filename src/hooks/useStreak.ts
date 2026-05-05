/**
 * useStreak Hook - Fetch and manage user's daily login streak
 * 
 * This hook handles:
 * - Fetching streak data from the shared walk_ins activity service
 * - Managing loading and error states
 * - Auto-refresh and realtime updates
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  getCurrentUserStreakData,
  type StreakData,
} from "../lib/checkInService";

interface UseStreakResult {
  streak: StreakData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const STREAK_REFRESH_INTERVAL_MS = 5000;

export function useStreak(): UseStreakResult {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCurrentUserStreakData();
      setStreak(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("useStreak error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();

    const intervalId = window.setInterval(() => {
      void refetch();
    }, STREAK_REFRESH_INTERVAL_MS);

    const handleFocus = () => {
      void refetch();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refetch();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    let isDisposed = false;
    let streakChannel:
      | ReturnType<typeof supabase.channel>
      | null = null;

    const subscribeToWalkIns = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || isDisposed) {
        return;
      }

      streakChannel = supabase
        .channel(`streak-walk-ins-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "walk_ins",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void refetch();
          }
        )
        .subscribe();

      if (isDisposed) {
        void supabase.removeChannel(streakChannel);
      }
    };

    void subscribeToWalkIns();

    return () => {
      isDisposed = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (streakChannel) {
        void supabase.removeChannel(streakChannel);
      }
    };
  }, [refetch]);

  return { streak, loading, error, refetch };
}
