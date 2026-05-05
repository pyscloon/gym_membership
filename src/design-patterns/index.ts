/**
 * Design Patterns Index
 * 
 * This module provides state design patterns for the gym membership system.
 * 
 * STATE DESIGN PATTERN OVERVIEW:
 * ==============================
 * 
 * The state design pattern encapsulates state-specific behavior and transitions
 * into dedicated state classes. This eliminates messy conditional logic and makes
 * the code more maintainable, testable, and extensible.
 * 
 * BENEFITS:
 * - Clear, explicit state machines (no boolean flags or loose conditions)
 * - Safe transitions (invalid transitions throw errors immediately)
 * - Single Responsibility: each state class handles one state
 * - Open/Closed: easy to add new states without modifying existing ones
 * - Better IDE support and type safety
 */

export type { IMembershipState } from "./state/MembershipState";
export {
  // Membership states
  PendingPaymentState,
  ApprovedState,
  ActiveState,
  CheckedInState,
  CanceledState,
  ExpiredState,
  MembershipStateContext,
} from "./state/MembershipState";

export type { IAttendanceState } from "./state/AttendanceState";
export {
  // Attendance/Session states
  IdleState,
  CheckedInState as AttendanceCheckedInState,
  CheckedOutState,
  WalkInActiveState,
  WalkInExpiredState,
  AttendanceSessionContext,
} from "./state/AttendanceState";

export type { IPaymentState } from "./state/PaymentState";
export {
  // Payment states
  IdlePaymentState,
  ProcessingPaymentState,
  AwaitingConfirmationPaymentState,
  AwaitingVerificationPaymentState,
  PaidPaymentState,
  FailedPaymentState,
  PaymentStateContext,
} from "./state/PaymentState";

export {
  // React hooks for state management
  useMembershipState,
  useAttendanceSession,
  usePaymentState,
} from "./state/useStatePatterns";

export {
  //factory pattern for subscription tier(monthly, semi-yearly, yearly)
  AccessType,
  MonthlyAccess,
  SemiYearlyAccess,
  YearlyAccess,
  AccessFactory,
} from "./factory/factory";
