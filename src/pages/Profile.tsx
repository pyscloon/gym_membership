import { NavLink } from "react-router-dom";

const menuItemBaseClass =
  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition";

export default function Profile() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-flexBlack via-flexNavy to-flexBlue p-0">
      <section className="grid min-h-screen w-full overflow-hidden bg-flexWhite/95 shadow-2xl ring-1 ring-flexBlack/20 md:grid-cols-[260px_1fr]">
        <aside className="border-b border-flexNavy/15 bg-flexBlack p-4 text-flexWhite md:border-b-0 md:border-r md:border-flexNavy/20 md:p-5">
          <div className="inline-flex items-center rounded-xl bg-flexWhite px-3 py-2 shadow-md ring-1 ring-flexNavy/20">
            <h1 className="text-xl font-black italic tracking-wide sm:text-2xl">
              <span className="text-black">Flex</span>{" "}
              <span className="text-flexBlue">Republic</span>
            </h1>
          </div>

          <nav className="mt-5 flex gap-2 md:flex-col">
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden="true"
              >
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2.25a5.25 5.25 0 1 0 0 10.5 5.25 5.25 0 0 0 0-10.5ZM8.25 7.5a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0 .75.75 0 0 1-.675.87.75.75 0 0 1-.87-.675 6 6 0 0 0-11.908 0 .75.75 0 0 1-1.545-.195Z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Profile</span>
            </NavLink>
          </nav>
        </aside>

        <div className="bg-white p-5 sm:p-7 md:p-8 lg:p-10">
          <p className="text-sm uppercase tracking-[0.2em] text-flexNavy">Profile</p>
          <h2 className="mt-1 text-2xl font-semibold text-flexBlack sm:text-3xl">
            Profile Page
          </h2>

          <section className="mt-6 rounded-2xl border border-dashed border-flexNavy/30 bg-flexWhite/60 p-6">
            <p className="text-sm text-flexNavy">
              This page is intentionally left blank for now.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
