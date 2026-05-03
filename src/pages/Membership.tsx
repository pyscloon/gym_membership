import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppTopBar from "../components/ui/AppTopBar";
import PaymentModal from "../components/PaymentModal";
import PaymentConfirmation from "../components/PaymentConfirmation";
import { useAuth } from "../hooks";
import { usePayment } from "../hooks/usePayment";
import { applyMembership } from "../lib/membershipService";
import { generateTransactionId } from "../lib/paymentSimulator";
import { MEMBERSHIP_PRICES, type PaymentMethod, type PaymentTransaction, type UserType } from "../types/payment";

type PlanId = "walk_in" | "monthly" | "semi_yearly" | "yearly";
type TabKey = "self_training" | "with_coach";

type PlanData = {
  id: PlanId;
  name: string;
  badge?: string;
  price: string;
  description: string;
  features: string[];
};

const PLANS: Record<TabKey, PlanData[]> = {
  self_training: [
    { id: "walk_in", name: "Walk-In Pass", badge: "ONE-TIME", price: "₱60", description: "Quick access for a single session.", features: ["No subscription", "24-hour validity", "Instant Entry"] },
    { id: "monthly", name: "Monthly", badge: "STARTER", price: "₱499", description: "Train on your schedule.", features: ["Flexible billing", "Full gym access", "Cancel anytime"] },
    { id: "semi_yearly", name: "Semi-Yearly", badge: "VALUE", price: "₱2,499", description: "Commit longer, save more.", features: ["Lower effective rate", "Priority slots", "Progress tracking"] },
    { id: "yearly", name: "Yearly", badge: "BEST PLAN", price: "₱3,999", description: "Maximum savings for elite goals.", features: ["Best yearly value", "Locked-in rate", "Long-term growth"] },
  ],
  with_coach: [
    { id: "monthly", name: "Monthly + Coach", price: "₱900", description: "Monthly guided training.", features: ["4 coaching sessions", "Group classes", "Fitness assessment"] },
    { id: "semi_yearly", name: "Semi-Yearly + Coach", price: "₱3,200", description: "Six months coaching.", features: ["Weekly check-ins", "Custom meal plan", "Progress tracking"] },
    { id: "yearly", name: "Yearly + Coach", price: "₱5,500", description: "Full year elite coaching.", features: ["Unlimited coaching", "Nutrition plan", "Priority booking"] },
  ],
};

const PLAN_THEMES: Record<PlanId, { gradient: string; serial: string }> = {
  walk_in: { gradient: "linear-gradient(135deg, #1d4ed8 0%, #001a4d 100%)", serial: "FLX-001" },
  monthly: { gradient: "linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)", serial: "FLX-002" },
  semi_yearly: { gradient: "linear-gradient(135deg, #1e3a8a 0%, #172554 100%)", serial: "FLX-003" },
  yearly: { gradient: "linear-gradient(135deg, #172554 0%, #020617 100%)", serial: "FLX-004" },
};

function PlanCard({
  plan,
  theme,
  isBackendEnabled,
  onConfirm,
  onWithCoachSelect,
}: {
  plan: PlanData;
  theme: { gradient: string; serial: string };
  isBackendEnabled: boolean;
  onConfirm: (planId: PlanId) => void;
  onWithCoachSelect?: () => void;
}) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsFlipped(!isFlipped);
  };

  const handleButtonClick = () => {
    if (!isBackendEnabled && onWithCoachSelect) {
      onWithCoachSelect();
    } else {
      onConfirm(plan.id);
    }
  };

  return (
    <div className="group perspective-1000 h-[280px] w-full cursor-pointer" onClick={handleFlip}>
      <div className={`relative h-full w-full transition-transform duration-700 preserve-3d ${isFlipped ? "rotate-y-180" : ""}`}>
        
        {/* FRONT SIDE */}
        <div className="absolute inset-0 backface-hidden rounded-[20px] shadow-xl overflow-hidden border border-white/10" style={{ background: theme.gradient }}>
          {/* Design Patterns */}
          <div className="absolute inset-0 bg-dot-matrix opacity-20"></div>
          <div className="absolute inset-0 bg-angular-lines opacity-10"></div>
          <div className="absolute inset-0 bg-executive-shine"></div>

          <div className="relative z-10 p-6 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-white/40 tracking-widest uppercase">Membership</span>
                {/* Gold Chip with Hover Shine Effect */}
                <div className="bg-gold-chip relative w-12 h-8 rounded-sm overflow-hidden shadow-lg border border-yellow-600/30 transition-transform duration-500 group-hover:scale-110">
                  <div className="absolute inset-0 bg-gold-sweep -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-2xl font-black text-white italic" style={{ fontFamily: "'Bebas Neue', 'Anton', sans-serif" }}>
                  {plan.name.toUpperCase()}
                </h3>
                <p className="text-[10px] text-white/50 tracking-widest uppercase">Flex Republic</p>
              </div>
            </div>

            <div className="flex justify-between items-end">
              <div>
                <p className="text-2xl font-black text-white">{plan.price}</p>
                <p className="text-[10px] text-white/60 uppercase">Flip for benefits • {theme.serial}</p>
              </div>
              <button
                onClick={handleButtonClick}
                className="relative cursor-pointer overflow-hidden rounded-xl border-none bg-black/90 py-3 px-6 text-[0.85rem] font-bold text-white transition-all duration-200 hover:scale-[1.05] hover:bg-black active:scale-[0.98] shadow-lg"
              >
                <span className="relative z-10">{isBackendEnabled ? "SELECT PLAN" : "CONTACT COACH"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* BACK SIDE */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-[20px] shadow-xl bg-[#020617] border border-white/10 p-6 flex flex-col">
          <h4 className="text-blue-400 font-bold mb-2 text-sm uppercase tracking-widest">Plan Benefits</h4>
          <p className="text-white/80 text-xs italic mb-4">"{plan.description}"</p>
          <ul className="space-y-2 flex-1">
            {plan.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-xs text-white/90">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-[10px]">✔</span>
                {feature}
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-white/40 text-center mt-4 uppercase">Click to flip back</p>
        </div>

      </div>
    </div>
  );
}

export default function MembershipPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const paymentHook = usePayment(user?.id);
  const { clearError } = paymentHook;

  const [activeTab, setActiveTab] = useState<TabKey>("self_training");
  const [selectedPlanTier, setSelectedPlanTier] = useState<UserType>("monthly");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [guestTransaction, setGuestTransaction] = useState<PaymentTransaction | null>(null);

  const handleSelectPlan = (planId: PlanId) => {
    setSelectedPlanTier(planId === "walk_in" ? "walk-in" : planId === "semi_yearly" ? "semi-yearly" : planId);
    clearError();
    setShowPaymentModal(true);
  };

  const handleWithCoachSelect = () => {
    navigate("/about-us#professional-staff");
  };

  const handleInitiatePayment = async (
    method: PaymentMethod,
    proof?: string,
    discountCategory?: unknown,
    discountIdProof?: unknown,
    voucherCode?: unknown,
    finalAmount?: number
  ) => {
    void discountCategory;
    void discountIdProof;
    void voucherCode;
    const amount = finalAmount ?? MEMBERSHIP_PRICES[selectedPlanTier];
    if (!user) {
      const transaction: PaymentTransaction = {
        id: generateTransactionId(),
        userId: "guest",
        userType: selectedPlanTier,
        amount,
        method,
        status: method === "online" ? "awaiting-verification" : "awaiting-confirmation",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        proofOfPaymentUrl: proof,
        paymentProofStatus: method === "online" ? "pending" : undefined,
      };
      setGuestTransaction(transaction);
      setShowPaymentModal(false);
      setShowPaymentConfirmation(true);
      return;
    }
    const tx = await paymentHook.initializePayment(user.id, selectedPlanTier, amount, method, proof);
    if (tx) { setShowPaymentModal(false); setShowPaymentConfirmation(true); }
  };

  const handlePaymentComplete = async () => {
    const transaction = paymentHook.state.currentTransaction ?? guestTransaction;
    if (!transaction) return;
    if (!user) { navigate("/subscription-tier"); return; }
    
    try {
      const response = await applyMembership(user.id, transaction.userType);
      if (response.success || response.error === "You already have an active membership") {
        navigate("/dashboard");
      } else {
        console.error("Membership application failed:", response.error);
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Unexpected error during membership application:", err);
      navigate("/dashboard");
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#00001a] text-white overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-30">
        <div className="absolute left-[-10%] top-[-10%] h-[50%] w-[50%] rounded-full bg-blue-900/40 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[50%] w-[50%] rounded-full bg-indigo-900/40 blur-[120px]" />
      </div>

      <AppTopBar />

      <main className="relative z-10 px-6 pt-28">
        <section className="mx-auto w-full max-w-4xl pb-12 text-center">
          <h1 className="mb-4 text-white uppercase" style={{ fontFamily: "'Bebas Neue', 'Anton', sans-serif", fontSize: "clamp(2.5rem, 6vw, 4.5rem)", letterSpacing: "1px" }}>
            Your <span className="text-blue-400">Fitness</span> Journey
          </h1>
        </section>

        <div className="mb-16 flex justify-center">
          <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-1.5 backdrop-blur-xl">
            {["self_training", "with_coach"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as TabKey)}
                className={`rounded-xl px-8 py-2.5 text-sm font-bold transition-all duration-300 ${activeTab === tab ? "bg-white text-black shadow-lg" : "text-white/50 hover:text-white"}`}
              >
                {tab.replace("_", " ").toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <section className="mx-auto w-full max-w-4xl pb-32">
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-10 ${activeTab === "with_coach" ? "justify-items-center" : ""}`}>
            {PLANS[activeTab].map((plan, index) => {
              const isLastAndOdd = activeTab === "with_coach" && index === PLANS[activeTab].length - 1 && index % 2 === 0;
              return (
                <div 
                  key={plan.id} 
                  className={`w-full ${isLastAndOdd ? "md:col-span-2 md:max-w-[calc(50%-20px)]" : ""}`}
                >
                  <PlanCard
                    plan={plan}
                    theme={PLAN_THEMES[plan.id]}
                    isBackendEnabled={activeTab === "self_training"}
                    onConfirm={handleSelectPlan}
                    onWithCoachSelect={handleWithCoachSelect}
                  />
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <PaymentModal
        isOpen={showPaymentModal}
        selectedUserType={selectedPlanTier}
        onSelectUserType={setSelectedPlanTier}
        onClose={() => setShowPaymentModal(false)}
        onInitiatePayment={handleInitiatePayment}
        isLoading={paymentHook.state.status === "processing"}
        error={paymentHook.state.error}
        onClearError={clearError}
      />

      <PaymentConfirmation
        transaction={paymentHook.state.currentTransaction ?? guestTransaction}
        isOpen={showPaymentConfirmation}
        onClose={() => setShowPaymentConfirmation(false)}
        onComplete={handlePaymentComplete}
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Anton&display=swap');
        
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        
        .bg-dot-matrix {
          background-image: radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px);
          background-size: 14px 14px;
        }

        .bg-angular-lines {
          background-image: 
            repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 20px),
            repeating-linear-gradient(-45deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 20px);
        }

        .bg-executive-shine {
          background: radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 0%, transparent 50%);
        }

        .bg-gold-chip {
          background: linear-gradient(135deg, 
            #bf953f 0%, 
            #fcf6ba 25%, 
            #b38728 50%, 
            #fbf5b7 75%, 
            #aa771c 100%
          );
        }

        .bg-gold-sweep {
          background: linear-gradient(
            to right,
            transparent 0%,
            rgba(255, 255, 255, 0) 40%,
            rgba(255, 255, 255, 0.6) 50%,
            rgba(255, 255, 255, 0) 60%,
            transparent 100%
          );
          width: 200%;
          height: 100%;
          transform: skewX(-20deg);
        }
      `}</style>
    </div>
  );
}

