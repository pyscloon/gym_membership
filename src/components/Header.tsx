import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationPanelRef = useRef<HTMLLIElement>(null);
  const location = useLocation();
  const { user } = useAuth();

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
      if (
        notificationPanelRef.current &&
        !notificationPanelRef.current.contains(event.target as Node)
      ) {
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

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { label: "Home", to: "/", showFor: "unauthenticated" },
    { label: "Subscription Tier", to: "/subscription-tier" },
    { label: "About Us", to: "/about-us" },
  ];

  return (
    <header className="w-full border-b-2 border-flexBlue/20 bg-gradient-to-r from-white via-white to-[#f8faff] px-6 py-4 shadow-sm sm:px-10 lg:px-14">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4">
        <Link 
          to={user ? "/dashboard" : "/"} 
          className="inline-flex items-center gap-3 text-flexBlack transition hover:scale-105" 
          aria-label="Flex Republic home"
        >
          {/* Logo SVG with Gradient */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-10 w-10 text-flexBlue"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="dumbbell-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="black" />
                <stop offset="100%" stopColor="currentColor" />
              </linearGradient>
            </defs>
            <g fill="url(#dumbbell-gradient)">
              <rect x="2" y="11" width="20" height="2" rx="1" />
              <rect x="4" y="9" width="1.5" height="6" rx="0.5" />
              <rect x="6" y="8" width="1.5" height="8" rx="0.5" />
              <rect x="8" y="7" width="1.5" height="10" rx="0.5" />
              <rect x="14.5" y="7" width="1.5" height="10" rx="0.5" />
              <rect x="16.5" y="8" width="1.5" height="8" rx="0.5" />
              <rect x="18.5" y="9" width="1.5" height="6" rx="0.5" />
            </g>
          </svg>

          {/* Solid Color Text */}
          <span className="text-2xl font-black tracking-tight">
            <span className="text-black">Flex</span>
            <span className="text-flexBlue"> Republic</span>
          </span>
        </Link>

        <button
          type="button"
          className="inline-flex rounded-lg border border-flexBlue/30 bg-flexBlue/5 px-3 py-2 text-sm font-semibold text-flexBlue md:hidden hover:bg-flexBlue/10 transition"
          onClick={() => setIsMenuOpen((prev) => !prev)}
        >
          ☰
        </button>

        <nav className={`${isMenuOpen ? "block" : "hidden"} w-full md:block md:w-auto`} aria-label="Main navigation">
          <ul className="flex flex-col gap-1 pt-3 md:flex-row md:items-center md:gap-1 md:pt-0">
            {navItems.map((item) => {
              if (item.showFor === "unauthenticated" && user) {
                return null;
              }
              return (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className={`inline-flex rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                      isActive(item.to)
                        ? "bg-flexBlue/15 text-flexBlue"
                        : "text-flexNavy hover:bg-flexBlue/10 hover:text-flexBlue"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}

            {user ? (
              <>
                <li className="md:ml-2">
                  <Link
                    to="/dashboard"
                    className={`inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                      isActive("/dashboard")
                        ? "bg-flexBlue text-white shadow-lg"
                        : "bg-gradient-to-r from-flexBlue to-[#1c8ee6] text-white shadow-md hover:shadow-lg hover:scale-105"
                    }`}
                  >
                    Dashboard
                  </Link>
                </li>
                <li className="md:ml-1">
                  <Link
                    to="/profile"
                    className={`inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                      isActive("/profile")
                        ? "bg-flexNavy text-white shadow-lg"
                        : "text-flexNavy bg-flexNavy/10 hover:bg-flexNavy/20"
                    }`}
                  >
                    Profile
                  </Link>
                </li>
                <li className="relative md:ml-3" ref={notificationPanelRef}>
                  <button
                    type="button"
                    onClick={() => setIsNotificationsOpen((prev) => !prev)}
                    className="relative inline-flex items-center justify-center p-2 text-flexBlue transition hover:text-flexBlue/70 focus-visible:outline-none"
                    aria-haspopup="dialog"
                    aria-expanded={isNotificationsOpen}
                    aria-label="Open notifications"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-6 w-6"
                    >
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>

                    {notifications.length > 0 && (
                      <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                    )}
                  </button>

                  {isNotificationsOpen && (
                    <div className="absolute right-0 z-50 mt-4 w-[20rem] overflow-hidden rounded-2xl border border-flexBlue/20 bg-white shadow-[0_20px_40px_rgba(0,0,51,0.2)] md:w-[23rem]">
                      <div className="flex items-center justify-between border-b border-flexBlue/10 bg-gradient-to-r from-[#f7fbff] to-white px-4 py-3">
                        <p className="text-sm font-bold text-[#000033]">Notifications</p>
                        <span className="rounded-full bg-flexBlue/10 px-2 py-1 text-xs font-semibold text-flexBlue">
                          {notifications.length} new
                        </span>
                      </div>
                      <ul className="max-h-80 overflow-y-auto">
                        {notifications.map((notice) => (
                          <li key={notice.id}>
                            <button
                              type="button"
                              className="w-full border-b border-flexBlue/8 px-4 py-3 text-left transition hover:bg-[#f7fbff]"
                            >
                              <p className="text-sm font-semibold text-[#000033]">{notice.title}</p>
                              <p className="mt-1 text-xs leading-relaxed text-flexNavy/80">{notice.summary}</p>
                              <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-flexBlue/70">{notice.time}</p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              </>
            ) : (
              <>
                {/* LOGIN BUTTON FIRST */}
                <li className="md:ml-2">
                  <Link
                    to="/login"
                    className={`inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                      isActive("/login")
                        ? "bg-flexBlue text-white shadow-lg"
                        : "bg-gradient-to-r from-flexBlue to-[#1c8ee6] text-white shadow-md hover:shadow-lg hover:scale-105"
                    }`}
                  >
                    Login
                  </Link>
                </li>
                
                {/* NOTIFICATION ICON TO THE RIGHT & SIMPLIFIED */}
                <li className="relative md:ml-3" ref={notificationPanelRef}>
                  <button
                    type="button"
                    onClick={() => setIsNotificationsOpen((prev) => !prev)}
                    className="relative inline-flex items-center justify-center p-2 text-flexBlue transition hover:text-flexBlue/70 focus-visible:outline-none"
                    aria-haspopup="dialog"
                    aria-expanded={isNotificationsOpen}
                    aria-label="Open notifications"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-6 w-6"
                    >
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    
                    {notifications.length > 0 && (
                      <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                    )}
                  </button>

                  {isNotificationsOpen && (
                    <div className="absolute right-0 z-50 mt-4 w-[20rem] overflow-hidden rounded-2xl border border-flexBlue/20 bg-white shadow-[0_20px_40px_rgba(0,0,51,0.2)] md:w-[23rem]">
                      <div className="flex items-center justify-between border-b border-flexBlue/10 bg-gradient-to-r from-[#f7fbff] to-white px-4 py-3">
                        <p className="text-sm font-bold text-[#000033]">Notifications</p>
                        <span className="rounded-full bg-flexBlue/10 px-2 py-1 text-xs font-semibold text-flexBlue">
                          {notifications.length} new
                        </span>
                      </div>
                      <ul className="max-h-80 overflow-y-auto">
                        {notifications.map((notice) => (
                          <li key={notice.id}>
                            <button
                              type="button"
                              className="w-full border-b border-flexBlue/8 px-4 py-3 text-left transition hover:bg-[#f7fbff]"
                            >
                              <p className="text-sm font-semibold text-[#000033]">{notice.title}</p>
                              <p className="mt-1 text-xs leading-relaxed text-flexNavy/80">{notice.summary}</p>
                              <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-flexBlue/70">{notice.time}</p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}