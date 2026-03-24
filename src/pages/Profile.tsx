import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const menuItemBaseClass =
  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition";

type Transaction = {
  id: number;
  date: string;
  amount: number;
  membershipType: string;
};

const transactions: Transaction[] = [
  { id: 1, date: "2025-01-15", membershipType: "1 Year", amount: 5000 },
  { id: 2, date: "2024-01-10", membershipType: "6 Months", amount: 2800 },
  { id: 3, date: "2023-07-05", membershipType: "3 Months", amount: 1500 },
  { id: 4, date: "2023-03-20", membershipType: "1 Month", amount: 600 },
  { id: 5, date: "2023-02-14", membershipType: "Day Pass", amount: 150 },
];

const membershipColor: Record<string, string> = {
  "Day Pass":  "bg-gray-100 text-gray-600 border-gray-200",
  "1 Month":   "bg-blue-50 text-blue-600 border-blue-200",
  "3 Months":  "bg-indigo-50 text-indigo-600 border-indigo-200",
  "6 Months":  "bg-violet-50 text-violet-600 border-violet-200",
  "1 Year":    "bg-amber-50 text-amber-600 border-amber-200",
};

export default function Profile() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    membershipStart: "",
    membershipEnd: "",
  });

  const [form, setForm] = useState({ ...profile });

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      if (!supabase) { navigate("/login"); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error.message);
        setLoading(false);
        return;
      }

      if (data) {
        const fetched = {
          name: data.name ?? "",
          email: user.email ?? "",
          membershipStart: data.membership_start ?? "",
          membershipEnd: data.membership_end ?? "",
        };
        setProfile(fetched);
        setForm(fetched);
      }

      setLoading(false);
    };

    fetchProfile();
  }, []);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleSave = async () => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        name: form.name,
        membership_start: form.membershipStart,
        membership_end: form.membershipEnd,
      })
      .eq("id", user.id);

    if (error) {
      console.error("Error saving profile:", error.message);
      return;
    }

    setProfile({ ...form });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setForm({ ...profile });
    setIsEditing(false);
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isActive = profile.membershipEnd
    ? new Date(profile.membershipEnd) >= new Date()
    : false;

  const daysLeft = () => {
    if (!profile.membershipEnd) return 0;
    const diff = new Date(profile.membershipEnd).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handleLogout = async () => {
    if (!supabase) { navigate("/login"); return; }
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-flexNavy text-sm font-medium animate-pulse">Loading profile...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-flexBlack via-flexNavy to-flexBlue p-0">
      <section className="grid min-h-screen w-full overflow-hidden bg-flexWhite/95 shadow-2xl ring-1 ring-flexBlack/20 md:grid-cols-[260px_1fr]">

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
                `${menuItemBaseClass} ${isActive ? "bg-flexBlue text-flexWhite" : "bg-flexWhite/10 text-flexWhite hover:bg-flexWhite/20"}`
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
                `${menuItemBaseClass} ${isActive ? "bg-flexBlue text-flexWhite" : "bg-flexWhite/10 text-flexWhite hover:bg-flexWhite/20"}`
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

        <div className="bg-white p-5 sm:p-7 md:p-8 lg:p-10 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-flexNavy">My Account</p>
              <h2 className="mt-1 text-2xl font-semibold text-flexBlack sm:text-3xl">Profile</h2>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="hidden sm:flex items-center gap-2 border border-flexNavy/20 hover:border-flexBlue text-flexNavy hover:text-flexBlue text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828A2 2 0 0110 16.414H8v-2a2 2 0 01.586-1.414z" />
                </svg>
                Edit Profile
              </button>
            )}
          </div>

          <div className="flex items-center gap-5 rounded-2xl border border-flexNavy/15 bg-flexWhite/60 p-5 sm:p-6 mb-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-flexBlue/10 border-2 border-flexBlue/30 flex items-center justify-center shrink-0">
              <span className="text-xl sm:text-2xl font-black text-flexBlue">{getInitials(profile.name)}</span>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-flexBlack">{profile.name}</h3>
              <p className="text-flexNavy text-sm mt-0.5">{profile.email}</p>
              <span className={`inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full border ${isActive ? "bg-green-50 text-green-600 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                {isActive ? "● Active" : "● Expired"}
              </span>
            </div>
          </div>

          <div className={`rounded-2xl px-5 py-4 mb-5 flex items-center justify-between border ${isActive ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <div>
              <p className={`text-sm font-bold ${isActive ? "text-green-700" : "text-red-700"}`}>
                Membership {isActive ? "Active" : "Expired"}
              </p>
              <p className={`text-xs mt-0.5 ${isActive ? "text-green-600" : "text-red-500"}`}>
                {isActive ? `${daysLeft()} days remaining` : "Your membership has ended"}
              </p>
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${isActive ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300"}`}>
              {isActive ? "ACTIVE" : "EXPIRED"}
            </span>
          </div>

          <div className="rounded-2xl border border-flexNavy/15 bg-flexWhite/60 overflow-hidden mb-5">
            <div className="px-5 py-3.5 border-b border-flexNavy/10">
              <p className="text-xs font-bold tracking-[3px] text-flexNavy uppercase">Personal Info</p>
            </div>
            <div className="divide-y divide-flexNavy/10">
              <div className="px-5 py-4">
                <label className="text-xs font-bold tracking-widest text-flexNavy/60 uppercase block mb-1.5">Full Name</label>
                {isEditing ? (
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-flexNavy/20 focus:border-flexBlue rounded-xl px-4 py-2.5 text-sm text-flexBlack outline-none transition-colors bg-white" />
                ) : (
                  <p className="text-flexBlack text-sm font-medium">{profile.name}</p>
                )}
              </div>
              <div className="px-5 py-4">
                <label className="text-xs font-bold tracking-widest text-flexNavy/60 uppercase block mb-1.5">Email Address</label>
                {isEditing ? (
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-flexNavy/20 focus:border-flexBlue rounded-xl px-4 py-2.5 text-sm text-flexBlack outline-none transition-colors bg-white" />
                ) : (
                  <p className="text-flexBlack text-sm font-medium">{profile.email}</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-flexNavy/15 bg-flexWhite/60 overflow-hidden mb-5">
            <div className="px-5 py-3.5 border-b border-flexNavy/10">
              <p className="text-xs font-bold tracking-[3px] text-flexNavy uppercase">Membership Period</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-flexNavy/10">
              <div className="px-5 py-5">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-flexBlue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <label className="text-xs font-bold tracking-widest text-flexNavy/60 uppercase">Start Date</label>
                </div>
                {isEditing ? (
                  <input type="date" value={form.membershipStart} onChange={(e) => setForm({ ...form, membershipStart: e.target.value })}
                    className="w-full border border-flexNavy/20 focus:border-flexBlue rounded-xl px-4 py-2.5 text-sm text-flexBlack outline-none transition-colors bg-white" />
                ) : (
                  <p className="text-flexBlack text-sm font-semibold">{formatDate(profile.membershipStart)}</p>
                )}
              </div>
              <div className="px-5 py-5">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-flexBlue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <label className="text-xs font-bold tracking-widest text-flexNavy/60 uppercase">End Date</label>
                </div>
                {isEditing ? (
                  <input type="date" value={form.membershipEnd} onChange={(e) => setForm({ ...form, membershipEnd: e.target.value })}
                    className="w-full border border-flexNavy/20 focus:border-flexBlue rounded-xl px-4 py-2.5 text-sm text-flexBlack outline-none transition-colors bg-white" />
                ) : (
                  <p className="text-flexBlack text-sm font-semibold">{formatDate(profile.membershipEnd)}</p>
                )}
              </div>
            </div>
          </div>

          {isEditing ? (
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <button onClick={handleSave} className="flex-1 bg-flexBlue hover:bg-flexBlue/90 text-white font-bold py-3 rounded-xl text-sm tracking-wide transition-colors">
                Save Changes
              </button>
              <button onClick={handleCancel} className="flex-1 border border-flexNavy/20 hover:border-flexNavy/40 text-flexNavy font-semibold py-3 rounded-xl text-sm tracking-wide transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setIsEditing(true)} className="w-full sm:hidden bg-flexBlue hover:bg-flexBlue/90 text-white font-bold py-3 rounded-xl text-sm tracking-wide transition-colors mb-8">
              Edit Profile
            </button>
          )}

          <div className="rounded-2xl border border-flexNavy/15 bg-flexWhite/60 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-flexNavy/10 flex items-center justify-between">
              <p className="text-xs font-bold tracking-[3px] text-flexNavy uppercase">Transaction History</p>
              <span className="text-xs text-flexNavy/50 font-medium">{transactions.length} records</span>
            </div>
            <div className="hidden sm:grid grid-cols-3 px-5 py-2.5 bg-flexNavy/5 border-b border-flexNavy/10">
              <p className="text-xs font-bold tracking-widest text-flexNavy/50 uppercase">Date</p>
              <p className="text-xs font-bold tracking-widest text-flexNavy/50 uppercase">Membership Type</p>
              <p className="text-xs font-bold tracking-widest text-flexNavy/50 uppercase text-right">Amount</p>
            </div>
            <div className="divide-y divide-flexNavy/10">
              {transactions.map((txn) => (
                <div key={txn.id} className="px-5 py-4 flex flex-col sm:grid sm:grid-cols-3 sm:items-center gap-1.5 sm:gap-0">
                  <p className="text-sm text-flexBlack font-medium">{formatDate(txn.date)}</p>
                  <div>
                    <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full border ${membershipColor[txn.membershipType]}`}>
                      {txn.membershipType}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-flexBlack sm:text-right">₱{txn.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}