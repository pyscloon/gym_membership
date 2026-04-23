import React, { createContext, useContext, useState, useEffect } from 'react';
import type { PendingPayment, UserType } from '../../../types/payment';
import { supabase } from '../../../lib/supabaseClient';
import { resolveEvidenceUrl, resolveLatestFolderEvidence, resolveAnyFolderEvidence } from './AdminPaymentUtils';

interface TransactionRow {
  id: string;
  user_id: string;
  user_type: string;
  amount: number;
  method: string;
  status: string;
  proof_of_payment_url: string | null;
  discount_id_proof_url: string | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
}

export interface MembershipRow {
  user_id: string;
  tier: string;
  status: string;
  start_date: string;
  renewal_date: string;
}

interface AdminPaymentContextProps {
  pendingPayments: PendingPayment[];
  userNameById: Record<string, string>;
  membershipByUserId: Record<string, MembershipRow | null>;
  confirmingId: string | null;
  decliningId: string | null;
  selectedEvidenceUrl: string | null;
  setSelectedEvidenceUrl: (url: string | null) => void;
  handleConfirm: (transactionId: string, userId: string, userType: UserType) => Promise<void>;
  handleDecline: (transactionId: string, userId: string, userType: UserType) => Promise<void>;
  handleVerifyOnline: (transactionId: string, userId: string, userType: UserType) => Promise<void>;
  handleRejectOnline: (transactionId: string, userId: string, userType: UserType) => Promise<void>;
}

const AdminPaymentContext = createContext<AdminPaymentContextProps | undefined>(undefined);

export const useAdminPayments = () => {
  const context = useContext(AdminPaymentContext);
  if (!context) throw new Error('useAdminPayments must be used within AdminPaymentProvider');
  return context;
};

interface AdminPaymentProviderProps {
  children: React.ReactNode;
  onConfirmPayment: (transactionId: string, userId: string, userType: UserType) => Promise<void>;
  onDeclinePayment: (transactionId: string, userId: string, userType: UserType) => Promise<void>;
  onVerifyOnlinePayment?: (transactionId: string, userId: string, userType: UserType) => Promise<void>;
  onRejectOnlinePayment?: (transactionId: string, userId: string, userType: UserType, reason: string) => Promise<void>;
  onPendingCountChange?: (count: number) => void;
}

export const AdminPaymentProvider: React.FC<AdminPaymentProviderProps> = ({
  children,
  onConfirmPayment,
  onDeclinePayment,
  onVerifyOnlinePayment,
  onRejectOnlinePayment,
  onPendingCountChange,
}) => {
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [userNameById, setUserNameById] = useState<Record<string, string>>({});
  const [membershipByUserId, setMembershipByUserId] = useState<Record<string, MembershipRow | null>>({});
  const [selectedEvidenceUrl, setSelectedEvidenceUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchPending = async () => {
      if (!supabase) return;

      const { data, error } = await supabase
        .from("transactions")
        .select("id, user_id, user_type, amount, method, status, proof_of_payment_url, discount_id_proof_url, created_at")
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
          supabase.from("profiles").select("id, full_name, email").in("id", uniqueUserIds),
          supabase.from("memberships").select("user_id, tier, status, start_date, renewal_date").in("user_id", uniqueUserIds).order("start_date", { ascending: false }),
        ]);

        const nextUserNames: Record<string, string> = {};
        for (const profile of (profilesData as ProfileRow[] | null) ?? []) {
          nextUserNames[profile.id] = profile.full_name?.trim() || profile.email || profile.id;
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
          if (!nextUserNames[userId]) nextUserNames[userId] = userId;
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
      setTimeout(() => setRefreshTrigger(prev => prev + 1), 500);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDecline = async (transactionId: string, userId: string, userType: UserType) => {
    setDecliningId(transactionId);
    try {
      await onDeclinePayment(transactionId, userId, userType);
      setTimeout(() => setRefreshTrigger(prev => prev + 1), 500);
    } finally {
      setDecliningId(null);
    }
  };

  const handleVerifyOnline = async (transactionId: string, userId: string, userType: UserType) => {
    setConfirmingId(transactionId);
    try {
      if (onVerifyOnlinePayment) await onVerifyOnlinePayment(transactionId, userId, userType);
      setTimeout(() => setRefreshTrigger(prev => prev + 1), 500);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleRejectOnline = async (transactionId: string, userId: string, userType: UserType) => {
    setDecliningId(transactionId);
    try {
      if (onRejectOnlinePayment) await onRejectOnlinePayment(transactionId, userId, userType, "Declined by admin");
      setTimeout(() => setRefreshTrigger(prev => prev + 1), 500);
    } finally {
      setDecliningId(null);
    }
  };

  const value = {
    pendingPayments,
    userNameById,
    membershipByUserId,
    confirmingId,
    decliningId,
    selectedEvidenceUrl,
    setSelectedEvidenceUrl,
    handleConfirm,
    handleDecline,
    handleVerifyOnline,
    handleRejectOnline,
  };

  return (
    <AdminPaymentContext.Provider value={value}>
      {children}
    </AdminPaymentContext.Provider>
  );
};
