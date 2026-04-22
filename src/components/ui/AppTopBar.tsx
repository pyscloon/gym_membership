import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks";
import { useAppUi } from "../../context/AppUiContext";
import { supabase } from "../../lib/supabaseClient";

type AppTopBarProps = {
  onOpenMobileNav?: () => void;
  fixed?: boolean;
  mode?: "default" | "admin-actions" | "landing";
  onLogout?: () => void;
};

export default function AppTopBar({
  fixed = true,
  mode = "default",
  onLogout,
}: AppTopBarProps) {
  const { user } = useAuth();
  const { avatarLabel } = useAppUi();
  const navigate = useNavigate();
  const location = useLocation();
  const [isActiveMember, setIsActiveMember] = useState<boolean | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;
  const showActiveMemberActions = user && isActiveMember === true;
  const headerPosition = fixed ? "fixed left-0 right-0 top-0" : "sticky top-0";
  const displayName = user?.email || `Profile ${avatarLabel}`;
  const hamburgerButton = (
    <button
      type="button"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white xl:hidden"
      onClick={() => setIsMenuOpen((prev) => !prev)}
      aria-label="Toggle menu"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    </button>
  );

  if (mode === "admin-actions") {
    return (
      <header className={`${headerPosition} z-50 border-b border-[rgba(0,102,204,0.25)] bg-[rgba(0,0,51,0.6)] backdrop-blur-[14px]`}>
        <div className="relative mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <span className="fr-headline text-2xl text-white">Dashboard</span>
          </div>

          <div className="flex items-center gap-3 text-white">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-white transition hover:bg-white/10">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#0066CC]/70 text-white">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                  <circle cx="12" cy="8" r="3.25" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18c1.5-2.5 4-3.75 6-3.75S16.5 15.5 18 18" />
                </svg>
              </div>
              <span className="hidden text-sm font-medium text-white/90 sm:inline">
                {displayName}
              </span>
            </div>

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

  if (mode === "landing") {
    return (
      <header className={`${headerPosition} z-50 border-b border-[#0066CC]/25 bg-[#000033]/55 backdrop-blur-[12px]`}>
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6 sm:px-10 lg:px-14">
          <div className="flex items-center font-extrabold tracking-tight text-white [font-family:var(--font-headline)]">
            <span className="text-2xl leading-none sm:text-[26px]">FLEX</span>
            <span className="ml-1 text-xl leading-none text-[#0066CC] sm:text-[21px]">REPUBLIC</span>
          </div>

          <nav className="hidden items-center gap-8 xl:flex" aria-label="Main navigation">
            <Link to="/subscription-tier" className={`text-sm font-medium transition [font-family:var(--font-body)] ${isActive("/subscription-tier") ? "text-[#0099FF]" : "text-white/95 hover:text-[#0099FF]"}`}>Membership</Link>
            <Link to="/about-us" className={`text-sm font-medium transition [font-family:var(--font-body)] ${isActive("/about-us") ? "text-[#0099FF]" : "text-white/95 hover:text-[#0099FF]"}`}>About Us</Link>
          </nav>

          <div className="hidden items-center gap-3 xl:flex">
            {user ? (
              <>
                <button
                  type="button"
                  className="inline-flex items-center gap-3 rounded-full border border-[#0066CC]/30 bg-gradient-to-r from-[#000022]/80 to-[#001144]/80 p-1.5 pr-5 text-xs text-white shadow-[0_4px_10px_rgba(0,0,0,0.3)] backdrop-blur-md transition-shadow duration-300 hover:shadow-[0_0_20px_rgba(0,153,255,0.25)]"
                  onClick={() => navigate("/profile")}
                >
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#0099FF] to-[#0055CC]">
                    <span className="text-[12px] font-extrabold text-white">{avatarLabel}</span>
                  </div>
                  <div className="hidden flex-col items-start sm:flex">
                    <span className="leading-tight text-[10px] font-bold uppercase tracking-[0.15em] text-[#66B2FF]">ACTIVE PROFILE</span>
                  </div>
                </button>
                <Link
                  to="/dashboard"
                  className={`rounded-full px-4 py-2 text-xs font-bold text-white transition-all ${showActiveMemberActions ? "bg-gradient-to-r from-[#0066CC] to-[#0099FF] shadow-[0_0_20px_rgba(0,102,204,0.6)]" : "bg-[#0066CC]"}`}
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <Link
                to="/login"
                className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium text-white transition hover:bg-[#0066CC]/40 [font-family:var(--font-body)]"
              >
                Login
              </Link>
            )}
          </div>

          {hamburgerButton}
        </div>

        {isMenuOpen ? (
          <div className="border-t border-[#0066CC]/25 bg-[#000033]/95 px-6 pb-5 pt-4 xl:hidden">
            <div className="flex flex-col gap-3">
              <Link to="/subscription-tier" className="text-sm font-medium text-white [font-family:var(--font-body)]">Membership</Link>
              <Link to="/about-us" className="text-sm font-medium text-white [font-family:var(--font-body)]">About Us</Link>
              {user ? (
                <>
                  <Link to="/profile" className="text-sm font-medium text-white [font-family:var(--font-body)]">Active Profile</Link>
                  <Link to="/dashboard" className="text-sm font-medium text-white [font-family:var(--font-body)]">Dashboard</Link>
                </>
              ) : (
                <Link to="/login" className="mt-1 inline-flex w-fit rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm text-white">Login</Link>
              )}
            </div>
          </div>
        ) : null}
      </header>
    );
  }

  return (
    <header className={`${headerPosition} z-50 border-b border-[rgba(0,102,204,0.25)] bg-[rgba(0,0,51,0.6)] backdrop-blur-[14px]`}>
      <div className="relative mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="fr-headline text-2xl text-white">
            FLEX <span className="text-[#0066CC]">REPUBLIC</span>
          </div>
        </div>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 xl:flex">
          <Link to="/subscription-tier" className={`text-sm font-medium transition ${isActive("/subscription-tier") ? "text-[#0099FF]" : "text-white/95 hover:text-[#0099FF]"}`}>Membership</Link>
          <Link to="/about-us" className={`text-sm font-medium transition ${isActive("/about-us") ? "text-[#0099FF]" : "text-white/95 hover:text-[#0099FF]"}`}>About Us</Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="hidden items-center gap-3 xl:flex">
              <button
                type="button"
                className="inline-flex items-center gap-3 rounded-full border border-[#0066CC]/30 bg-gradient-to-r from-[#000022]/80 to-[#001144]/80 p-1.5 pr-5 text-xs text-white shadow-[0_4px_10px_rgba(0,0,0,0.3)] backdrop-blur-md transition-shadow duration-300 hover:shadow-[0_0_20px_rgba(0,153,255,0.25)]"
                onClick={() => navigate("/profile")}
              >
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#0099FF] to-[#0055CC]">
                  <span className="text-[12px] font-extrabold text-white">{avatarLabel}</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="leading-tight text-[10px] font-bold uppercase tracking-[0.15em] text-[#66B2FF]">ACTIVE PROFILE</span>
                </div>
              </button>
              <Link to="/dashboard" className={`rounded-full px-4 py-2 text-xs font-bold text-white transition-all ${showActiveMemberActions ? "bg-gradient-to-r from-[#0066CC] to-[#0099FF] shadow-[0_0_20px_rgba(0,102,204,0.6)]" : "bg-[#0066CC]"}`}>Dashboard</Link>
            </div>
          ) : (
            <button onClick={() => navigate("/login")} className="hidden rounded-[50px] bg-[#0066CC] px-5 py-2 text-xs text-white xl:inline-flex">Login</button>
          )}
          {hamburgerButton}
        </div>
      </div>

      {isMenuOpen ? (
        <div className="border-t border-[rgba(0,102,204,0.25)] bg-[rgba(0,0,51,0.95)] px-4 pb-5 pt-4 sm:px-6 lg:px-8 xl:hidden">
          <div className="flex flex-col gap-3">
            <Link to="/subscription-tier" className="text-sm font-medium text-white">Membership</Link>
            <Link to="/about-us" className="text-sm font-medium text-white">About Us</Link>
            {user ? (
              <>
                <Link to="/profile" className="text-sm font-medium text-white">Active Profile</Link>
                <Link to="/dashboard" className="text-sm font-medium text-white">Dashboard</Link>
              </>
            ) : (
              <Link to="/login" className="mt-1 inline-flex w-fit rounded-full bg-[#0066CC] px-5 py-2 text-sm text-white">Login</Link>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
