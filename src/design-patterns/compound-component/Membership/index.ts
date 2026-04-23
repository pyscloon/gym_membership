import { MembershipProvider } from './MembershipContext';
import {
  MembershipStatus,
  MembershipDetails,
  MembershipAccess,
  MembershipActions,
  MembershipFreezeModal,
  MembershipPaymentFlow,
  MembershipToasts,
  MembershipSkeleton,
  MembershipError,
  MembershipSessionScanModal,
  MembershipChangePlanModal
} from './MembershipComponents';

export const Membership = {
  Provider: MembershipProvider,
  Status: MembershipStatus,
  Details: MembershipDetails,
  Access: MembershipAccess,
  Actions: MembershipActions,
  FreezeModal: MembershipFreezeModal,
  PaymentFlow: MembershipPaymentFlow,
  Toasts: MembershipToasts,
  Skeleton: MembershipSkeleton,
  Error: MembershipError,
  SessionScanModal: MembershipSessionScanModal,
  ChangePlanModal: MembershipChangePlanModal,
};
