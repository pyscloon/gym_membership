import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

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
          {/* New High-Detail Barbells Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-10 w-10 text-flexBlue"
            aria-hidden="true"
          >
            {/* Main Bar (Full width) */}
            <rect x="2" y="11" width="20" height="2" rx="1" />
            
            {/* Left Plates (Small to Large) */}
            <rect x="4" y="9" width="1.5" height="6" rx="0.5" />
            <rect x="6" y="8" width="1.5" height="8" rx="0.5" />
            <rect x="8" y="7" width="1.5" height="10" rx="0.5" />
            
            {/* Right Plates (Large to Small) */}
            <rect x="14.5" y="7" width="1.5" height="10" rx="0.5" />
            <rect x="16.5" y="8" width="1.5" height="8" rx="0.5" />
            <rect x="18.5" y="9" width="1.5" height="6" rx="0.5" />
          </svg>

          <span className="text-2xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-black to-flexBlue bg-clip-text text-transparent">Flex</span>
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
              </>
            ) : (
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
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}