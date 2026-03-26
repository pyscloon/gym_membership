import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const menuItemBaseClass =
  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition";
 
export default function Sidebar() {
  const navigate = useNavigate();
 
  const handleLogout = async () => {
    if (!supabase) { navigate("/login"); return; }
    await supabase.auth.signOut();
    navigate("/login");
  };
 
  return (
    <aside className="border-b border-flexNavy/15 bg-flexBlack p-4 text-flexWhite md:border-b-0 md:border-r md:border-flexNavy/20 md:p-5 md:flex md:flex-col">
      <div className="inline-flex items-center rounded-xl bg-flexWhite px-3 py-2 shadow-md ring-1 ring-flexNavy/20">
        <h1 className="text-xl font-black italic tracking-wide sm:text-2xl">
          <span className="text-black">Flex</span>{" "}
          <span className="text-flexBlue">Republic</span>
        </h1>
      </div>
 
      <nav className="mt-5 flex gap-2 md:flex-col md:flex-1">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `${menuItemBaseClass} ${
              isActive
                ? "bg-flexBlue text-flexWhite"
                : "bg-flexWhite/10 text-flexWhite hover:bg-flexWhite/20"
            }`
          }
          end
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <path d="M12 3.8 3.25 11a.75.75 0 0 0 .95 1.16L5.5 11.1V18a3 3 0 0 0 3 3H10a.75.75 0 0 0 .75-.75v-4.5a.75.75 0 0 1 .75-.75h1a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 0 .75.75h1.5a3 3 0 0 0 3-3v-6.9l1.3 1.06a.75.75 0 1 0 .95-1.16L12 3.8Z" />
          </svg>
          <span>Dashboard</span>
        </NavLink>
 
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `${menuItemBaseClass} ${
              isActive
                ? "bg-flexBlue text-flexWhite"
                : "bg-flexWhite/10 text-flexWhite hover:bg-flexWhite/20"
            }`
          }
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <path fillRule="evenodd" d="M12 2.25a5.25 5.25 0 1 0 0 10.5 5.25 5.25 0 0 0 0-10.5ZM8.25 7.5a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0 .75.75 0 0 1-.675.87.75.75 0 0 1-.87-.675 6 6 0 0 0-11.908 0 .75.75 0 0 1-1.545-.195Z" clipRule="evenodd" />
          </svg>
          <span>Profile</span>
        </NavLink>

        <div className="md:mt-auto md:pt-4 md:border-t md:border-flexWhite/10">
          <button
            onClick={handleLogout}
            className={`${menuItemBaseClass} w-full bg-flexWhite/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
              <path fillRule="evenodd" d="M7.5 3.75A1.5 1.5 0 0 0 6 5.25v13.5a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15a.75.75 0 0 1 1.5 0v3.75a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V5.25a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3V9A.75.75 0 0 1 15 9V5.25a1.5 1.5 0 0 0-1.5-1.5h-6Zm10.72 4.72a.75.75 0 0 1 1.06 0l3 3a.75.75 0 0 1 0 1.06l-3 3a.75.75 0 1 1-1.06-1.06l1.72-1.72H9a.75.75 0 0 1 0-1.5h10.94l-1.72-1.72a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
 