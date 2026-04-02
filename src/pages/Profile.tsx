import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Layout from "../components/Layout";

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
  "Day Pass": "bg-gray-100 text-gray-600 border-gray-200",
  "1 Month":  "bg-blue-50 text-blue-600 border-blue-200",
  "3 Months": "bg-indigo-50 text-indigo-600 border-indigo-200",
  "6 Months": "bg-violet-50 text-violet-600 border-violet-200",
  "1 Year":   "bg-amber-50 text-amber-600 border-amber-200",
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
      if (!user) { navigate("/login"); return; }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError.message);
        setLoading(false);
        return;
      }

      const { data: membershipData } = await supabase
        .from("memberships")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileData) {
        const fetched = {
          name: profileData.full_name ?? "",
          email: user.email ?? "",
          membershipStart: membershipData?.start_date ?? "",
          membershipEnd: membershipData?.renewal_date ?? "",
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

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: form.name })
      .eq("id", user.id);

    if (profileError) { console.error("Error saving profile:", profileError.message); return; }

    const { error: membershipError } = await supabase
      .from("memberships")
      .update({
        start_date: form.membershipStart,
        renewal_date: form.membershipEnd,
      })
      .eq("user_id", user.id);

    if (membershipError) { console.error("Error saving membership:", membershipError.message); return; }

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
      year: "numeric", month: "long", day: "numeric",
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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <p className="text-flexNavy text-sm font-medium animate-pulse">Loading profile...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
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
    </Layout>
  );
}