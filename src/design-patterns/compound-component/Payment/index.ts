import { PaymentProvider } from './PaymentContext';
import {
  PaymentContainer,
  PaymentHeader,
  PaymentError,
  PaymentTierSelector,
  PaymentAmountDisplay,
  PaymentDiscountSection,
  PaymentVoucherSection,
  PaymentMethodSection,
  PaymentProofSection,
  PaymentFooter
} from './PaymentComponents';

export const PaymentSystem = {
  Provider: PaymentProvider,
  Container: PaymentContainer,
  Header: PaymentHeader,
  Error: PaymentError,
  TierSelector: PaymentTierSelector,
  AmountDisplay: PaymentAmountDisplay,
  DiscountSection: PaymentDiscountSection,
  VoucherSection: PaymentVoucherSection,
  MethodSection: PaymentMethodSection,
  ProofSection: PaymentProofSection,
  Footer: PaymentFooter,
};
