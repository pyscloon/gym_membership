import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks";
import { useAppUi } from "../../context/AppUiContext";
import { supabase } from "../../lib/supabaseClient";

type AppTopBarProps = {
  onOpenMobileNav?: () => void;
  fixed?: boolean;
};

export default function AppTopBar({ onOpenMobileNav, fixed = true }: AppTopBarProps) {
  const { user } = useAuth();
  const { avatarLabel, notificationCount, membershipTier } = useAppUi();
  const navigate = useNavigate();
  const location = useLocation();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isActiveMember, setIsActiveMember] = useState<boolean | null>(null);
  const notificationPanelRef = useRef<HTMLDivElement>(null);

  const notifications = [
    {
      id: "holiday-discount",
      title: "Holiday Special: 20% Off",
      summary: "Save on selected membership plans until April 25.",
      time: "2h ago",
    },
    {
      id: "friend-week",
      title: "Bring a Friend Week",
      summary: "Invite one guest for free every Friday this month.",
      time: "1d ago",
    },
    {
      id: "equipment-update",
      title: "New Equipment Available",
      summary: "Fresh plate-loaded machines are now ready at Elite Studio.",
      time: "2d ago",
    },
  ];

  useEffect(() => {
    if (!isNotificationsOpen) {
      return;
    }

    const onClickOutside = (event: MouseEvent) => {
      if (notificationPanelRef.current && !notificationPanelRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [isNotificationsOpen]);

  useEffect(() => {
    setIsNotificationsOpen(false);
  }, [user]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, user]);

  useEffect(() => {
    const loadMembership = async () => {
      if (!user || !supabase) {
        setIsActiveMember(false);
        return;
      }

      const { data } = await supabase
        .from("memberships")
        .select("status")
        .eq("user_id", user.id)
        .single();

      setIsActiveMember(data?.status === "active");
    };

    void loadMembership();
  }, [user]);

  const isActive = (path: string) => location.pathname === path;
  const showActiveMemberActions = user && isActiveMember === true;
  const headerPosition = fixed ? "fixed left-0 right-0 top-0" : "sticky top-0";

  const handleMobileNav = () => {
    if (onOpenMobileNav) {
      onOpenMobileNav();
      return;
    }
    setIsMobileMenuOpen((prev) => !prev);
  };

  return (
    <header className={`${headerPosition} z-50 border-b border-[rgba(0,102,204,0.25)] bg-[rgba(0,0,51,0.6)] backdrop-blur-[14px]`}>
      <div className="relative mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(0,102,204,0.35)] text-white md:hidden"
            onClick={handleMobileNav}
            aria-label="Open navigation"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <Link to="/dashboard" className="fr-headline text-2xl text-white">
            FLEX <span className="text-[#0066CC]">REPUBLIC</span>
          </Link>
        </div>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex" aria-label="Main navigation">
          {!user ? (
            <>
              <Link to="/" className={`text-sm font-medium transition ${isActive("/") ? "text-[#0099FF]" : "text-white/95 hover:text-[#0099FF]"}`}>
                Home
              </Link>
              <Link to="/subscription-tier" className={`text-sm font-medium transition ${isActive("/subscription-tier") ? "text-[#0099FF]" : "text-white/95 hover:text-[#0099FF]"}`}>
                Membership
              </Link>
              <Link to="/about-us" className={`text-sm font-medium transition ${isActive("/about-us") ? "text-[#0099FF]" : "text-white/95 hover:text-[#0099FF]"}`}>
                About Us
              </Link>
            </>
          ) : null}

          {user ? (
            <>
              <Link to="/subscription-tier" className={`text-sm font-medium transition ${isActive("/subscription-tier") ? "text-[#0099FF]" : "text-white/95 hover:text-[#0099FF]"}`}>
                Membership
              </Link>
              <Link to="/about-us" className={`text-sm font-medium transition ${isActive("/about-us") ? "text-[#0099FF]" : "text-white/95 hover:text-[#0099FF]"}`}>
                About Us
              </Link>
            </>
          ) : null}
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(0,102,204,0.35)] text-white transition hover:text-[#0099FF]"
            onClick={() => setIsNotificationsOpen((prev) => !prev)}
            aria-haspopup="dialog"
            aria-expanded={isNotificationsOpen}
            aria-label="Notifications"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 1 5.454 1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.642 23.848 23.848 0 0 1 5.454-1.31m5.715 0a24.255 24.255 0 0 0-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            {Math.max(notificationCount, notifications.length) > 0 ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#0099FF]" aria-hidden="true" /> : null}
          </button>

          {user ? (
            <>
              <button
                type="button"
                className="hidden md:inline-flex items-center gap-2 rounded-full border border-[rgba(0,102,204,0.35)] bg-[rgba(0,0,30,0.75)] px-3 py-1.5 text-xs text-white"
                onClick={() => navigate("/profile")}
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#0066CC] [font-family:var(--font-label)] text-[11px] text-white">
                  {avatarLabel}
                </span>
                <span className="hidden [font-family:var(--font-label)] uppercase tracking-[0.12em] text-[#0099FF] sm:inline">{membershipTier}</span>
              </button>

              <Link
                to="/dashboard"
                className={`rounded-full px-4 py-2 text-xs font-bold text-white transition-all sm:px-5 sm:py-2.5 sm:text-sm ${
                  showActiveMemberActions
                    ? "border border-[#0066CC]/50 bg-gradient-to-r from-[#0066CC] to-[#0099FF] shadow-[0_0_20px_rgba(0,102,204,0.6)] hover:scale-105 hover:shadow-[0_0_25px_rgba(0,102,204,0.8)]"
                    : "bg-gradient-to-r from-[#0066CC] to-[#1c8ee6] shadow-md hover:shadow-lg"
                }`}
              >
                Dashboard
              </Link>
            </>
          ) : (
            <button
              type="button"
              className="rounded-[50px] bg-[#0066CC] px-5 py-2 fr-headline text-xs text-white"
              onClick={() => navigate("/login")}
            >
              Login
            </button>
          )}
        </div>
      </div>

      {!onOpenMobileNav && isMobileMenuOpen ? (
        <div className="border-t border-[#0066CC]/25 bg-[#000033]/95 px-4 pb-5 pt-4 sm:px-6 md:hidden">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-3">
            {!user ? (
              <>
                <Link
                  to="/"
                  className={`text-sm font-medium transition ${isActive("/") ? "text-[#0099FF]" : "text-white hover:text-[#0099FF]"}`}
                >
                  Home
                </Link>
                <Link
                  to="/subscription-tier"
                  className={`text-sm font-medium transition ${isActive("/subscription-tier") ? "text-[#0099FF]" : "text-white hover:text-[#0099FF]"}`}
                >
                  Membership
                </Link>
                <Link
                  to="/about-us"
                  className={`text-sm font-medium transition ${isActive("/about-us") ? "text-[#0099FF]" : "text-white hover:text-[#0099FF]"}`}
                >
                  About Us
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/profile"
                  className={`text-sm font-medium transition ${isActive("/profile") ? "text-[#0099FF]" : "text-white hover:text-[#0099FF]"}`}
                >
                  Profile
                </Link>
                <Link
                  to="/subscription-tier"
                  className={`text-sm font-medium transition ${isActive("/subscription-tier") ? "text-[#0099FF]" : "text-white hover:text-[#0099FF]"}`}
                >
                  Membership
                </Link>
                <Link
                  to="/about-us"
                  className={`text-sm font-medium transition ${isActive("/about-us") ? "text-[#0099FF]" : "text-white hover:text-[#0099FF]"}`}
                >
                  About Us
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}

      {isNotificationsOpen ? (
        <div ref={notificationPanelRef} className="fixed right-4 top-[78px] z-[100] w-[20rem] overflow-hidden rounded-2xl border border-[#0066CC]/25 bg-[#000033]/95 shadow-[0_20px_40px_rgba(0,0,51,0.5)] sm:right-6 lg:right-10">
          <div className="flex items-center justify-between border-b border-[#0066CC]/20 px-4 py-3">
            <p className="text-sm font-bold text-white">Notifications</p>
            <span className="rounded-full bg-[#0066CC]/20 px-2 py-1 text-xs font-semibold text-[#0099FF]">
              {notifications.length} new
            </span>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.map((notice) => (
              <li key={notice.id}>
                <button
                  type="button"
                  className="w-full border-b border-[#0066CC]/10 px-4 py-3 text-left transition hover:bg-[#0066CC]/12"
                >
                  <p className="text-sm font-semibold text-white">{notice.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#EEEEEE]/85">{notice.summary}</p>
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-[#0099FF]/80">{notice.time}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </header>
  );
}
