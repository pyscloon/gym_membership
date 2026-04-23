/**
 * AdminPaymentPanel - Admin interface for confirming pending cash payments
 */

import { useEffect, useState } from "react";
import type { PendingPayment, UserType } from "../types/payment";
import { supabase } from "../lib/supabaseClient";

const EVIDENCE_BUCKET = "uploads";

type TransactionRow = {
  id: string;
  user_id: string;
  user_type: string;
  amount: number;
  method: string;
  status: string;
  proof_of_payment_url: string | null;
  discount_id_proof_url: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type MembershipRow = {
  user_id: string;
  tier: string;
  status: string;
  start_date: string;
  renewal_date: string;
};

function normalizeEvidencePath(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "false" || trimmed === "null" || trimmed === "undefined") {
    return null;
  }
  if (trimmed === "true") return null;
  if (trimmed.startsWith("data:")) return trimmed;
  if (!/^https?:\/\//i.test(trimmed)) return trimmed.replace(new RegExp(`^${EVIDENCE_BUCKET}/`), "");

  try {
    const url = new URL(trimmed);
    const markers = [
      `/storage/v1/object/public/${EVIDENCE_BUCKET}/`,
      `/storage/v1/object/sign/${EVIDENCE_BUCKET}/`,
    ];

    for (const marker of markers) {
      const index = url.pathname.indexOf(marker);
      if (index >= 0) {
        return decodeURIComponent(url.pathname.slice(index + marker.length));
      }
    }

    if (url.pathname.includes(`/storage/v1/object/public/${EVIDENCE_BUCKET}/`)) {
      return decodeURIComponent(url.pathname.split(`/storage/v1/object/public/${EVIDENCE_BUCKET}/`).pop() ?? "");
    }
  } catch {
    return trimmed.replace(new RegExp(`^${EVIDENCE_BUCKET}/`), "");
  }

  return trimmed.replace(new RegExp(`^${EVIDENCE_BUCKET}/`), "");
}

async function resolveEvidenceUrl(value?: string | null) {
  if (!value) return null;
  const normalizedPath = normalizeEvidencePath(value);
  if (!normalizedPath) return null;
  if (normalizedPath.startsWith("data:")) {
    return normalizedPath;
  }
  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }
  if (!supabase) return value;

  const path = normalizeEvidencePath(value);
  if (!path) return null;

  const { data: signedData, error: signedError } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(path, 60 * 60, { download: false });

  if (!signedError && signedData?.signedUrl) {
    return signedData.signedUrl;
  }

  const { data } = supabase.storage.from(EVIDENCE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function resolveLatestFolderEvidence(userId: string, prefix: string) {
  if (!supabase) return null;

  const { data, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .list(userId, {
      limit: 20,
      offset: 0,
      sortBy: { column: "name", order: "desc" },
    });

  if (error || !data) {
    return null;
  }

  const match = data.find((item: { name: string }) => item.name.startsWith(prefix));
  if (!match) return null;

  return resolveEvidenceUrl(`${userId}/${match.name}`);
}

async function resolveAnyFolderEvidence(userId: string, keywords: string[]) {
  if (!supabase) return null;

  const { data, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .list(userId, {
      limit: 50,
      offset: 0,
      sortBy: { column: "name", order: "desc" },
    });

  if (error || !data) return null;

  const match = data.find((item: { name: string }) => {
    const lower = item.name.toLowerCase();
    return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
  });

  if (!match) return null;

  return resolveEvidenceUrl(`${userId}/${match.name}`);
}

interface AdminPaymentPanelProps {
  onConfirmPayment: (transactionId: string, userId: string, userType: UserType) => Promise<void>;
  onDeclinePayment: (transactionId: string, userId: string, userType: UserType) => Promise<void>;
  onVerifyOnlinePayment?: (transactionId: string, userId: string, userType: UserType) => Promise<void>;
  onRejectOnlinePayment?: (transactionId: string, userId: string, userType: UserType, reason: string) => Promise<void>;
  onPendingCountChange?: (count: number) => void;
}

export default function AdminPaymentPanel({
  onConfirmPayment,
  onDeclinePayment,
  onVerifyOnlinePayment,
  onRejectOnlinePayment,
  onPendingCountChange,
}: AdminPaymentPanelProps) {
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [userNameById, setUserNameById] = useState<Record<string, string>>({});
  const [membershipByUserId, setMembershipByUserId] = useState<Record<string, MembershipRow | null>>({});
  const [selectedEvidenceUrl, setSelectedEvidenceUrl] = useState<string | null>(null);

  // ✅ Now fetches from Supabase instead of localStorage
  useEffect(() => {
      const fetchPending = async () => {
        if (!supabase) return;

        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .in("status", ["awaiting-confirmation", "awaiting-verification"])
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Failed to fetch pending payments:", error);
          return;
        }

        const pending = await Promise.all(
          (data as TransactionRow[]).map(async (t) => {
            const proofOfPaymentUrl =
              (await resolveEvidenceUrl(t.proof_of_payment_url)) ??
              (await resolveLatestFolderEvidence(t.user_id, "payment-proof_")) ??
              undefined;
            const discountIdProofUrl =
              (await resolveEvidenceUrl(t.discount_id_proof_url)) ??
              (await resolveLatestFolderEvidence(t.user_id, "discount-id_")) ??
              (await resolveAnyFolderEvidence(t.user_id, ["discount", "id", "school", "senior", "pwd"])) ??
              undefined;

            return {
              transactionId: t.id,
              userId: t.user_id,
              userType: t.user_type as UserType,
              amount: t.amount,
              method: t.method as PendingPayment["method"],
              requestedAt: t.created_at,
              proofOfPaymentUrl,
              discountIdProofUrl,
            };
          })
        );

        const uniqueUserIds = [...new Set(pending.map((item) => item.userId).filter(Boolean))];

        if (uniqueUserIds.length > 0) {
          const [{ data: profilesData }, { data: membershipData }] = await Promise.all([
            supabase
              .from("profiles")
              .select("id, full_name, email")
              .in("id", uniqueUserIds),
            supabase
              .from("memberships")
              .select("user_id, tier, status, start_date, renewal_date")
              .in("user_id", uniqueUserIds)
              .order("start_date", { ascending: false }),
          ]);

          const nextUserNames: Record<string, string> = {};
          for (const profile of (profilesData as ProfileRow[] | null) ?? []) {
            nextUserNames[profile.id] =
              profile.full_name?.trim() || profile.email || profile.id;
          }

          const nextMemberships: Record<string, MembershipRow | null> = {};
          const membershipsByUser = new Map<string, MembershipRow[]>();

          for (const row of (membershipData as MembershipRow[] | null) ?? []) {
            const list = membershipsByUser.get(row.user_id) ?? [];
            list.push(row);
            membershipsByUser.set(row.user_id, list);
          }

          for (const userId of uniqueUserIds) {
            const rows = membershipsByUser.get(userId) ?? [];
            const active = rows.find((row) => row.status === "active");
            nextMemberships[userId] = active ?? rows[0] ?? null;
            if (!nextUserNames[userId]) {
              nextUserNames[userId] = userId;
            }
          }

          setUserNameById(nextUserNames);
          setMembershipByUserId(nextMemberships);
        }

        setPendingPayments(pending);
        onPendingCountChange?.(pending.length);
      };

      fetchPending();
      const interval = setInterval(fetchPending, 2000);
      return () => clearInterval(interval);
    }, [refreshTrigger, onPendingCountChange]);

  const handleConfirm = async (transactionId: string, userId: string, userType: UserType) => {
    setConfirmingId(transactionId);
    try {
      await onConfirmPayment(transactionId, userId, userType);
      setTimeout(() => {
        setRefreshTrigger((prev) => prev + 1);
      }, 500);
    } catch (error) {
      console.error("Failed to confirm payment:", error);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDecline = async (transactionId: string, userId: string, userType: UserType) => {
    setDecliningId(transactionId);
    try {
      await onDeclinePayment(transactionId, userId, userType);
      setTimeout(() => {
        setRefreshTrigger((prev) => prev + 1);
      }, 500);
    } catch (error) {
      console.error("Failed to decline payment:", error);
    } finally {
      setDecliningId(null);
    }
  };

  const handleVerifyOnline = async (transactionId: string, userId: string, userType: UserType) => {
    setConfirmingId(transactionId);
    try {
      if (onVerifyOnlinePayment) {
        await onVerifyOnlinePayment(transactionId, userId, userType);
      }
      setTimeout(() => {
        setRefreshTrigger((prev) => prev + 1);
      }, 500);
    } catch (error) {
      console.error("Failed to verify online payment:", error);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleRejectOnline = async (transactionId: string, userId: string, userType: UserType) => {
    setDecliningId(transactionId);
    try {
      if (onRejectOnlinePayment) {
        await onRejectOnlinePayment(transactionId, userId, userType, "Declined by admin");
      }
      setTimeout(() => {
        setRefreshTrigger((prev) => prev + 1);
      }, 500);
    } catch (error) {
      console.error("Failed to reject online payment:", error);
    } finally {
      setDecliningId(null);
    }
  };

  const totalPending = pendingPayments.length;
  const totalAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="mb-2">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-flexNavy/70">Total Pending</p>
            <p className="mt-1 text-2xl font-bold text-flexBlue">₱{totalAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-flexNavy/70">Payment Requests</p>
            <p className="mt-1 text-2xl font-bold text-flexNavy">{totalPending}</p>
          </div>
        </div>
      </div>

      {/* Pending Payments List */}
      {pendingPayments.length === 0 ? (
        <div className="py-8 text-center">
          <svg className="h-12 w-12 mx-auto text-flexNavy/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 110-4h.01a2 2 0 110 4v1m6.168 1.832a2 2 0 002.21-2.012V6a2 2 0 10-2.22 2.007m0 0H18a2 2 0 100-4h-.01a2 2 0 00-2 2.007M6.168 4.832a2 2 0 002.21-2.012V6a2 2 0 10-2.22 2.007m0 0H6a2 2 0 100-4h-.01a2 2 0 00-2 2.007" />
          </svg>
          <p className="text-flexNavy/60 font-semibold">No Pending Payments</p>
          <p className="text-sm text-flexNavy/50 mt-1">All pending payments have been processed</p>
        </div>
      ) : (
        <div className="grid max-h-[600px] grid-cols-1 gap-3 overflow-y-auto lg:grid-cols-2">
          {pendingPayments.map((payment) => {
            const isOnline = payment.method === "online";
            const membershipDetails = membershipByUserId[payment.userId] ?? null;
            const displayPlan =
              payment.userType === "walk-in"
                ? "Walk-In"
                : membershipDetails?.tier || payment.userType;
            const normalizedPlan = displayPlan.toLowerCase();
            const gradientByPlan =
              normalizedPlan === "walk-in"
                ? "linear-gradient(135deg, #1d4ed8 0%, #001a4d 100%)"
                : normalizedPlan === "monthly"
                  ? "linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)"
                  : normalizedPlan === "semi-yearly"
                    ? "linear-gradient(135deg, #1e3a8a 0%, #172554 100%)"
                    : "linear-gradient(135deg, #172554 0%, #020617 100%)";
            const serialByPlan =
              normalizedPlan === "walk-in"
                ? "FLX-001"
                : normalizedPlan === "monthly"
                  ? "FLX-002"
                  : normalizedPlan === "semi-yearly"
                    ? "FLX-003"
                    : "FLX-004";
            const cardTitle = displayPlan.toUpperCase();

            return (
              <div
                key={payment.transactionId}
                className="w-full rounded-2xl border border-[#0066CC]/20 bg-white/80 p-3 shadow-[0_6px_18px_rgba(0,51,102,0.08)] backdrop-blur-sm transition hover:border-[#0066CC]/35 sm:p-4"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm text-[#00264D]/75">
                      User: <span className="font-semibold text-[#003D7A]">{userNameById[payment.userId] || payment.userId}</span>
                    </p>
                    <p className="text-xs text-[#003D7A]/60">
                      Requested: {new Date(payment.requestedAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="ml-auto flex shrink-0 items-start gap-2">
                    {isOnline ? (
                      <>
                        <button
                          onClick={() => handleVerifyOnline(payment.transactionId, payment.userId, payment.userType)}
                          disabled={confirmingId === payment.transactionId || decliningId === payment.transactionId}
                          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#0066CC] to-[#0099FF] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {confirmingId === payment.transactionId ? "Confirming..." : "Confirm"}
                        </button>
                        <button
                          onClick={() => handleRejectOnline(payment.transactionId, payment.userId, payment.userType)}
                          disabled={confirmingId === payment.transactionId || decliningId === payment.transactionId}
                          className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          {decliningId === payment.transactionId ? "Declining..." : "Decline"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleConfirm(payment.transactionId, payment.userId, payment.userType)}
                          disabled={confirmingId === payment.transactionId || decliningId === payment.transactionId}
                          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#0066CC] to-[#0099FF] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {confirmingId === payment.transactionId ? "Confirming..." : "Confirm"}
                        </button>
                        <button
                          onClick={() => handleDecline(payment.transactionId, payment.userId, payment.userType)}
                          disabled={confirmingId === payment.transactionId || decliningId === payment.transactionId}
                          className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          {decliningId === payment.transactionId ? "Declining..." : "Decline"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <section className="mb-4 overflow-hidden rounded-2xl border border-white/10 shadow-lg">
                  <div className="relative h-[118px] p-3" style={{ background: gradientByPlan }}>
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px)", backgroundSize: "12px 12px" }}
                    />
                    <div
                      className="absolute inset-0 opacity-10"
                      style={{ background: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.18) 0%, transparent 50%)" }}
                    />
                    <div className="relative z-10 flex h-full flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/45">Membership</p>
                          <div
                            className="mt-1 h-5 w-8 rounded-sm border border-yellow-600/30"
                            style={{ background: "linear-gradient(135deg, #bf953f 0%, #fcf6ba 25%, #b38728 50%, #fbf5b7 75%, #aa771c 100%)" }}
                          />
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black italic leading-none text-white">{cardTitle}</p>
                          <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/55">Flex Republic</p>
                        </div>
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-2xl font-black leading-none text-white">₱{payment.amount.toLocaleString()}</p>
                          <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/60">Flip for benefits • {serialByPlan}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="mb-4 space-y-3 rounded-2xl border border-[#0066CC]/15 bg-[#f8fbff] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#003D7A]/60">Receipt proof</p>
                      <p className="text-xs text-[#00264D]/70">
                        {payment.proofOfPaymentUrl ? "Member upload here." : "No proof photo yet."}
                      </p>
                    </div>
                    {payment.proofOfPaymentUrl && (
                      <button
                        type="button"
                        onClick={() => setSelectedEvidenceUrl(payment.proofOfPaymentUrl ?? null)}
                        className="rounded-full border border-[#0066CC]/20 bg-white px-3 py-1 text-[11px] font-semibold text-[#003D7A] transition hover:bg-[#EAF4FF]"
                      >
                        Open
                      </button>
                    )}
                  </div>

                  {payment.proofOfPaymentUrl ? (
                    <button
                      type="button"
                      onClick={() => setSelectedEvidenceUrl(payment.proofOfPaymentUrl ?? null)}
                      className="block w-full overflow-hidden rounded-xl border border-[#0066CC]/15 bg-white text-left"
                    >
                      <img
                        src={payment.proofOfPaymentUrl}
                        alt="Payment proof uploaded by member"
                        className="h-48 w-full object-cover"
                      />
                    </button>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#0066CC]/20 bg-white px-4 py-8 text-center">
                      <p className="text-sm font-semibold text-[#003D7A]">No receipt photo uploaded</p>
                    </div>
                  )}

                  {payment.discountIdProofUrl && (
                    <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-[0_10px_24px_rgba(16,185,129,0.12)]">
                      <div className="flex items-center justify-between gap-3 border-b border-emerald-100 px-4 py-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                            Discount ID proof
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedEvidenceUrl(payment.discountIdProofUrl ?? null)}
                          className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-700"
                        >
                          Open
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedEvidenceUrl(payment.discountIdProofUrl ?? null)}
                        className="block w-full text-left"
                      >
                        <img
                          src={payment.discountIdProofUrl}
                          alt="Discount ID proof uploaded by member"
                          className="h-56 w-full object-cover"
                        />
                      </button>
                    </div>
                  )}
                </section>
              </div>
            );
          })}
        </div>
      )}

      {selectedEvidenceUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSelectedEvidenceUrl(null)}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-slate-900">Photo proof</p>
                <p className="text-xs text-slate-500">Tap outside or close to shut it.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvidenceUrl(null)}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
            <div className="bg-slate-950">
              <img
                src={selectedEvidenceUrl}
                alt="Uploaded payment proof"
                className="max-h-[75vh] w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
