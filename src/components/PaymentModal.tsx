import { PaymentSystem } from "../design-patterns/compound-component/Payment";
import type { UserType, PaymentMethod } from "../types/payment";

import type { DiscountCategory } from "../design-patterns/compound-component/Payment/PaymentContext";

interface PaymentModalProps {
  isOpen: boolean;
  selectedUserType: UserType;
  onSelectUserType?: (userType: UserType) => void;
  onClose: () => void;
  onInitiatePayment: (
    method: PaymentMethod,
    proofOfPayment?: string,
    discountCategory?: DiscountCategory,
    discountIdProof?: string,
    voucherCode?: string,
    finalAmount?: number
  ) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  onClearError: () => void;
}

/**
 * PaymentModal - User-facing payment selection and confirmation UI
 * Refactored using the Compound Component Design Pattern.
 * Logic for price calculation (Decorator Pattern) is encapsulated in PaymentSystem.Provider.
 */
export default function PaymentModal(props: PaymentModalProps) {
  return (
    <PaymentSystem.Provider {...props}>
      <PaymentSystem.Container>
        <PaymentSystem.Header />
        <PaymentSystem.Error />
        <PaymentSystem.TierSelector />
        <PaymentSystem.AmountDisplay />
        <PaymentSystem.DiscountSection />
        <PaymentSystem.VoucherSection />
        <PaymentSystem.MethodSection />
        <PaymentSystem.ProofSection />
        <PaymentSystem.Footer />
      </PaymentSystem.Container>
    </PaymentSystem.Provider>
  );
}