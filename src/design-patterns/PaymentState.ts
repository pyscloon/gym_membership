/**
 * Payment State Design Pattern
 *
 * Models the payment processing lifecycle:
 * Idle -> Processing -> AwaitingConfirmation/AwaitingVerification -> Paid/Failed
 *
 * Each state defines:
 * - What information is relevant (e.g., only awaiting states have confirmation handlers)
 * - What transitions are valid
 * - What actions can be performed
 */

import type { PaymentStatus } from "../types/payment";

type PaymentReasonMeta = {
  failureReason?: string;
  rejectionReason?: string;
};

/**
 * Base interface for payment states
 */
export interface IPaymentState {
  readonly stateName: string;
  readonly canRetry: boolean;
  readonly canConfirm: boolean;
  readonly canReject: boolean;
  readonly isTerminal: boolean; // True if no further transitions possible

  toProcessing(): void;
  toAwaitingConfirmation(): void;
  toAwaitingVerification(): void;
  toPaid(): void;
  toFailed(): void;

  getDescription(): string;
  getActionPrompt(): string;
}

/**
 * Idle: No payment transaction initiated
 * Next state: Processing
 */
export class IdlePaymentState implements IPaymentState {
  readonly stateName = "idle";
  readonly canRetry = false;
  readonly canConfirm = false;
  readonly canReject = false;
  readonly isTerminal = false;

  private context: PaymentStateContext;

  constructor(context: PaymentStateContext) {
    this.context = context;
  }

  toProcessing(): void {
    this.context.setState(new ProcessingPaymentState(this.context));
  }

  toAwaitingConfirmation(): void {
    throw new Error("Cannot await confirmation from idle state");
  }

  toAwaitingVerification(): void {
    throw new Error("Cannot await verification from idle state");
  }

  toPaid(): void {
    throw new Error("Cannot complete payment from idle state");
  }

  toFailed(): void {
    throw new Error("No payment to fail");
  }

  getDescription(): string {
    return "Ready to initiate payment";
  }

  getActionPrompt(): string {
    return "Select a payment method to continue";
  }
}

/**
 * Processing: Payment is being processed
 * Next states: AwaitingConfirmation, AwaitingVerification, Paid, or Failed
 */
export class ProcessingPaymentState implements IPaymentState {
  readonly stateName = "processing";
  readonly canRetry = false;
  readonly canConfirm = false;
  readonly canReject = false;
  readonly isTerminal = false;

  private context: PaymentStateContext;

  constructor(context: PaymentStateContext) {
    this.context = context;
  }

  toProcessing(): void {
    throw new Error("Already processing");
  }

  toAwaitingConfirmation(): void {
    this.context.setState(new AwaitingConfirmationPaymentState(this.context));
  }

  toAwaitingVerification(): void {
    this.context.setState(new AwaitingVerificationPaymentState(this.context));
  }

  toPaid(): void {
    this.context.setState(new PaidPaymentState(this.context));
  }

  toFailed(): void {
    this.context.setState(new FailedPaymentState(this.context));
  }

  getDescription(): string {
    return "Processing your payment...";
  }

  getActionPrompt(): string {
    return "Please wait while we process your payment";
  }
}

/**
 * AwaitingConfirmation: Cash/other payment awaiting admin confirmation
 * Admin must confirm or reject
 */
export class AwaitingConfirmationPaymentState implements IPaymentState {
  readonly stateName = "awaiting-confirmation";
  readonly canRetry = false;
  readonly canConfirm = true; // Admin can confirm
  readonly canReject = true; // Admin can reject
  readonly isTerminal = false;

  private context: PaymentStateContext;

  constructor(context: PaymentStateContext) {
    this.context = context;
  }

  toProcessing(): void {
    throw new Error("Cannot return to processing from awaiting confirmation");
  }

  toAwaitingConfirmation(): void {
    throw new Error("Already awaiting confirmation");
  }

  toAwaitingVerification(): void {
    throw new Error("Cannot transition to verification - must confirm or reject first");
  }

  toPaid(): void {
    this.context.setState(new PaidPaymentState(this.context));
  }

  toFailed(): void {
    this.context.setState(new FailedPaymentState(this.context));
  }

  getDescription(): string {
    return "Your payment is awaiting admin confirmation. You'll be notified once confirmed.";
  }

  getActionPrompt(): string {
    return "Waiting for admin to review and confirm your payment";
  }
}

/**
 * AwaitingVerification: Online payment proof awaiting admin verification
 * Admin must verify the payment proof or reject it
 */
export class AwaitingVerificationPaymentState implements IPaymentState {
  readonly stateName = "awaiting-verification";
  readonly canRetry = false;
  readonly canConfirm = true; // Admin can verify
  readonly canReject = true; // Admin can reject with reason
  readonly isTerminal = false;

  private context: PaymentStateContext;

  constructor(context: PaymentStateContext) {
    this.context = context;
  }

  toProcessing(): void {
    throw new Error("Cannot return to processing");
  }

  toAwaitingConfirmation(): void {
    throw new Error("Already awaiting verification - must verify or reject");
  }

  toAwaitingVerification(): void {
    throw new Error("Already awaiting verification");
  }

  toPaid(): void {
    this.context.setState(new PaidPaymentState(this.context));
  }

  toFailed(): void {
    this.context.setState(new FailedPaymentState(this.context));
  }

  getDescription(): string {
    return "Your payment proof is being verified by an admin. You'll be notified once verified.";
  }

  getActionPrompt(): string {
    return "Admin is reviewing your payment proof";
  }
}

/**
 * Paid: Payment successfully completed
 * Terminal state - no more transitions
 */
export class PaidPaymentState implements IPaymentState {
  readonly stateName = "paid";
  readonly canRetry = false;
  readonly canConfirm = false;
  readonly canReject = false;
  readonly isTerminal = true;

  constructor(_context: PaymentStateContext) {
    void _context;
  }

  toProcessing(): void {
    throw new Error("Cannot reprocess paid payment");
  }

  toAwaitingConfirmation(): void {
    throw new Error("Payment already completed");
  }

  toAwaitingVerification(): void {
    throw new Error("Payment already completed");
  }

  toPaid(): void {
    throw new Error("Already paid");
  }

  toFailed(): void {
    throw new Error("Cannot fail a paid payment");
  }

  getDescription(): string {
    return "Payment successful! Your membership is now active.";
  }

  getActionPrompt(): string {
    return "Redirecting to your dashboard...";
  }
}

/**
 * Failed: Payment failed or was rejected
 * Terminal state - user must retry with new payment
 */
export class FailedPaymentState implements IPaymentState {
  readonly stateName = "failed";
  readonly canRetry = true; // User can try again
  readonly canConfirm = false;
  readonly canReject = false;
  readonly isTerminal = true;

  private context: PaymentStateContext;

  constructor(context: PaymentStateContext) {
    this.context = context;
  }

  toProcessing(): void {
    // Allow retry
    this.context.setState(new ProcessingPaymentState(this.context));
  }

  toAwaitingConfirmation(): void {
    throw new Error("Cannot await confirmation after failure - must retry");
  }

  toAwaitingVerification(): void {
    throw new Error("Cannot await verification after failure - must retry");
  }

  toPaid(): void {
    throw new Error("Cannot mark as paid after failure");
  }

  toFailed(): void {
    throw new Error("Already failed");
  }

  getDescription(): string {
    return "Payment could not be processed. Please try again.";
  }

  getActionPrompt(): string {
    return "Choose a different payment method or try again";
  }
}

/**
 * Context: Manages payment state and transitions
 */
export class PaymentStateContext {
  private currentState: IPaymentState;
  private failureReason?: string;
  private rejectionReason?: string;

  constructor() {
    this.currentState = new IdlePaymentState(this);
  }

  setState(state: IPaymentState): void {
    this.currentState = state;
  }

  private createStateFromName(stateName: PaymentStatus): IPaymentState {
    switch (stateName) {
      case "idle":
        return new IdlePaymentState(this);
      case "processing":
        return new ProcessingPaymentState(this);
      case "awaiting-confirmation":
        return new AwaitingConfirmationPaymentState(this);
      case "awaiting-verification":
        return new AwaitingVerificationPaymentState(this);
      case "paid":
        return new PaidPaymentState(this);
      case "failed":
        return new FailedPaymentState(this);
      default:
        return new IdlePaymentState(this);
    }
  }

  hydrate(stateName: PaymentStatus, meta: PaymentReasonMeta = {}): void {
    this.failureReason = meta.failureReason;
    this.rejectionReason = meta.rejectionReason;
    this.currentState = this.createStateFromName(stateName);
  }

  getState(): IPaymentState {
    return this.currentState;
  }

  // State transition methods
  initiate(): void {
    this.currentState.toProcessing();
  }

  requiresAdminConfirmation(): void {
    this.currentState.toAwaitingConfirmation();
  }

  requiresProofVerification(): void {
    this.currentState.toAwaitingVerification();
  }

  confirm(): void {
    this.currentState.toPaid();
  }

  fail(reason?: string): void {
    this.failureReason = reason;
    this.rejectionReason = undefined;
    this.currentState.toFailed();
  }

  reject(reason?: string): void {
    this.rejectionReason = reason;
    this.failureReason = undefined;
    this.currentState.toFailed();
  }

  retry(): void {
    this.failureReason = undefined;
    this.rejectionReason = undefined;
    this.currentState.toProcessing();
  }

  // Query methods
  canPerformAction(action: "confirm" | "reject" | "retry"): boolean {
    switch (action) {
      case "confirm":
        return this.currentState.canConfirm;
      case "reject":
        return this.currentState.canReject;
      case "retry":
        return this.currentState.canRetry;
      default:
        return false;
    }
  }

  isPaid(): boolean {
    return this.currentState.stateName === "paid";
  }

  isFailed(): boolean {
    return this.currentState.stateName === "failed";
  }

  isTerminal(): boolean {
    return this.currentState.isTerminal;
  }

  isAwaitingAction(): boolean {
    return (
      this.currentState.stateName === "awaiting-confirmation" ||
      this.currentState.stateName === "awaiting-verification"
    );
  }

  getStateName(): string {
    return this.currentState.stateName;
  }

  getDescription(): string {
    return this.currentState.getDescription();
  }

  getActionPrompt(): string {
    return this.currentState.getActionPrompt();
  }

  getFailureReason(): string | undefined {
    return this.failureReason;
  }

  getRejectionReason(): string | undefined {
    return this.rejectionReason;
  }
}
