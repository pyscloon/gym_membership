import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import MembershipDashboard from "../components/MembershipDashboard";
import CrowdEstimationPanel from "../components/CrowdEstimationPanel";
import { useAuth } from "../hooks/useAuth";
import { fetchUserMembership } from "../lib/membershipService";
import type { Membership } from "../types/membership";

export default function Dashboard() {
  const notifications = ["Welcome to Flex Republic"];
  const unreadCount = notifications.length;
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { user } = useAuth();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [isLoadingMembership, setIsLoadingMembership] = useState(true);

  useEffect(() => {
    const loadMembership = async () => {
      if (!user) {
        setIsLoadingMembership(false);
        return;
      }

      try {
        const userMembership = await fetchUserMembership(user.id);
        setMembership(userMembership);
      } catch (error) {
        console.error("Error loading membership:", error);
        setMembership(null);
      } finally {
        setIsLoadingMembership(false);
      }
    };

    loadMembership();
  }, [user]);

  const isSubscribed = membership?.status === "active";

  return (
    <Layout>
      <div className="relative mb-6 inline-block">
        <button
          type="button"
          onClick={() => setIsNotificationsOpen((prev) => !prev)}
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-flexNavy/20 bg-flexWhite text-flexNavy transition hover:bg-flexBlue hover:text-white"
          aria-label="Open notifications"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <path fillRule="evenodd" d="M12 2.25a6 6 0 0 0-6 6v2.156c0 1.028-.386 2.018-1.08 2.772L3.34 14.76a.75.75 0 0 0 .53 1.28h16.26a.75.75 0 0 0 .53-1.28l-1.58-1.582A3.75 3.75 0 0 1 18 10.406V8.25a6 6 0 0 0-6-6ZM8.25 18.75a3.75 3.75 0 0 0 7.5 0h-7.5Z" clipRule="evenodd" />
          </svg>
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white">
            {unreadCount}
          </span>
        </button>

        {isNotificationsOpen && (
          <div className="absolute left-0 z-10 mt-2 w-72 rounded-xl border border-flexNavy/20 bg-white p-3 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-flexNavy">
              Notifications
            </p>
            <ul className="mt-2 space-y-2">
              {notifications.map((message) => (
                <li key={message} className="rounded-lg bg-flexWhite px-3 py-2 text-sm text-flexBlack">
                  {message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <header className="flex flex-wrap items-center justify-between gap-4">

        <p className="inline-flex rounded-full bg-flexBlue/10 px-3 py-1 text-sm font-semibold uppercase tracking-[0.14em] text-flexNavy ring-1 ring-flexBlue/20">
            Dashboard
        </p>

        <div>
          <h2 className="mt-1 text-2xl font-semibold text-flexBlack sm:text-3xl">
            Home Dashboard
          </h2>
        </div>

      <div className="rounded-xl border border-flexNavy/20 bg-flexWhite px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-flexNavy">Streak Counter</p>
          <p className="text-2xl font-bold text-flexBlack">🔥 0</p>
        </div>
        
      </header>

      <section className="mt-6 rounded-2xl border border-flexNavy/15 bg-flexWhite/70 p-5 sm:p-6">
        <p className="text-base text-flexBlack sm:text-lg">
          Welcome,
          <span className="ml-2 font-semibold text-blue-600">RED</span>
        </p>
        <p className="mt-1 text-sm text-flexNavy">
          Here is your current membership overview.
        </p>
      </section>

      <section className="mt-6">
        <MembershipDashboard />
      </section>

      {isSubscribed && !isLoadingMembership && (
        <section className="mt-6">
          <CrowdEstimationPanel />
        </section>
      )}
    </Layout>
  );
}