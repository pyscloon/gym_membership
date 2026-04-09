import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { endCrowdSession, startCrowdSession } from "../lib/crowdService";

type User = {
  id: string;
  email?: string;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const trackedUserIdRef = useRef<string | null>(null);
  const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL ?? "").toLowerCase();

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const getUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase!.auth.getSession();
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error getting user:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    const {
      data: { subscription },
    } = supabase!.auth.onAuthStateChange((_event: unknown, session: any) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const previousUserId = trackedUserIdRef.current;

    if (!user) {
      if (previousUserId) {
        endCrowdSession({ userId: previousUserId });
      }

      trackedUserIdRef.current = null;
      return;
    }

    if (user.email?.toLowerCase() === adminEmail) {
      if (previousUserId) {
        endCrowdSession({ userId: previousUserId });
      }

      trackedUserIdRef.current = null;
      return;
    }

    if (previousUserId && previousUserId !== user.id) {
      endCrowdSession({ userId: previousUserId });
    }

    startCrowdSession({ userId: user.id, sessionType: "member" });
    trackedUserIdRef.current = user.id;
  }, [adminEmail, user]);

  return { user, loading };
}
