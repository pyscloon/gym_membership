import { useEffect, useRef, useState } from "react";
import type { Membership } from "../types/membership";
import { createWalkInSession } from "../lib/membershipService";

const WALK_IN_STORAGE_KEY = "flex_republic_walk_in_session";

function readStoredWalkInSession(): Membership | null {
  try {
    const stored = localStorage.getItem(WALK_IN_STORAGE_KEY);
    if (!stored) return null;

    const session = JSON.parse(stored) as Membership;
    const renewalDate = new Date(session.renewal_date).getTime();
    const now = new Date().getTime();

    return now > renewalDate ? null : session;
  } catch (error) {
    console.error("Error reading walk-in session:", error);
    return null;
  }
}

/**
 * useWalkIn - Hook to manage walk-in session in localStorage
 * Walk-in sessions are temporary (24h) and not persisted to database
 * Auto-expires after 24 hours
 */
export function useWalkIn() {
  const [session, setSession] = useState<Membership | null>(() => readStoredWalkInSession());
  const [isLoading] = useState(false);
  const sessionRef = useRef<Membership | null>(null);

  /**
   * Get walk-in session from localStorage
   * Returns null if session expired
   */
  const clearSession = (sessionId?: string): void => {
    void sessionId;
    localStorage.removeItem(WALK_IN_STORAGE_KEY);
    sessionRef.current = null;
    setSession(null);
  };

  /**
   * Create and save a new walk-in session
   */
  const startSession = (): Membership => {
    const newSession = createWalkInSession();
    localStorage.setItem(WALK_IN_STORAGE_KEY, JSON.stringify(newSession));
    sessionRef.current = newSession;
    setSession(newSession);
    return newSession;
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
    return session !== null;
  };

  // Keep the ref synchronized with the current session
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Check for expiry every second without setting state inside the effect body
  useEffect(() => {
    // Set up interval to check for expiry every second
    const interval = setInterval(() => {
      const current = readStoredWalkInSession();
      if (!current) {
        localStorage.removeItem(WALK_IN_STORAGE_KEY);
        sessionRef.current = null;
        clearSession();
        clearInterval(interval);
        return;
      }

      setSession(current);
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
