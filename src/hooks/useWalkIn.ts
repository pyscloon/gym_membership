import { useEffect, useState } from "react";
import type { Membership } from "../types/membership";
import { createWalkInSession } from "../lib/membershipService";

const WALK_IN_STORAGE_KEY = "flex_republic_walk_in_session";

/**
 * useWalkIn - Hook to manage walk-in session in localStorage
 * Walk-in sessions are temporary (24h) and not persisted to database
 * Auto-expires after 24 hours
 */
export function useWalkIn() {
  const [session, setSession] = useState<Membership | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Get walk-in session from localStorage
   * Returns null if session expired
   */
  const getSession = (): Membership | null => {
    try {
      const stored = localStorage.getItem(WALK_IN_STORAGE_KEY);
      if (!stored) return null;

      const session = JSON.parse(stored) as Membership;
      const renewalDate = new Date(session.renewal_date).getTime();
      const now = Date.now();

      // Session expired, clear it
      if (now > renewalDate) {
        clearSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error("Error reading walk-in session:", error);
      return null;
    }
  };

  /**
   * Create and save a new walk-in session
   */
  const startSession = (): Membership => {
    const newSession = createWalkInSession();
    localStorage.setItem(WALK_IN_STORAGE_KEY, JSON.stringify(newSession));
    setSession(newSession);
    return newSession;
  };

  /**
   * Clear walk-in session
   */
  const clearSession = (): void => {
    localStorage.removeItem(WALK_IN_STORAGE_KEY);
    setSession(null);
  };

  /**
   * Get remaining time in milliseconds until session expires
   */
  const getTimeRemaining = (): number => {
    if (!session) return 0;
    const renewalDate = new Date(session.renewal_date).getTime();
    const now = Date.now();
    return Math.max(0, renewalDate - now);
  };

  /**
   * Format remaining time as HH:MM:SS
   */
  const getFormattedTimeRemaining = (): string => {
    const ms = getTimeRemaining();
    if (ms <= 0) return "00:00:00";

    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  /**
   * Check if session is active and not expired
   */
  const isSessionActive = (): boolean => {
    const current = getSession();
    return current !== null;
  };

  // Load session on mount and check for expiry
  useEffect(() => {
    const current = getSession();
    setSession(current);
    setIsLoading(false);

    // Set up interval to check for expiry every second
    const interval = setInterval(() => {
      const current = getSession();
      if (!current) {
        setSession(null);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    session,
    isLoading,
    startSession,
    clearSession,
    getTimeRemaining,
    getFormattedTimeRemaining,
    isSessionActive,
  };
}
