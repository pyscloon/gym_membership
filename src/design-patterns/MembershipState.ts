/**
 * Membership State Design Pattern
 * 
 * Models the complete lifecycle of a gym membership:
 * PendingPayment → Approved → Active → Checked In/Out → Expired/Canceled
 * 
 * This pattern eliminates messy conditional logic by encapsulating state-specific
 * behavior and allowed transitions in dedicated state classes.
 */

import type { Membership, MembershipTier } from "../types/membership";
import type { PaymentTransaction } from "../types/payment";

/**
 * Base interface that all membership states must implement
 * Defines the contract for what actions are allowed in each state
 */
export interface IMembershipState {
  readonly stateName: string;
  readonly isActive: boolean;
  readonly canCheckIn: boolean;
  readonly canCheckOut: boolean;
  readonly canRenew: boolean;
  readonly canCancel: boolean;
  readonly canReactivate: boolean;
  readonly canPay: boolean;

  // State transition methods - only valid ones for current state
  toPendingPayment(): void;
  toApproved(): void;
  toActive(): void;
  toCheckedIn(): void;
  toCheckedOut(): void;
  toCanceled(): void;
  toExpired(): void;
  toReactivated(): void;

  // Utilities
  getDescription(): string;
  getAllowedActions(): string[];
}

/**
 * PendingPayment: User applied but payment not yet confirmed
 * Allowed transitions: toApproved (payment confirmed), toCanceled (payment denied)
 */
export class PendingPaymentState implements IMembershipState {
  readonly stateName = "pending";
  readonly isActive = false;
  readonly canCheckIn = false;
  readonly canCheckOut = false;
  readonly canRenew = false;
  readonly canCancel = true;
  readonly canReactivate = false;
  readonly canPay = true;

  private context: MembershipStateContext;

  constructor(context: MembershipStateContext) {
    this.context = context;
  }

  toPendingPayment(): void {
    throw new Error("Already in pending payment state");
  }

  toApproved(): void {
    this.context.setState(new ApprovedState(this.context));
  }

  toActive(): void {
    this.context.setState(new ActiveState(this.context));
  }

  toCheckedIn(): void {
    throw new Error("Cannot check in - payment not approved");
  }

  toCheckedOut(): void {
    throw new Error("Cannot check out - payment not approved");
  }

  toCanceled(): void {
    this.context.setState(new CanceledState(this.context));
  }

  toExpired(): void {
    throw new Error("Cannot expire - payment pending");
  }

  toReactivated(): void {
    throw new Error("Cannot reactivate pending membership - approve payment first");
  }

  getDescription(): string {
    return "Awaiting payment confirmation. Your membership will activate once confirmed.";
  }

  getAllowedActions(): string[] {
    return ["cancel"];
  }
}

/**
 * Approved: Payment confirmed by admin but membership not yet active
 * (Transitional state after payment approval)
 * Allowed transitions: toActive
 */
export class ApprovedState implements IMembershipState {
  readonly stateName = "approved";
  readonly isActive = false;
  readonly canCheckIn = false;
  readonly canCheckOut = false;
  readonly canRenew = false;
  readonly canCancel = true;
  readonly canReactivate = false;
  readonly canPay = false;

  private context: MembershipStateContext;

  constructor(context: MembershipStateContext) {
    this.context = context;
  }

  toPendingPayment(): void {
    throw new Error("Cannot revert to pending payment");
  }

  toApproved(): void {
    throw new Error("Already approved");
  }

  toActive(): void {
    this.context.setState(new ActiveState(this.context));
  }

  toCheckedIn(): void {
    throw new Error("Must activate membership before checking in");
  }

  toCheckedOut(): void {
    throw new Error("Must activate membership before checking out");
  }

  toCanceled(): void {
    this.context.setState(new CanceledState(this.context));
  }

  toExpired(): void {
    throw new Error("Cannot expire approved membership - must be active");
  }

  toReactivated(): void {
    throw new Error("Cannot reactivate - membership not yet active");
  }

  getDescription(): string {
    return "Payment approved! Your membership is being activated.";
  }

  getAllowedActions(): string[] {
    return ["cancel"];
  }
}

/**
 * Active: Membership is valid and can be used
 * Allowed transitions: toCheckedIn, toCanceled, toExpired, toCheckedOut
 */
export class ActiveState implements IMembershipState {
  readonly stateName = "active";
  readonly isActive = true;
  readonly canCheckIn = true;
  readonly canCheckOut = false; // Must check in first
  readonly canRenew = true;
  readonly canCancel = true;
  readonly canReactivate = false; // Not canceled
  readonly canPay = false;

  private context: MembershipStateContext;

  constructor(context: MembershipStateContext) {
    this.context = context;
  }

  toPendingPayment(): void {
    throw new Error("Cannot revert to pending payment");
  }

  toApproved(): void {
    throw new Error("Already active");
  }

  toActive(): void {
    throw new Error("Already active");
  }

  toCheckedIn(): void {
    this.context.setState(new CheckedInState(this.context));
  }

  toCheckedOut(): void {
    throw new Error("Must check in first");
  }

  toCanceled(): void {
    this.context.setState(new CanceledState(this.context));
  }

  toExpired(): void {
    this.context.setState(new ExpiredState(this.context));
  }

  toReactivated(): void {
    throw new Error("Membership is not canceled");
  }

  getDescription(): string {
    return "Your membership is active! You can access the gym.";
  }

  getAllowedActions(): string[] {
    return ["checkIn", "renew", "cancel"];
  }
}

/**
 * CheckedIn: Member is currently using the gym
 * Allowed transitions: toCheckedOut, toExpired
 */
export class CheckedInState implements IMembershipState {
  readonly stateName = "checked-in";
  readonly isActive = true;
  readonly canCheckIn = false; // Already checked in
  readonly canCheckOut = true;
  readonly canRenew = true; // Can renew while checked in
  readonly canCancel = false; // Can't cancel while using gym
  readonly canReactivate = false;
  readonly canPay = false;

  private context: MembershipStateContext;

  constructor(context: MembershipStateContext) {
    this.context = context;
  }

  toPendingPayment(): void {
    throw new Error("Cannot revert to pending payment");
  }

  toApproved(): void {
    throw new Error("Cannot move to approved while checked in");
  }

  toActive(): void {
    throw new Error("Already checked in (active state)");
  }

  toCheckedIn(): void {
    throw new Error("Already checked in");
  }

  toCheckedOut(): void {
    this.context.setState(new ActiveState(this.context));
  }

  toCanceled(): void {
    throw new Error("Cannot cancel while checked in");
  }

  toExpired(): void {
    this.context.setState(new ExpiredState(this.context));
  }

  toReactivated(): void {
    throw new Error("Membership is not canceled");
  }

  getDescription(): string {
    return "You're checked in! Don't forget to check out when you leave.";
  }

  getAllowedActions(): string[] {
    return ["checkOut", "renew"];
  }
}

/**
 * Canceled: User cancelled membership (pending period end)
 * Can reactivate before period ends
 * Allowed transitions: toReactivated, toExpired
 */
export class CanceledState implements IMembershipState {
  readonly stateName = "canceled";
  readonly isActive = false;
  readonly canCheckIn = false;
  readonly canCheckOut = false;
  readonly canRenew = false;
  readonly canCancel = false; // Already canceled
  readonly canReactivate = true;
  readonly canPay = false;

  private context: MembershipStateContext;

  constructor(context: MembershipStateContext) {
    this.context = context;
  }

  toPendingPayment(): void {
    throw new Error("Cannot revert to pending payment");
  }

  toApproved(): void {
    throw new Error("Cannot approve canceled membership");
  }

  toActive(): void {
    throw new Error("Cannot activate canceled membership - must reactivate");
  }

  toCheckedIn(): void {
    throw new Error("Cannot check in - membership canceled");
  }

  toCheckedOut(): void {
    throw new Error("Cannot check out - membership canceled");
  }

  toCanceled(): void {
    throw new Error("Already canceled");
  }

  toExpired(): void {
    this.context.setState(new ExpiredState(this.context));
  }

  toReactivated(): void {
    this.context.setState(new ActiveState(this.context));
  }

  getDescription(): string {
    return "Your membership has been cancelled. You'll retain access until the renewal date.";
  }

  getAllowedActions(): string[] {
    return ["reactivate"];
  }
}

/**
 * Expired: Membership period ended, no longer valid
 * Must apply for new membership
 * Allowed transitions: toPendingPayment (new application)
 */
export class ExpiredState implements IMembershipState {
  readonly stateName = "expired";
  readonly isActive = false;
  readonly canCheckIn = false;
  readonly canCheckOut = false;
  readonly canRenew = false;
  readonly canCancel = false;
  readonly canReactivate = false;
  readonly canPay = true; // Can apply for new membership

  private context: MembershipStateContext;

  constructor(context: MembershipStateContext) {
    this.context = context;
  }

  toPendingPayment(): void {
    this.context.setState(new PendingPaymentState(this.context));
  }

  toApproved(): void {
    throw new Error("Cannot approve expired membership - apply for new one");
  }

  toActive(): void {
    throw new Error("Cannot activate expired membership - apply for new one");
  }

  toCheckedIn(): void {
    throw new Error("Cannot check in - membership expired");
  }

  toCheckedOut(): void {
    throw new Error("Cannot check out - membership expired");
  }

  toCanceled(): void {
    throw new Error("Already expired");
  }

  toExpired(): void {
    throw new Error("Already expired");
  }

  toReactivated(): void {
    throw new Error("Cannot reactivate expired membership - must apply for new one");
  }

  getDescription(): string {
    return "Your membership has expired. Apply for a new plan to continue.";
  }

  getAllowedActions(): string[] {
    return ["applyNew"];
  }
}

/**
 * Context: Manages current state and coordinates state transitions
 */
export class MembershipStateContext {
  private currentState: IMembershipState;
  private membership: Membership;

  constructor(membership: Membership) {
    this.membership = membership;
    this.currentState = this.initializeState(membership);
  }

  private initializeState(membership: Membership): IMembershipState {
    switch (membership.status) {
      case "pending":
        return new PendingPaymentState(this);
      case "active":
        return new ActiveState(this);
      case "canceled":
        return new CanceledState(this);
      case "expired":
        return new ExpiredState(this);
      default:
        return new ActiveState(this);
    }
  }

  setState(state: IMembershipState): void {
    this.currentState = state;
  }

  getState(): IMembershipState {
    return this.currentState;
  }

  getMembership(): Membership {
    return this.membership;
  }

  updateMembership(updates: Partial<Membership>): void {
    this.membership = { ...this.membership, ...updates };
  }

  // Public interface for state transitions
  checkIn(): void {
    this.currentState.toCheckedIn();
  }

  checkOut(): void {
    this.currentState.toCheckedOut();
  }

  cancel(): void {
    this.currentState.toCanceled();
  }

  reactivate(): void {
    this.currentState.toReactivated();
  }

  confirmPayment(): void {
    this.currentState.toApproved();
  }

  activate(): void {
    this.currentState.toActive();
  }

  expire(): void {
    this.currentState.toExpired();
  }

  // Query methods
  canPerformAction(action: "checkIn" | "checkOut" | "renew" | "cancel" | "reactivate" | "pay"): boolean {
    switch (action) {
      case "checkIn":
        return this.currentState.canCheckIn;
      case "checkOut":
        return this.currentState.canCheckOut;
      case "renew":
        return this.currentState.canRenew;
      case "cancel":
        return this.currentState.canCancel;
      case "reactivate":
        return this.currentState.canReactivate;
      case "pay":
        return this.currentState.canPay;
      default:
        return false;
    }
  }

  isActive(): boolean {
    return this.currentState.isActive;
  }

  getStateName(): string {
    return this.currentState.stateName;
  }

  getDescription(): string {
    return this.currentState.getDescription();
  }

  getAllowedActions(): string[] {
    return this.currentState.getAllowedActions();
  }
}
