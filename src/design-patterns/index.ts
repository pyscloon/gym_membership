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
 * 
 * USAGE EXAMPLES:
 * ==============
 * 
 * // Membership States
 * import { MembershipStateContext } from './design-patterns/MembershipState';
 * 
 * const context = new MembershipStateContext(membership);
 * 
 * // Safe, type-safe transitions
 * if (context.canPerformAction('checkIn')) {
 *   context.checkIn(); // Only succeeds if state allows it
 * }
 * 
 * // Query state information
 * console.log(context.getStateName()); // 'active'
 * console.log(context.getDescription()); // User-friendly description
 * console.log(context.getAllowedActions()); // ['checkIn', 'renew', 'cancel']
 * 
 * // Invalid transitions throw descriptive errors
 * try {
 *   context.checkOut(); // Throws: "Must check in first"
 * } catch (e) {
 *   console.error(e.message);
 * }
 * 
 * // Attendance/Session States
 * import { AttendanceSessionContext } from './design-patterns/AttendanceState';
 * 
 * const session = new AttendanceSessionContext('regular');
 * session.checkIn();
 * session.checkOut();
 * 
 * const walkIn = new AttendanceSessionContext('walk-in');
 * walkIn.endWalkInSession(); // Valid transition
 * 
 * // Payment States
 * import { PaymentStateContext } from './design-patterns/PaymentState';
 * 
 * const payment = new PaymentStateContext();
 * payment.initiate();
 * 
 * if (payment.canPerformAction('confirm')) {
 *   payment.confirm();
 * } else if (payment.canPerformAction('retry')) {
 *   payment.retry();
 * }
 * 
 * // React Hooks (easier integration)
 * import { useMembershipState, useAttendanceSession, usePaymentState } from './design-patterns';
 * 
 * const { state, checkIn, cancel } = useMembershipState(membership);
 */

export type { IMembershipState } from "./MembershipState";
export {
  // Membership states
  PendingPaymentState,
  ApprovedState,
  ActiveState,
  CheckedInState,
  CanceledState,
  ExpiredState,
  MembershipStateContext,
} from "./MembershipState";

export type { IAttendanceState } from "./AttendanceState";
export {
  // Attendance/Session states
  IdleState,
  CheckedInState as AttendanceCheckedInState,
  CheckedOutState,
  WalkInActiveState,
  WalkInExpiredState,
  AttendanceSessionContext,
} from "./AttendanceState";

export type { IPaymentState } from "./PaymentState";
export {
  // Payment states
  IdlePaymentState,
  ProcessingPaymentState,
  AwaitingConfirmationPaymentState,
  AwaitingVerificationPaymentState,
  PaidPaymentState,
  FailedPaymentState,
  PaymentStateContext,
} from "./PaymentState";

export {
  // React hooks for state management
  useMembershipState,
  useAttendanceSession,
  usePaymentState,
} from "./useStatePatterns";

export {
  //factory pattern for subscription tier(monthly, semi-yearly, yearly)
  AccessType,
  MonthlyAccess,
  SemiYearlyAccess,
  YearlyAccess,
  AccessFactory,
} from "./factory/factory";
