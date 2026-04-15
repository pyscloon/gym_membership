import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type AppSidebarProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/profile", label: "Profile" },
  { to: "/membership", label: "Membership" },
  { to: "/checkin", label: "Check-In" },
  { to: "/settings", label: "Settings" },
];

export default function AppSidebar({ mobile = false, onNavigate }: AppSidebarProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate("/login");
    onNavigate?.();
  };

  return (
    <aside className={`h-full bg-[#000033] p-5 text-white ${mobile ? "w-[280px]" : "w-full"}`} style={{ boxShadow: "inset -1px 0 0 rgba(0,102,204,0.2)" }}>
      <p className="fr-label text-[10px] text-[rgba(0,153,255,0.5)]">Portal Navigation</p>
      <nav className="mt-6 flex flex-col gap-1" aria-label="Sidebar navigation">
        {links.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group relative overflow-hidden rounded-lg px-4 py-3 text-sm [font-family:var(--font-body)] [font-weight:500] transition ${
                isActive
                  ? "border-l-[3px] border-l-[#0066CC] bg-[rgba(0,102,204,0.15)] text-white"
                  : "border-l-[3px] border-l-transparent text-white hover:text-[#0099FF]"
              }`
            }
          >
            <span
              className="pointer-events-none absolute inset-y-0 left-0 w-[3px] origin-left scale-x-0 bg-[#0099FF] transition-transform duration-200 group-hover:scale-x-100"
              aria-hidden="true"
            />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-8 border-t border-[rgba(0,102,204,0.25)] pt-5">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-[50px] border border-[rgba(255,255,255,0.3)] px-4 py-2 text-left fr-headline text-xs text-white transition hover:border-[#0099FF] hover:text-[#0099FF]"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
