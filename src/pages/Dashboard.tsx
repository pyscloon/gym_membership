import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import MembershipDashboard from "../components/MembershipDashboard";

const menuItemBaseClass =
    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition";

export default function Dashboard() {
    const navigate = useNavigate();
    const notifications = ["Welcome to Flex Republic"];
    const unreadCount = notifications.length;
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    const handleLogout = async () => {
        if (supabase) {
            await supabase.auth.signOut();
        }
        navigate("/login");
    };

    return (
        <main
            className="min-h-screen p-0"
            style={{
                backgroundImage:
                    "linear-gradient(rgba(0, 0, 0, 0.74), rgba(0, 51, 102, 0.74)), url('/flex-republic-bg.jpg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
            }}
        >
            <section className="grid min-h-screen w-full overflow-hidden bg-flexWhite/92 shadow-2xl ring-1 ring-flexBlack/20 md:grid-cols-[260px_1fr]">
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

                        <button
                            onClick={handleLogout}
                            className={`${menuItemBaseClass} w-full mt-auto justify-items-start bg-flexWhite/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors`}
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
                                    d="M7.5 3.75A1.5 1.5 0 0 0 6 5.25v13.5a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15a.75.75 0 0 1 1.5 0v3.75a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V5.25a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3V9A.75.75 0 0 1 15 9V5.25a1.5 1.5 0 0 0-1.5-1.5h-6Zm10.72 4.72a.75.75 0 0 1 1.06 0l3 3a.75.75 0 0 1 0 1.06l-3 3a.75.75 0 1 1-1.06-1.06l1.72-1.72H9a.75.75 0 0 1 0-1.5h10.94l-1.72-1.72a.75.75 0 0 1 0-1.06Z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <span>Logout</span>
                        </button>
                    </nav>
                </aside>

                <div className="relative bg-white p-5 sm:p-7 md:p-8 lg:p-10">
                    <div className="relative mb-6 inline-block">
                        <button
                            type="button"
                            onClick={() => setIsNotificationsOpen((prev) => !prev)}
                            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-flexNavy/20 bg-flexWhite text-flexNavy transition hover:bg-flexBlue hover:text-white"
                            aria-label="Open notifications"
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
                                    d="M12 2.25a6 6 0 0 0-6 6v2.156c0 1.028-.386 2.018-1.08 2.772L3.34 14.76a.75.75 0 0 0 .53 1.28h16.26a.75.75 0 0 0 .53-1.28l-1.58-1.582A3.75 3.75 0 0 1 18 10.406V8.25a6 6 0 0 0-6-6ZM8.25 18.75a3.75 3.75 0 0 0 7.5 0h-7.5Z"
                                    clipRule="evenodd"
                                />
                            </svg>

                            <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white">
                                {unreadCount}
                            </span>
                        </button>

                        {isNotificationsOpen ? (
                            <div className="absolute left-0 z-10 mt-2 w-72 rounded-xl border border-flexNavy/20 bg-white p-3 shadow-lg">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-flexNavy">
                                    Notifications
                                </p>
                                <ul className="mt-2 space-y-2">
                                    {notifications.map((message) => (
                                        <li
                                            key={message}
                                            className="rounded-lg bg-flexWhite px-3 py-2 text-sm text-flexBlack"
                                        >
                                            {message}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                    </div>

                    <header className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="inline-flex rounded-full bg-flexBlue/10 px-3 py-1 text-sm font-semibold uppercase tracking-[0.14em] text-flexNavy ring-1 ring-flexBlue/20">
                                Dashboard
                            </p>
                            <h2 className="mt-1 text-2xl font-semibold text-flexBlack sm:text-3xl">
                                Home Dashboard
                            </h2>
                        </div>

                        <div className="rounded-xl border border-flexNavy/20 bg-flexWhite px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-flexNavy">
                                Streak Counter
                            </p>
                            <p className="text-2xl font-bold text-flexBlack">🔥 0</p>
                        </div>
                    </header>

                    <section className="mt-6 rounded-2xl border border-flexNavy/15 bg-flexWhite/70 p-5 sm:p-6">
                        <p className="text-base text-flexBlack sm:text-lg">
                            Welcome back,
                            <span className="ml-2 font-semibold text-blue-600">red</span>
                        </p>
                        <p className="mt-1 text-sm text-flexNavy">
                            Here is your current membership overview.
                        </p>
                    </section>

                    <section className="mt-6">
                        <MembershipDashboard />
                    </section>
                </div>
            </section>
        </main>
    );
}