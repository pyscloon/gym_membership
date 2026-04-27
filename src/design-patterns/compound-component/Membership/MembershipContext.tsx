import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks';
import { useWalkIn } from '../../../hooks/useWalkIn';
import { usePayment } from '../../../hooks/usePayment';
import { supabase } from '../../../lib/supabaseClient';
import {
  applyMembership,
  cancelMembership,
  fetchUserMembership,
  reactivateMembership,
  requestFreezeMembership,
  requestUnfreezeMembership,
} from '../../../lib/membershipService';
import {
  type Membership,
  type MembershipTier,
  calculateMembershipStats,
} from '../../../types/membership';
import { type PaymentTransaction, type UserType, MEMBERSHIP_PRICES } from '../../../types/payment';
import { encodeQrPayload } from '../../../lib/qrPayload';
import {
  MembershipStateContext,
  AttendanceSessionContext,
} from '../../../design-patterns';
import { generateTransactionId, saveTransaction } from '../../../lib/paymentSimulator';
import { shouldProcessInteraction } from '../../../lib/interaction';

export const PLANS = [
  {
    badge: "Starter",
    title: "Monthly",
    amount: "₱499",
    interval: "/ month",
    quote: "Train on your schedule.",
    description: "Best for trying the gym with flexible billing.",
    features: ["Flexible monthly billing", "Full gym floor access", "Cancel anytime"],
    tier: "monthly" as const,
    ctaLabel: "Choose Monthly",
    isActive: true,
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    badge: "Value",
    title: "Semi-Yearly",
    amount: "₱2,499",
    interval: "/ 6 months",
    quote: "Commit a little longer and save more.",
    description: "Balanced commitment with better long-term value.",
    features: ["Lower effective monthly cost", "Priority class slots", "Consistent progress window"],
    tier: "semi-yearly" as const,
    ctaLabel: "Choose Semi-Yearly",
    isActive: true,
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    badge: "Best Plan",
    title: "Yearly",
    amount: "₱3,999",
    interval: "/ 12 months",
    quote: "Maximum savings for year-round training.",
    description: "Most cost-effective plan for consistent training.",
    features: ["Best yearly value", "Locked-in lower rate", "Built for long-term goals"],
    tier: "yearly" as const,
    ctaLabel: "Choose Yearly",
    isActive: true,
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    badge: "One-Time",
    title: "Walk-In Pass",
    amount: "₱60",
    interval: "/ session",
    quote: "Quick access when you need a single workout.",
    description: "One-time access for quick sessions with no commitment.",
    features: ["No subscription required", "24-hour pass validity", "Fast entry for single visit"],
    tier: "walk-in" as const,
    ctaLabel: "Choose Walk-In",
    isActive: true,
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

interface MembershipContextProps {
  // Data
  user: any;
  membership: Membership | null;
  membershipStateContext: MembershipStateContext | null;
  attendanceSessionContext: AttendanceSessionContext | null;
  stats: any;
  isAdmin: boolean;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  toasts: Toast[];
  isSubscribedUser: boolean;
  sessionStage: string;
  plans: typeof PLANS;

  // Modal States
  showQR: boolean;
  qrValue: string;
  qrActionType: 'checkin' | 'checkout';
  showFreezeModal: boolean;
  showPaymentModal: boolean;
  showPaymentConfirmation: boolean;
  showChangeMembershipModal: boolean;
  showSessionScanModal: boolean;
  sessionScanMode: 'checkin' | 'checkout';
  selectedPlanTier: UserType;
  pendingMembershipTier: MembershipTier | null;
  currentTransaction: PaymentTransaction | null;
  showCheckInConfirmation: boolean;

  // Actions
  addToast: (message: string, type?: 'success' | 'error') => void;
  loadMembership: () => Promise<void>;
  handleGenerateCheckIn: (skipGuard?: boolean) => void;
  handleGenerateCheckOut: (skipGuard?: boolean) => void;
  handleCloseQR: () => void;
  handleOpenSessionScanFromFab: () => void;
  handleCloseSessionScanModal: (skipGuard?: boolean) => void;
  handleSelectMembershipTier: (tier: MembershipTier) => void;
  handleConfirmMembershipChange: () => Promise<void>;
  handleCloseChangeMembership: () => void;
  handleApply: (tier?: MembershipTier) => Promise<void>;
  handleRenew: () => Promise<void>;
  handleCancel: () => Promise<void>;
  handleReactivate: () => Promise<void>;
  handleRequestFreeze: () => Promise<void>;
  handleWalkInApply: () => void;
  handleEndWalkInSession: () => void;
  handleInitiatePayment: (method: any, proof?: string, discCat?: string, discProof?: string, vCode?: string, fAmount?: number) => Promise<void>;
  handlePaymentComplete: () => Promise<void>;
  handleAdminConfirmPayment: (transactionId: string, userId: string, userType: UserType) => Promise<void>;
  handleAdminDeclinePayment: (transactionId: string, userId: string, userType: UserType) => Promise<void>;
  handleAdminVerifyOnlinePayment: (transactionId: string, userId: string, userType: UserType) => Promise<void>;
  handleAdminRejectOnlinePayment: (transactionId: string, userId: string, userType: UserType, reason: string) => Promise<void>;
  clearError: () => void;
  setShowFreezeModal: (val: boolean) => void;
  setShowPaymentModal: (val: boolean) => void;
  setShowPaymentConfirmation: (val: boolean) => void;
  setShowChangeMembershipModal: (val: boolean) => void;
  setSelectedPlanTier: (tier: UserType) => void;
  toggleAdminView: () => void;
}

const MembershipContext = createContext<MembershipContextProps | undefined>(undefined);

export const useMembership = () => {
  const context = useContext(MembershipContext);
  if (!context) throw new Error('useMembership must be used within MembershipProvider');
  return context;
};

export const MembershipProvider: React.FC<{ children: React.ReactNode; changeMembershipTick?: number; freezeTick?: number }> = ({ 
  children, 
  changeMembershipTick, 
  freezeTick 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { startSession: startWalkIn, clearSession: clearWalkIn } = useWalkIn();
  const paymentHook = usePayment(user?.id);
  const { clearError } = paymentHook;

  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [qrTimestamp, setQrTimestamp] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlanTier, setSelectedPlanTier] = useState<UserType>("monthly");
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [completedTransactionId, setCompletedTransactionId] = useState<string | null>(null);
  const [guestTransaction, setGuestTransaction] = useState<PaymentTransaction | null>(null);
  const [sessionStage, setSessionStage] = useState<"idle" | "ready" | "checked-in">("idle");
  const [showCheckInConfirmation, setShowCheckInConfirmation] = useState(false);
  const [showChangeMembershipModal, setShowChangeMembershipModal] = useState(false);
  const [pendingMembershipTier, setPendingMembershipTier] = useState<MembershipTier | null>(null);
  const [showSessionScanModal, setShowSessionScanModal] = useState(false);
  const [sessionScanMode, setSessionScanMode] = useState<"checkin" | "checkout">("checkin");
  const [qrActionType, setQrActionType] = useState<"checkin" | "checkout">("checkin");
  const [membershipStateContext, setMembershipStateContext] = useState<MembershipStateContext | null>(null);
  const [attendanceSessionContext, setAttendanceSessionContext] = useState<AttendanceSessionContext | null>(() => new AttendanceSessionContext("regular"));
  const [, setStateUpdateTrigger] = useState(0);

  const lastInteractionRef = useRef(0);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const MEMBERSHIP_POLL_INTERVAL_MS = 2000;

  // Check Admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user || !supabase) return;
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      setIsAdmin(data?.role === "admin");
    };
    checkAdmin();
  }, [user]);

  const stats = useMemo(() => (membership ? calculateMembershipStats(membership) : null), [membership]);
  const isSubscribedUser = useMemo(() => Boolean(membership && (membership.status === "active" || membership.status === "freeze-requested")), [membership]);

  const canHandleUserInteraction = useCallback(() => {
    const now = Date.now();
    if (!shouldProcessInteraction(lastInteractionRef.current, now)) return false;
    lastInteractionRef.current = now;
    return true;
  }, []);

  const addToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const loadMembership = useCallback(async () => {
    if (!user) {
      setMembership(null);
      setMembershipStateContext(null);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const userMembership = await fetchUserMembership(user.id);
      setMembership(userMembership);
      if (userMembership) setMembershipStateContext(new MembershipStateContext(userMembership));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load membership");
    } finally {
      setLoading(false);
    }
  }, [user]);

    useEffect(() => { loadMembership(); }, [loadMembership]);useEffect(() => {
      void loadMembership();

      pollIntervalRef.current = setInterval(() => {
        void loadMembership();
      }, MEMBERSHIP_POLL_INTERVAL_MS);

      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
    }, [loadMembership]);

    useEffect(() => {
      if (!showCheckInConfirmation) return;
      const t = setTimeout(() => setShowCheckInConfirmation(false), 5000);
      return () => clearTimeout(t);
    }, [showCheckInConfirmation]);

    useEffect(() => {
      if (changeMembershipTick && changeMembershipTick > 0) setShowChangeMembershipModal(true);
    }, [changeMembershipTick]);

    useEffect(() => {
      if (freezeTick && freezeTick > 0) setShowFreezeModal(true);
    }, [freezeTick]);

    const qrValue = useMemo(() => encodeQrPayload({
      id: user?.id,
      type: qrActionType,
      tier: membership?.tier,
      timestamp: qrTimestamp,
    }), [membership?.tier, qrActionType, qrTimestamp, user?.id]);

  const handleGenerateCheckIn = (skipGuard = false) => {
    if (!skipGuard && !canHandleUserInteraction()) return;

    // Block frozen and pending accounts
    if (membership?.status === "frozen") {
      addToast("Your membership is frozen. You cannot check in.", "error");
      return;
    }
    if (membership?.status === "freeze-requested") {
      addToast("Your freeze request is pending. You cannot check in.", "error");
      return;
    }
    if (membership?.status === "unfreeze-requested") {
      addToast("Your unfreeze request is pending admin approval.", "error");
      return;
    }

    if (location.pathname === "/dashboard" && isSubscribedUser) {
      if (attendanceSessionContext?.canPerformAction("checkIn")) setStateUpdateTrigger(p => p + 1);
      setQrActionType("checkin");
      setQrTimestamp(new Date().toISOString());
      setShowQR(true);
      addToast("Check-in QR generated!", "success");
      return;
    }
    if (membershipStateContext?.canPerformAction("checkIn")) {
      attendanceSessionContext?.checkIn();
      setQrActionType("checkin");
      setQrTimestamp(new Date().toISOString());
      setShowQR(true);
      setStateUpdateTrigger(p => p + 1);
      addToast("Check-in QR generated!", "success");
    } else {
      addToast("Status doesn't allow check-in", "error");
    }
  };

  const handleGenerateCheckOut = (skipGuard = false) => {
    if (!skipGuard && !canHandleUserInteraction()) return;
    // block frozen accounts
    if (membership?.status === "frozen") {
      addToast("Your membership is frozen. You cannot check out.", "error");
      return;
    }

    if (attendanceSessionContext?.canPerformAction("checkOut")) {
      setQrActionType("checkout");
      setQrTimestamp(new Date().toISOString());
      setShowQR(true);
      setStateUpdateTrigger(p => p + 1);
      addToast("Check-out QR generated!", "success");
    } else {
      addToast("Must check in first", "error");
    }
  };

  const handleCloseQR = () => {
    if (!canHandleUserInteraction()) return;
    if (location.pathname === "/dashboard" && isSubscribedUser) {
      setShowQR(false);
      if (sessionScanMode === "checkout" && sessionStage === "checked-in") {
        attendanceSessionContext?.checkOut();
        setAttendanceSessionContext(new AttendanceSessionContext("regular"));
        setSessionStage("idle");
        setQrActionType("checkin");
        setStateUpdateTrigger(p => p + 1);
        addToast("Checked out successfully!", "success");
      } else {
        const nextSessionContext = new AttendanceSessionContext("regular");
        nextSessionContext.checkIn();
        setAttendanceSessionContext(nextSessionContext);
        setSessionStage("checked-in");
        setQrActionType("checkout");
        setStateUpdateTrigger(p => p + 1);
        setShowCheckInConfirmation(true);
        addToast("Check-in approved.", "success");
      }
      return;
    }
    setShowQR(false);
    if (attendanceSessionContext?.getStateName() === "checked-in") {
      attendanceSessionContext?.checkOut();
      setAttendanceSessionContext(new AttendanceSessionContext("regular"));
      setSessionStage("idle");
      setQrActionType("checkin");
      setStateUpdateTrigger(p => p + 1);
      addToast("Checked out successfully!", "success");
    }
    setStateUpdateTrigger(p => p + 1);
  };

  const handleOpenSessionScanFromFab = () => {
    if (!canHandleUserInteraction()) return;
    if (sessionStage === "checked-in") {
      setSessionScanMode("checkout");
      handleGenerateCheckOut(true);
    } else {
      setSessionScanMode("checkin");
      handleGenerateCheckIn(true);
    }
    setShowSessionScanModal(true);
  };

  const handleCloseSessionScanModal = (skipGuard = false) => {
    if (skipGuard || canHandleUserInteraction()) setShowSessionScanModal(false);
  };

  const handleSelectMembershipTier = (tier: MembershipTier) => setPendingMembershipTier(tier);

  const handleConfirmMembershipChange = async () => {
    if (!user || !membership || !pendingMembershipTier || pendingMembershipTier === membership.tier) return;
    setSelectedPlanTier(pendingMembershipTier);
    setShowChangeMembershipModal(false);
    setPendingMembershipTier(null);
    clearError();
    setShowPaymentModal(true);
  };

  const handleCloseChangeMembership = () => {
    setShowChangeMembershipModal(false);
    setPendingMembershipTier(null);
    clearError();
  };

  const handleApply = async (tier: MembershipTier = "monthly") => {
    if (!user) return;
    setActionLoading(true);
    const result = await applyMembership(user.id, tier);
    if (result.success && result.data) {
      addToast(`Applied for ${tier}!`, "success");
      setMembership(result.data);
      setMembershipStateContext(new MembershipStateContext(result.data));
      setStateUpdateTrigger(p => p + 1);
    } else {
      addToast(result.error || "Failed to apply", "error");
    }
    setActionLoading(false);
  };

  const handleRenew = async () => {
    if (!user) return;
    setSelectedPlanTier(membership?.tier ?? "monthly");
    clearError();
    setShowPaymentModal(true);
  };

  const handleCancel = async () => {
    if (!user || !confirm("Cancel membership?")) return;
    setActionLoading(true);
    const result = await cancelMembership(user.id);
    if (result.success && result.data) {
      addToast("Canceled.", "success");
      setMembership(result.data);
      setMembershipStateContext(new MembershipStateContext(result.data));
      setStateUpdateTrigger(p => p + 1);
    } else {
      addToast(result.error || "Failed to cancel", "error");
    }
    setActionLoading(false);
  };

  const handleReactivate = async () => {
    if (!user) return;
    setActionLoading(true);
    const result = await reactivateMembership(user.id);
    if (result.success && result.data) {
      addToast("Reactivated!", "success");
      setMembership(result.data);
      setMembershipStateContext(new MembershipStateContext(result.data));
      setStateUpdateTrigger(p => p + 1);
    } else {
      addToast(result.error || "Failed to reactivate", "error");
    }
    setActionLoading(false);
  };

  const handleRequestFreeze = async () => {
    if (!user) return;
    setShowFreezeModal(false);
    setActionLoading(true);
    let result;
    try {
      console.debug("MembershipContext.handleRequestFreeze: user", user.id, "currentStatus", membership?.status);
      if (membership?.status === "frozen") {

        result = await requestUnfreezeMembership(user.id);
      } else {
        result = await requestFreezeMembership(user.id);
      }

      if (result.success && result.data) {
        addToast(membership?.status === "frozen" ? "Unfreeze requested!" : "Freeze requested!", "success");
        setMembership(result.data);
        setMembershipStateContext(new MembershipStateContext(result.data));
        setStateUpdateTrigger(p => p + 1);
      } else {
        addToast(result.error || "Failed to request", "error");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleWalkInApply = useCallback(() => {
    startWalkIn();
    setAttendanceSessionContext(new AttendanceSessionContext("walk-in"));
    setStateUpdateTrigger(p => p + 1);
    addToast("Walk-in started!", "success");
  }, [addToast, startWalkIn]);

  const handleEndWalkInSession = () => {
    if (!confirm("End walk-in?")) return;
    clearWalkIn();
    setAttendanceSessionContext(new AttendanceSessionContext("regular"));
    setStateUpdateTrigger(p => p + 1);
    addToast("Walk-in ended.", "success");
  };

  const handleInitiatePayment = async (method: any, proof?: string, _dc?: string, discProof?: string, _vc?: string, fAmount?: number) => {
    const amount = fAmount ?? MEMBERSHIP_PRICES[selectedPlanTier];
    if (!user) {
      const tid = generateTransactionId();
      const now = new Date().toISOString();
      const gp: PaymentTransaction = {
        id: tid, userId: "guest", userType: selectedPlanTier, amount, method,
        status: method === "online" ? "awaiting-verification" : "awaiting-confirmation",
        createdAt: now, updatedAt: now, proofOfPaymentUrl: proof,
        paymentProofStatus: method === "online" ? "pending" : undefined,
      };
      await saveTransaction(gp);
      setGuestTransaction(gp);
      addToast("Request created.", "success");
      setShowPaymentModal(false);
      setShowPaymentConfirmation(true);
      return;
    }
    const t = await paymentHook.initializePayment(user.id, selectedPlanTier, amount, method, proof, discProof);
    if (!t) {
      addToast(paymentHook.state.error ?? "Failed.", "error");
      return;
    }
    setShowPaymentModal(false);
    setShowPaymentConfirmation(true);
  };

  const handlePaymentComplete = useCallback(async () => {
    const t = paymentHook.state.currentTransaction ?? guestTransaction;
    if (!t || completedTransactionId === t.id) return;
    setCompletedTransactionId(t.id);
    setShowPaymentConfirmation(false);
    if (t.userId === "guest" || !user) {
      addToast("Submitted.", "success");
      navigate("/subscription-tier");
      return;
    }
    if (t.userType === "walk-in") {
      handleWalkInApply();
      navigate("/walk-in");
      return;
    }
    await loadMembership();
    addToast("Active!", "success");
    navigate("/dashboard");
  }, [addToast, completedTransactionId, guestTransaction, handleWalkInApply, loadMembership, navigate, paymentHook.state.currentTransaction, user]);

  useEffect(() => {
    const t = paymentHook.state.currentTransaction;
    if (t?.method === "cash" && t.status === "paid" && completedTransactionId !== t.id) {
      void handlePaymentComplete();
    }
  }, [completedTransactionId, handlePaymentComplete, paymentHook.state.currentTransaction]);

  const handleAdminConfirmPayment = async (transactionId: string, userId: string, _userType: UserType) => {
    try {
      await paymentHook.confirmPayment(transactionId);
      const refreshed = await fetchUserMembership(userId);
      if (refreshed) {
        setMembership(refreshed);
        setMembershipStateContext(new MembershipStateContext(refreshed));
        setStateUpdateTrigger(p => p + 1);
      }
      addToast(`Member ${userId} approved.`, "success");
    } catch (err) { addToast("Failed to confirm.", "error"); }
  };

  const handleAdminDeclinePayment = async (transactionId: string, _userId: string, _userType: UserType) => {
    try {
      await paymentHook.failPayment(transactionId, "Declined by admin");
      if (membershipStateContext) {
        membershipStateContext.updateMembership({ status: "canceled" });
        setStateUpdateTrigger(p => p + 1);
      }
      addToast(`Payment declined.`, "error");
    } catch (err) { addToast("Failed.", "error"); }
  };

  const handleAdminVerifyOnlinePayment = async (transactionId: string, userId: string, _userType: UserType) => {
    try {
      await paymentHook.verifyOnlinePaymentProof(transactionId);
      const refreshed = await fetchUserMembership(userId);
      if (refreshed) {
        setMembership(refreshed);
        setMembershipStateContext(new MembershipStateContext(refreshed));
        setStateUpdateTrigger(p => p + 1);
      }
      addToast("Verified!", "success");
    } catch (err) { addToast("Failed.", "error"); }
  };

  const handleAdminRejectOnlinePayment = async (transactionId: string, _userId: string, _userType: UserType, reason: string) => {
    try {
      await paymentHook.rejectOnlinePaymentProof(transactionId, reason);
      if (membershipStateContext) {
        membershipStateContext.updateMembership({ status: "canceled" });
        setStateUpdateTrigger(p => p + 1);
      }
      addToast("Rejected.", "error");
    } catch (err) { addToast("Failed.", "error"); }
  };

  const value = {
    user, membership, membershipStateContext, attendanceSessionContext, stats, isAdmin, loading, actionLoading, error, toasts,
    showQR, qrValue, qrActionType, showFreezeModal, showPaymentModal, showPaymentConfirmation, showChangeMembershipModal,
    showSessionScanModal, sessionScanMode, selectedPlanTier, pendingMembershipTier, currentTransaction: paymentHook.state.currentTransaction ?? guestTransaction,
    showCheckInConfirmation,
    addToast, loadMembership, handleGenerateCheckIn, handleGenerateCheckOut, handleCloseQR, handleOpenSessionScanFromFab,
    handleCloseSessionScanModal, handleSelectMembershipTier, handleConfirmMembershipChange, handleCloseChangeMembership,
    handleApply, handleRenew, handleCancel, handleReactivate, handleRequestFreeze, handleWalkInApply, handleEndWalkInSession,
    handleInitiatePayment, handlePaymentComplete, clearError, setShowFreezeModal, setShowPaymentModal, setShowPaymentConfirmation,
    setShowChangeMembershipModal, setSelectedPlanTier, toggleAdminView: () => setIsAdmin(!isAdmin),
    handleAdminConfirmPayment, handleAdminDeclinePayment, handleAdminVerifyOnlinePayment, handleAdminRejectOnlinePayment,
    isSubscribedUser,
    sessionStage,
    plans: PLANS
  };

  return <MembershipContext.Provider value={value}>{children}</MembershipContext.Provider>;
};
