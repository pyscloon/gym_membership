import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { supabase } from "../lib/supabaseClient";
import {
  calculateMembershipStatus,
  formatDate,
  getFullName,
  splitFullName,
  type ProfileFormState,
  validateProfileForm,
} from "../lib/profileUtils";

type Transaction = {
  id: number;
  date: string;
  membership_type: string;
  amount: number;
  currency: string;
  status: "Success" | "Pending" | "Failed";
};

const membershipColor: Record<string, string> = {
  "Day Pass": "bg-gray-100 text-gray-600 border-gray-200",
  "1 Month": "bg-blue-50 text-blue-600 border-blue-200",
  "3 Months": "bg-indigo-50 text-indigo-600 border-indigo-200",
  "6 Months": "bg-violet-50 text-violet-600 border-violet-200",
  "1 Year": "bg-amber-50 text-amber-600 border-amber-200",
};

const transactionStatusColor: Record<string, string> = {
  Success: "bg-green-50 text-green-700 border-green-200",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Failed: "bg-red-50 text-red-700 border-red-200",
};

const transactionStatusIconColor: Record<string, string> = {
  Success: "text-green-600",
  Pending: "text-amber-600",
  Failed: "text-red-600",
};

const transactionStatusIconPath: Record<string, string> = {
  Success: "M5 13l4 4L19 7",
  Pending: "M12 6v6l4 2",
  Failed: "M6 18L18 6M6 6l12 12",
};

const initialProfile: ProfileFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  membershipStart: "",
  membershipEnd: "",
};

const fieldStyle =
  "mt-1.5 w-full rounded-xl border border-flexNavy/15 bg-white px-4 py-3 text-sm font-medium text-flexBlack outline-none transition-all duration-200 placeholder:text-flexNavy/35 focus:border-flexBlue focus:ring-4 focus:ring-flexBlue/10";

function buildEditableProfile(user: any, profileData: any, membershipData: any): ProfileFormState {
  const userMetadata = user.user_metadata ?? {};
  const splitName = splitFullName(profileData?.full_name ?? userMetadata.full_name ?? "");

  return {
    firstName: userMetadata.first_name ?? splitName.firstName,
    lastName: userMetadata.last_name ?? splitName.lastName,
    email: user.email ?? profileData?.email ?? "",
    phone: userMetadata.phone ?? user.phone ?? "",
    membershipStart: membershipData?.start_date ?? "",
    membershipEnd: membershipData?.renewal_date ?? "",
  };
}

function ProfileDetail({
  label,
  value,
  iconPath,
  isEditing,
  inputType,
  inputValue,
  onChange,
  error,
}: {
  label: string;
  value: string;
  iconPath: string;
  isEditing: boolean;
  inputType?: string;
  inputValue?: string;
  onChange?: (value: string) => void;
  error?: string;
}) {
  return (
    <div className="rounded-2xl border border-flexNavy/10 bg-white/95 p-4 shadow-md sm:p-5">
      <div className="flex items-start gap-3">
        <svg
          className="mt-1 h-6 w-6 shrink-0 text-flexNavy/45"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
        </svg>

        <div className="w-full">
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-flexNavy/55">{label}</p>
          {isEditing && inputType && onChange ? (
            <>
              <input
                type={inputType}
                value={inputValue ?? ""}
                onChange={(event) => onChange(event.target.value)}
                className={fieldStyle}
              />
              {error ? <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p> : null}
            </>
          ) : (
            <p className="mt-1.5 text-base font-semibold leading-tight text-flexBlack sm:text-lg">
              {value || "—"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileFormState>(initialProfile);
  const [form, setForm] = useState<ProfileFormState>(initialProfile);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchProfileAndTransactions = async () => {
      setLoading(true);
      if (!supabase) {
        navigate("/login");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const [profileRes, membershipRes, transactionRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("memberships").select("*").eq("user_id", user.id).single(),
        supabase.from("transactions").select("*").eq("user_id", user.id).order("date", { ascending: false })
      ]);

      if (profileRes.error) {
        setLoading(false);
        return;
      }

      if (transactionRes.data) {
        setTransactions(transactionRes.data);
      }

      const nextProfile = buildEditableProfile(user, profileRes.data, membershipRes.data);
      setProfile(nextProfile);
      setForm(nextProfile);
      setLoading(false);
    };

    fetchProfileAndTransactions();
  }, [navigate]);

  const displayName = getFullName(profile.firstName, profile.lastName) || "Unnamed User";
  const membershipStatus = calculateMembershipStatus(profile.membershipEnd);

  const handleEdit = () => {
    setForm({ ...profile });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setForm({ ...profile });
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!supabase || saving) return;
    setSaving(true);
    
    const errors = validateProfileForm(form);
    if (Object.keys(errors).length > 0) {
      setSaving(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const full_name = getFullName(form.firstName, form.lastName);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name, email: form.email })
      .eq("id", user.id);

    if (!profileError) {
      setProfile({ ...form });
      setIsEditing(false);
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    if (!supabase) {
      navigate("/login");
      return;
    }
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-white via-[#f0f7ff] to-[#e3f2fd] flex items-center justify-center">
        <p className="animate-pulse text-flexNavy font-medium">Loading Account...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#f7fbff] via-[#f0f7ff] to-[#e3f2fd]">
      <Header />
      <main className="relative mx-auto w-full max-w-7xl px-6 py-10 sm:px-10 lg:px-14">
        
        {/* Styled Header Section */}
        <section className="mb-8 overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-r from-[#021738] via-[#0b2f63] to-[#0f4e8c] px-8 py-10 text-white shadow-[0_30px_65px_rgba(4,23,56,0.35)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="order-2 sm:order-1">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-flexBlue">Account Settings</p>
              <h1 className="mt-2 text-3xl font-black sm:text-5xl">My Account</h1>
              <p className="mt-3 max-w-2xl text-white/85">
                Manage your personal details, contact information, and review your membership billing history.
              </p>
            </div>

            {/* Neon Status Pill */}
            <div className={`order-1 sm:order-2 inline-flex items-center gap-2.5 self-start rounded-full border px-4 py-2 text-xs font-bold tracking-tight transition-all sm:self-center ${
              membershipStatus.isActive 
              ? "border-[#b6f7c0]/30 bg-[#07152f]/40 shadow-[0_0_20px_rgba(57,255,20,0.15)] backdrop-blur-md" 
              : "bg-red-50 text-red-600 border-red-100"
            }`}>
              {membershipStatus.isActive && (
                <svg
                  className="h-4 w-4 text-[#39FF14]"
                  style={{
                    animation: "heartbeat 1.35s ease-in-out infinite",
                    filter: "drop-shadow(0 0 8px rgba(57,255,20,0.9))",
                  }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              <span 
                className="whitespace-nowrap uppercase"
                style={membershipStatus.isActive ? { color: "#39FF14" } : {}}
              >
                {membershipStatus.isActive ? "Active Membership" : "Membership Expired"}
              </span>
            </div>
          </div>
        </section>

        <div className="rounded-[2rem] border border-flexNavy/10 bg-white/95 p-5 shadow-[0_16px_38px_rgba(2,37,70,0.08)] backdrop-blur-sm sm:p-10">
          <style>{`
            @keyframes heartbeat {
              0%, 100% { transform: scale(1); }
              12% { transform: scale(1.15); }
              24% { transform: scale(1); }
              36% { transform: scale(1.2); }
              48% { transform: scale(1); }
            }
          `}</style>

          <section className="space-y-6">
            <div className="flex flex-col gap-4 border-b border-flexNavy/5 pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-bold text-flexBlack">Personal Information</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {!isEditing && (
                  <button onClick={handleEdit} className="inline-flex items-center gap-2 rounded-xl border border-flexNavy/20 px-5 py-2.5 text-sm font-semibold transition-all hover:bg-gray-50">
                    <svg className="h-4 w-4 text-flexBlue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.25 2.25 0 113.182 3.182L7.5 20.213 3 21l.787-4.5L16.862 4.487z" />
                    </svg>
                    Edit Profile
                  </button>
                )}
                <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-100">
                   <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                   </svg>
                   Logout
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-flexNavy/10 bg-white p-4 shadow-md py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-flexBlue text-xl font-bold text-white shadow-sm">
                {profile.firstName[0]}{profile.lastName[0]}
              </div>
              <div>
                <p className="text-xl font-bold text-flexBlack">{displayName}</p>
                <p className="text-sm text-flexNavy/60">{profile.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ProfileDetail label="First Name" value={profile.firstName} isEditing={isEditing} inputType="text" inputValue={form.firstName} onChange={(v) => setForm({...form, firstName: v})} iconPath="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              <ProfileDetail label="Last Name" value={profile.lastName} isEditing={isEditing} inputType="text" inputValue={form.lastName} onChange={(v) => setForm({...form, lastName: v})} iconPath="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              <ProfileDetail label="Email" value={profile.email} isEditing={false} iconPath="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              <ProfileDetail label="Phone" value={profile.phone} isEditing={isEditing} inputType="tel" inputValue={form.phone} onChange={(v) => setForm({...form, phone: v})} iconPath="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </div>

            {isEditing && (
              <div className="flex gap-3 pt-4">
                <button onClick={handleSave} disabled={saving} className="flex-1 bg-flexBlue text-white py-3 rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button onClick={handleCancel} className="px-8 py-3 border border-flexNavy/20 rounded-xl font-semibold transition-colors hover:bg-gray-50" >Cancel</button>
              </div>
            )}
          </section>

          {/* Transaction History Section */}
          <section className="mt-12 rounded-[1.75rem] border border-flexNavy/10 bg-white/90 p-4 shadow-md sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-flexNavy/5 pb-4">
              <div>
                <h3 className="text-xl font-bold text-flexBlack">Transaction History</h3>
                <p className="text-sm text-flexNavy/60">Recent membership payments</p>
              </div>
              <span className="rounded-full bg-flexNavy/5 px-3 py-1 text-xs font-semibold text-flexNavy/60">{transactions.length} records</span>
            </div>
            
            <div className="hidden overflow-x-auto rounded-xl border border-flexNavy/5 bg-white md:block">
              <table className="w-full text-left">
                <thead className="bg-[#f7fbff] text-xs font-bold uppercase text-flexNavy/40">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Membership Type</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-flexNavy/5">
                  {transactions.length > 0 ? (
                    transactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-flexBlack">{formatDate(txn.date)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${membershipColor[txn.membership_type] || "bg-gray-50"}`}>
                            {txn.membership_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-flexBlack">₱{txn.amount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${transactionStatusColor[txn.status] || "bg-gray-50"}`}>
                            <svg className={`h-3.5 w-3.5 ${transactionStatusIconColor[txn.status] || "text-flexNavy/40"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d={transactionStatusIconPath[txn.status]} />
                            </svg>
                            {txn.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={4} className="px-6 py-10 text-center text-flexNavy/40">No transaction records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 md:hidden">
              {transactions.length > 0 ? (
                transactions.map((txn) => (
                  <div key={txn.id} className="space-y-3 rounded-2xl border border-flexNavy/10 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-flexBlack">{formatDate(txn.date)}</p>
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${transactionStatusColor[txn.status] || "bg-gray-50"}`}>
                        <svg className={`h-3.5 w-3.5 ${transactionStatusIconColor[txn.status] || "text-flexNavy/40"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d={transactionStatusIconPath[txn.status]} />
                        </svg>
                        {txn.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-flexNavy/5 pt-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${membershipColor[txn.membership_type] || "bg-gray-50"}`}>
                        {txn.membership_type}
                      </span>
                      <div className="text-right">
                        <p className="text-sm font-bold text-flexBlack">₱{txn.amount.toLocaleString()}</p>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-flexNavy/45">{txn.currency}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center rounded-xl border border-flexNavy/5 bg-white text-flexNavy/40">No transaction records found.</div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}