import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { verifyAdminAccess } from "../lib/adminAuth";

type AdminProtectedRouteProps = {
  children: ReactNode;
};

export default function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAdminSession = async () => {
      if (!isSupabaseConfigured || !supabase) {
        if (isMounted) {
          setIsAdminAuthenticated(false);
          setIsChecking(false);
        }
        return;
      }

      const { isAdmin } = await verifyAdminAccess();

      if (isMounted) {
        setIsAdminAuthenticated(isAdmin);
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
