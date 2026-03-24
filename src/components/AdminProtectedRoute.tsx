import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

type AdminProtectedRouteProps = {
  children: ReactNode;
};

const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL ?? "").toLowerCase();

export default function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAdminSession = async () => {
      if (!isSupabaseConfigured || !supabase || !ADMIN_EMAIL) {
        if (isMounted) {
          setIsAdminAuthenticated(false);
          setIsChecking(false);
        }
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (isMounted) {
        const userEmail = user?.email?.toLowerCase() ?? "";
        setIsAdminAuthenticated(userEmail === ADMIN_EMAIL);
        setIsChecking(false);
      }
    };

    void checkAdminSession();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-flexWhite">
        <p className="text-sm font-medium text-flexNavy">Checking admin session...</p>
      </main>
    );
  }

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
