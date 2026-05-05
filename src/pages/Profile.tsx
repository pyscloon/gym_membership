import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppTopBar from "../components/ui/AppTopBar";
import { useAppUi } from "../context/AppUiContext";
import { supabase } from "../lib/supabaseClient";
import {
  calculateMembershipStatus,
  splitFullName,
  type ProfileFormState,
} from "../lib/profileUtils";
import { type MemberTransaction } from "../components/MemberTransactionHistory";

const PLAN_THEMES: Record<string, { gradient: string; serial: string; accent: string; colors: string[]; motto: string }> = {
  "walk-in": { gradient: "linear-gradient(135deg, #1d4ed8 0%, #001a4d 100%)", serial: "FLX-WKN", accent: "#60a5fa", colors: ["#1d4ed8", "#001a4d"], motto: "Daily Grind // Build the Foundation" },
  monthly: { gradient: "linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)", serial: "FLX-MTH", accent: "#3b82f6", colors: ["#1e40af", "#1e3a8a"], motto: "Monthly Warrior // No Excuses" },
  "semi-yearly": { gradient: "linear-gradient(135deg, #1e3a8a 0%, #172554 100%)", serial: "FLX-SMY", accent: "#2563eb", colors: ["#1e3a8a", "#172554"], motto: "Core Committed // Trust the Process" },
  yearly: { gradient: "linear-gradient(135deg, #172554 0%, #020617 100%)", serial: "FLX-YRL", accent: "#1d4ed8", colors: ["#172554", "#020617"], motto: "Elite Titan // Dedication is Forever" },
  default: { gradient: "linear-gradient(135deg, #0f172a 0%, #020617 100%)", serial: "FLX-GUEST", accent: "#94a3b8", colors: ["#0f172a", "#020617"], motto: "Guest Pass // Fuel Your Curiosity" },
};

export default function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [userTier, setUserTier] = useState<string>("default");

  const [profile, setProfile] = useState<ProfileFormState>({
    firstName: "", lastName: "", email: "", phone: "", membershipStart: "", membershipEnd: "",
  });
  const [form, setForm] = useState<ProfileFormState>(profile);
  const [transactions, setTransactions] = useState<MemberTransaction[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const { setAvatarUrl: setHeaderAvatarUrl } = useAppUi();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  useEffect(() => {
    const fetchProfileAndData = async () => {
      setLoading(true);
      if (!supabase) { navigate("/login"); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const [profileRes, membershipRes, transactionRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").eq("id", user.id).single(),
        supabase.from("memberships").select("id, user_id, tier, status, start_date, renewal_date").eq("user_id", user.id).maybeSingle(),
        supabase.from("transactions").select("id, created_at, amount, status").eq("user_id", user.id).order("created_at", { ascending: false }).limit(6),
      ]);

      if (membershipRes.data) setUserTier(membershipRes.data.tier || "monthly");

      if (transactionRes.data) {
        setTransactions(transactionRes.data.map((txn: any) => ({
          id: txn.id.toString(), date: formatDate(txn.created_at), amount: txn.amount, status: txn.status,
        })));
      }

      const userMetadata = user.user_metadata ?? {};
      const splitName = splitFullName(profileRes.data?.full_name ?? userMetadata.full_name ?? "");
      const data = {
        firstName: profileRes.data?.first_name ?? userMetadata.first_name ?? splitName.firstName,
        lastName: profileRes.data?.last_name ?? userMetadata.last_name ?? splitName.lastName,
        email: user.email ?? profileRes.data?.email ?? "",
        phone: profileRes.data?.phone ?? userMetadata.phone ?? user.phone ?? "",
        membershipStart: formatDate(membershipRes.data?.start_date),
        membershipEnd: formatDate(membershipRes.data?.renewal_date),
      };
      if (profileRes.data?.full_name) {
      }
      setProfile(data);
      setForm(data);
      // avatar_url is not in the schema
      // if (profileRes.data?.avatar_url) setAvatarUrl(profileRes.data.avatar_url);
      setLoading(false);
    };
    fetchProfileAndData();
  }, [navigate]);

  const handleSave = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");
      const { error } = await supabase.from("profiles").update({
        full_name: `${form.firstName} ${form.lastName}`,
      }).eq("id", user.id);
      if (error) throw error;
      setProfile(form);
      setIsEditing(false);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setForm(profile);
    setIsEditing(false);
  };

  const handleFlip = (e?: React.MouseEvent) => {
    // prevent flip when clicking inside avatar area or while editing
    if (e) {
      let element: Element | null = null;
      if (e.target instanceof Element) {
        element = e.target;
      } else if (e.target instanceof Node) {
        element = e.target.parentElement;
      }
      if (element && element.closest('.avatar-container')) return;
    }
    if (!isEditing) setIsFlipped(!isFlipped);
  };

  const membershipStatus = calculateMembershipStatus(profile.membershipEnd);
  const theme = PLAN_THEMES[userTier] || PLAN_THEMES.default;

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // show a fast local preview while upload happens
    try {
      const objectUrl = URL.createObjectURL(file);
      setAvatarUrl(objectUrl);
      setHeaderAvatarUrl(objectUrl);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('flex-republic-assets').upload(filePath, file, { upsert: true });
      if (uploadError) {
        console.error('Upload failed', uploadError);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from('flex-republic-assets').getPublicUrl(filePath);
      // update preview to public url
      setAvatarUrl(publicUrl);
      setHeaderAvatarUrl(publicUrl);
      // revoke local object url
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('Avatar upload error', err);
    }
  };

  // determine subset of transactions to show
  const displayedTransactions = showAllTransactions ? transactions : transactions.slice(0, 3);

  if (loading) return (
    <div className="min-h-screen bg-[#00001a] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent animate-spin rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#00001a] text-white pb-12 overflow-x-hidden">
      <AppTopBar />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;800&family=Barlow:wght@400;700;800&family=Space+Mono&display=swap');
        .avatar-container:hover .upload-overlay { opacity: 1 !important; }
        .grid-bg {
          background-image: linear-gradient(rgba(0,102,204,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,102,204,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        /* Mobile Scaling for the card */
        @media (max-width: 480px) {
          .id-card-container {
            transform: scale(0.85);
            margin-top: -20px;
          }
        }
        @media (max-width: 380px) {
          .id-card-container {
            transform: scale(0.75);
            margin-top: -40px;
          }
        }
      `}</style>

      <div className="fixed inset-0 grid-bg pointer-events-none z-0" />

      <main className="relative z-10 mx-auto max-w-2xl px-4 pt-24 sm:pt-28 flex flex-col items-center">

        {/* ── MEMBERSHIP CARD CONTAINER ── */}
        <div
          className="id-card-container w-full select-none cursor-pointer transition-transform duration-300"
          style={{ perspective: "2500px", height: "230px" }}
          onClick={handleFlip}
        >
          <div
            className="relative w-full h-full"
            style={{
              transformStyle: "preserve-3d",
              transition: "transform 0.85s cubic-bezier(0.34, 1.56, 0.64, 1)",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            {/* FRONT */}
            <div
              className="absolute inset-0 rounded-[22px] overflow-hidden"
              style={{
                backfaceVisibility: "hidden",
                background: theme.gradient,
                border: "1px solid rgba(255, 255, 255, 0.15)",
                boxShadow: `0 32px 80px rgba(0,0,0,0.6), inset 0 0 20px rgba(255,255,255,0.05)`,
                zIndex: isFlipped ? 0 : 2,
              }}
            >
              <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "16px 16px" }} />

              <div className="relative z-10 h-full flex flex-col justify-between p-5 sm:p-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div
                      onClick={handleAvatarClick}
                      className="avatar-container flex-shrink-0"
                      style={{
                        width: "55px", height: "65px", borderRadius: "10px",
                        background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        overflow: "hidden", position: "relative"
                      }}>
                      {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> :
                        <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: "8px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>
                          Upload
                        </span>
                      }
                      <div className="upload-overlay absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 transition-opacity backdrop-blur-sm">
                        <p className="text-[7px] uppercase font-mono text-white tracking-widest">{avatarUrl ? "Change" : "Select"}</p>
                      </div>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

                    <div className="min-w-0">
                      <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "8px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Flex Republic</p>
                      {isEditing ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          <input value={form.firstName} onClick={(e) => e.stopPropagation()} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="bg-[#1e293b] border border-white/20 rounded px-2 py-1 text-xs font-bold w-20 outline-none text-white" />
                          <input value={form.lastName} onClick={(e) => e.stopPropagation()} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="bg-[#1e293b] border border-white/20 rounded px-2 py-1 text-xs font-bold w-20 outline-none" style={{ color: theme.accent }} />
                        </div>
                      ) : (
                        <p className="truncate" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "1.5rem", textTransform: "uppercase", color: "#fff", lineHeight: 1, marginTop: "2px" }}>
                          {profile.firstName} <span style={{ color: theme.accent }}>{profile.lastName}</span>
                        </p>
                      )}
                      <div className="mt-1 font-mono text-[8px] tracking-wider truncate">
                        <p className="text-white/60 lowercase truncate max-w-[140px] sm:max-w-none">{profile.email}</p>
                        {isEditing ? (
                          <input value={form.phone} onClick={(e) => e.stopPropagation()} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-[#1e293b] border border-white/20 rounded px-2 py-0.5 text-[8px] w-28 mt-1.5 outline-none text-white" placeholder="Phone" />
                        ) : (
                          <p className="text-white/40 mt-0.5">{profile.phone || "No Contact"}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0" style={{ width: "34px", height: "24px", borderRadius: "4px", background: "linear-gradient(135deg, #d4af37 0%, #f9e97f 40%, #c8941a 100%)", border: "1px solid rgba(0,0,0,0.18)" }} />
                </div>

                <div className="flex justify-between items-end">
                  <div className="flex gap-4 sm:gap-8">
                    <div>
                      <p className="font-mono text-[7px] uppercase opacity-40 tracking-widest">Tier</p>
                      <p className="font-['Barlow Condensed'] font-extrabold text-[0.85rem] uppercase tracking-tight" style={{ color: '#8cc7ff' }}>{userTier.replace("-", " ")}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[7px] uppercase opacity-40 tracking-widest">Status</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: membershipStatus.isActive ? "#4ade80" : "#ef4444", boxShadow: membershipStatus.isActive ? "0 0 10px #4ade80" : "none" }} />
                        <p className="font-['Barlow Condensed'] font-extrabold text-[0.85rem] uppercase tracking-tight" style={{ color: membershipStatus.isActive ? "#4ade80" : "#ef4444" }}>
                          {membershipStatus.isActive ? "Active" : "Exp"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 relative z-20">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSave} disabled={saving}
                          className="font-['Barlow Condensed'] font-extrabold text-[9px] tracking-[0.1em] uppercase bg-[#0066CC] text-white rounded px-3 sm:px-4 py-1.5 transition-all border border-white/10"
                        >
                          {saving ? "..." : "Save"}
                        </button>
                        <button onClick={handleCancel} className="font-['Barlow Condensed'] font-extrabold text-[9px] tracking-[0.1em] uppercase bg-slate-800 text-white/80 rounded px-3 sm:px-4 py-1.5 border border-white/5">
                          X
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="font-['Barlow Condensed'] font-extrabold text-[9px] tracking-[0.1em] uppercase bg-white/10 text-white rounded px-4 py-1.5 hover:bg-white/20 backdrop-blur-md border border-white/10">
                          Edit
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); supabase.auth.signOut().then(() => navigate("/")); }} className="font-['Barlow Condensed'] font-extrabold text-[9px] tracking-[0.1em] uppercase bg-red-700 text-white rounded px-4 py-1.5">
                          Logout
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* BACK */}
            <div
              className="absolute inset-0 rounded-[22px] overflow-hidden"
              style={{
                backfaceVisibility: "hidden", transform: "rotateY(180deg)",
                background: "linear-gradient(135deg, #001a33 0%, #004080 30%, #a3d1ff 50%, #004080 70%, #001a33 100%)",
                border: "1px solid rgba(255,255,255,0.25)",
                boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
                zIndex: isFlipped ? 2 : 0,
              }}
            >
              <div className="absolute top-8 left-0 right-0 h-10 bg-black/50 border-y border-white/10" />
              <div className="relative z-10 h-full flex flex-col justify-between p-7 sm:p-8 text-white">
                <p className="font-['Space Mono', monospace] text-[8px] text-white font-bold uppercase tracking-[0.2em]" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>{theme.serial}</p>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="font-mono text-[9px] text-white/70 font-bold uppercase tracking-wider" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>Since</p>
                    <p className="font-['Barlow Condensed'] font-extrabold text-[1.2rem] tracking-tight text-white" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}>{profile.membershipStart || "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[9px] text-white/70 font-bold uppercase tracking-wider" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>Renewal</p>
                    <p className="font-['Barlow Condensed'] font-extrabold text-[1.2rem] tracking-tight" style={{ color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}>{profile.membershipEnd || "—"}</p>
                  </div>
                </div>
                <p className="font-mono text-[8px] sm:text-[9px] text-white font-bold uppercase tracking-[0.2em] text-center border-t border-white/20 pt-3 mt-3" style={{ textShadow: "0 1px 5px rgba(0,0,0,1)" }}>{theme.motto}</p>
              </div>
            </div>
          </div>
        </div>

        <p className="font-mono text-[9px] tracking-[0.15em] text-white/20 uppercase mt-2 sm:mt-4 mb-2">
          {isEditing ? "Complete Edit to Flip" : "Tap to Flip Card"}
        </p>

        {/* ── TRANSACTION E-RECEIPT ── */}
        <div className="w-full mt-6 sm:mt-10 relative">
          <div className="absolute -top-3 left-0 right-0 h-4 flex overflow-hidden z-20">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="min-w-[32px] h-[32px] bg-[#f8f9fa] rotate-45 transform origin-top-left -translate-y-4" />
            ))}
          </div>
          <div className="relative bg-[#f8f9fa] text-slate-900 rounded-b-sm shadow-2xl p-4 sm:p-6 pt-10 border-x border-slate-200">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/p6-dark.png")` }} />
            <div className="relative z-10">
              <div className="text-center border-b-2 border-dashed border-slate-300 pb-5 mb-5">
                <h3 className="font-['Barlow Condensed'] font-extrabold text-xl sm:text-2xl uppercase tracking-tighter">Flex Republic</h3>
                <p className="font-mono text-[9px] uppercase opacity-60">Digital Billing Statement</p>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-[1fr,80px] font-mono text-[9px] font-bold uppercase border-b border-slate-200 pb-2">
                  <span>Description</span><span className="text-right">Amount</span>
                </div>
                {transactions.length > 0 ? displayedTransactions.map((tx) => (
                  <div key={tx.id} className="grid grid-cols-[1fr,80px] items-start border-b border-slate-100 pb-3">
                    <div className="pr-2">
                      <p className="font-mono text-[10px] font-bold text-slate-800 uppercase leading-tight">{userTier.replace("-", " ")} Membership</p>
                      <p className="font-mono text-[8px] text-slate-500 mt-0.5">{tx.date} • {tx.status}</p>
                    </div>
                    <div className="text-right font-['Barlow'] font-bold text-base sm:text-lg text-slate-900">₱{tx.amount.toLocaleString()}</div>
                  </div>
                )) : <p className="py-8 text-center font-mono text-[9px] uppercase opacity-40">No records found</p>}

                {transactions.length > 3 && (
                  <div className="text-center">
                    <button onClick={(e) => { e.stopPropagation(); setShowAllTransactions((s) => !s); }} className="mt-3 inline-flex items-center gap-2 rounded px-3 py-1.5 bg-[#0066CC] text-white text-sm">
                      {showAllTransactions ? 'Show less' : 'See more'}
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-300 text-center">
                <p className="font-mono text-[9px] uppercase tracking-widest text-slate-400">Stay Strong. Stay Flex.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
