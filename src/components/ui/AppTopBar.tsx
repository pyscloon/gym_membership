import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks";
import { useAppUi } from "../../context/AppUiContext";
import { supabase } from "../../lib/supabaseClient";

type AppTopBarProps = {
  onOpenMobileNav?: () => void;
  fixed?: boolean;
  mode?: "default" | "admin-actions";
  onLogout?: () => void;
};

export default function AppTopBar({
  fixed = true,
  mode = "default",
  onLogout,
}: AppTopBarProps) {
  const { user } = useAuth();
  const { avatarLabel, notificationCount } = useAppUi();
  const navigate = useNavigate();
  const location = useLocation();
  const [isActiveMember, setIsActiveMember] = useState<boolean | null>(null);

  useEffect(() => {
    if (mode === "admin-actions") {
      return;
    }

    const loadMembership = async () => {
      if (!user || !supabase) {
        setIsActiveMember(false);
        return;
      }

      const { data, error } = await supabase
        .from("memberships")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Failed to load membership status:", error);
        setIsActiveMember(false);
        return;
      }

      setIsActiveMember(data?.status === "active");
    };
    void loadMembership();
  }, [mode, user]);

  const isActive = (path: string) => location.pathname === path;
  const showActiveMemberActions = user && isActiveMember === true;
  const headerPosition = fixed ? "fixed left-0 right-0 top-0" : "sticky top-0";
  const displayName = user?.email || `Profile ${avatarLabel}`;

  if (mode === "admin-actions") {
    return (
      <header className={`${headerPosition} z-50 border-b border-[rgba(0,102,204,0.25)] bg-[rgba(0,0,51,0.6)] backdrop-blur-[14px]`}>
        <div className="relative mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <span className="fr-headline text-2xl text-white">Dashboard</span>
          </div>

          <div className="flex items-center gap-3 text-white">
            <button
              type="button"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
              aria-label="Notifications"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a3 3 0 006 0" />
              </svg>
              {notificationCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-bold text-white">
                  {notificationCount}
                </span>
              )}
            </button>

            <span className="hidden text-sm font-medium text-white/90 sm:inline">
              {displayName}
            </span>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-red-400/40 bg-red-500/15 text-red-100 transition hover:bg-red-500/25"
              aria-label="Logout"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h8a2 2 0 002-2v-3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5V3a2 2 0 00-2-2H3" />
              </svg>
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={`${headerPosition} z-50 border-b border-[rgba(0,102,204,0.25)] bg-[rgba(0,0,51,0.6)] backdrop-blur-[14px]`}>
      <div className="relative mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="fr-headline text-2xl text-white">
            FLEX <span className="text-[#0066CC]">REPUBLIC</span>
          </Link>
        </div>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
          <Link to="/subscription-tier" className={`text-sm font-medium transition ${isActive("/subscription-tier") ? "text-[#0099FF]" : "text-white/95 hover:text-[#0099FF]"}`}>Membership</Link>
          <Link to="/about-us" className={`text-sm font-medium transition ${isActive("/about-us") ? "text-[#0099FF]" : "text-white/95 hover:text-[#0099FF]"}`}>About Us</Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <button
                type="button"
                className="hidden md:inline-flex items-center gap-3 rounded-full border border-[#0066CC]/30 bg-gradient-to-r from-[#000022]/80 to-[#001144]/80 p-1.5 pr-5 text-xs text-white shadow-[0_4px_10px_rgba(0,0,0,0.3)] backdrop-blur-md transition-shadow duration-300 hover:shadow-[0_0_20px_rgba(0,153,255,0.25)]"
                onClick={() => navigate("/profile")}
              >
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#0099FF] to-[#0055CC]">
                  <span className="text-[12px] font-extrabold text-white">{avatarLabel}</span>
                </div>
                <div className="hidden flex-col items-start sm:flex">
                  <span className="leading-tight text-[10px] font-bold uppercase tracking-[0.15em] text-[#66B2FF]">ACTIVE PROFILE</span>
                </div>
              </button>
              <Link to="/dashboard" className={`rounded-full px-4 py-2 text-xs font-bold text-white transition-all ${showActiveMemberActions ? "bg-gradient-to-r from-[#0066CC] to-[#0099FF] shadow-[0_0_20px_rgba(0,102,204,0.6)]" : "bg-[#0066CC]"}`}>Dashboard</Link>
            </>
          ) : (
            <button onClick={() => navigate("/login")} className="rounded-[50px] bg-[#0066CC] px-5 py-2 text-xs text-white">Login</button>
          )}
        </div>
      </div>
    </header>
  );
}