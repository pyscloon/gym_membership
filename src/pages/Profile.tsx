import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { supabase } from "../lib/supabaseClient";
import {
  calculateMembershipStatus,
  getFullName,
  splitFullName,
  type ProfileFormState,
  validateProfileForm,
} from "../lib/profileUtils";
import MemberTransactionHistory, {type MemberTransaction } from "../components/MemberTransactionHistory";

type Transaction = {
  id: number;
  created_at: string;
  membership_type: string;
  amount: number;
  currency: string;
  status: "Success" | "Pending" | "Failed";
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
  const [transactions, setTransactions] = useState<MemberTransaction[]>([]);

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
        supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      ]);

      if (profileRes.error) {
        setLoading(false);
        return;
      }

      if (transactionRes.data) {
        const mappedTransactions: MemberTransaction[] =
          transactionRes.data.map((txn: Transaction) => ({
            id: txn.id.toString(),
            date: txn.created_at,
            membership_type: txn.membership_type,
            amount: txn.amount,
            currency: txn.currency,
            status: txn.status.toLowerCase(), 
          }));

        setTransactions(mappedTransactions);
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
          <MemberTransactionHistory transactions={transactions} />
        </div>
      </main>
    </div>
  );
}