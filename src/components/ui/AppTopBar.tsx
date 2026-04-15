import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks";
import { useAppUi } from "../../context/AppUiContext";
import { supabase } from "../../lib/supabaseClient";

type AppTopBarProps = {
  onOpenMobileNav?: () => void;
  fixed?: boolean;
};

export default function AppTopBar({ fixed = true }: AppTopBarProps) {
  const { user } = useAuth();
  const { avatarLabel } = useAppUi();
  const navigate = useNavigate();
  const location = useLocation();
  const [isActiveMember, setIsActiveMember] = useState<boolean | null>(null);

  useEffect(() => {
    const loadMembership = async () => {
      if (!user || !supabase) { setIsActiveMember(false); return; }
      const { data } = await supabase.from("memberships").select("status").eq("user_id", user.id).single();
      setIsActiveMember(data?.status === "active");
    };
    void loadMembership();
  }, [user]);

  const isActive = (path: string) => location.pathname === path;
  const showActiveMemberActions = user && isActiveMember === true;
  const headerPosition = fixed ? "fixed left-0 right-0 top-0" : "sticky top-0";

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