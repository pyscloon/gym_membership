/**
 * Attendance Session State Design Pattern
 * 
 * Models the check-in/check-out lifecycle within a single gym visit:
 * Idle → CheckedIn → CheckedOut (for regular members)
 * WalkInActive → WalkInCheckedIn/Out → WalkInExpired (for walk-ins)
 * 
 * Prevents invalid state transitions like checking out without checking in,
 * or attempting actions after session expires.
 */

/**
 * Base interface for attendance session states
 */
export interface IAttendanceState {
  readonly stateName: string;
  readonly isSessionActive: boolean;
  readonly canCheckIn: boolean;
  readonly canCheckOut: boolean;
  readonly canEndSession: boolean;

  toIdle(): void;
  toCheckedIn(): void;
  toCheckedOut(): void;
  toWalkInActive(): void;
  toWalkInExpired(): void;

  getDescription(): string;
  getAllowedActions(): string[];
}

/**
 * Idle: Member is not checked in
 * Next valid state: CheckedIn or WalkInActive
 */
export class IdleState implements IAttendanceState {
  readonly stateName = "idle";
  readonly isSessionActive = false;
  readonly canCheckIn = true;
  readonly canCheckOut = false;
  readonly canEndSession = false;

  private context: AttendanceSessionContext;

  constructor(context: AttendanceSessionContext) {
    this.context = context;
  }

  toIdle(): void {
    throw new Error("Already idle");
  }

  toCheckedIn(): void {
    this.context.setState(new CheckedInState(this.context));
  }

  toCheckedOut(): void {
    throw new Error("Cannot check out - not checked in");
  }

  toWalkInActive(): void {
    this.context.setState(new WalkInActiveState(this.context));
  }

  toWalkInExpired(): void {
    throw new Error("Invalid state transition from idle to walk-in expired");
  }

  getDescription(): string {
    return "Not checked in. Scan your QR code to check in.";
  }

  getAllowedActions(): string[] {
    return ["checkIn", "startWalkIn"];
  }
}

/**
 * CheckedIn: Member is currently using the gym
 * Next valid state: CheckedOut or Idle
 */
export class CheckedInState implements IAttendanceState {
  readonly stateName = "checked-in";
  readonly isSessionActive = true;
  readonly canCheckIn = false; // Already checked in
  readonly canCheckOut = true;
  readonly canEndSession = true;

  private context: AttendanceSessionContext;

  constructor(context: AttendanceSessionContext) {
    this.context = context;
  }

  toIdle(): void {
    this.context.setState(new IdleState(this.context));
  }

  toCheckedIn(): void {
    throw new Error("Already checked in");
  }

  toCheckedOut(): void {
    this.context.setState(new CheckedOutState(this.context));
  }

  toWalkInActive(): void {
    throw new Error("Cannot transition to walk-in while checked in");
  }

  toWalkInExpired(): void {
    throw new Error("Cannot transition to walk-in expired while checked in");
  }

  getDescription(): string {
    return "You're checked in! Don't forget to check out when you leave.";
  }

  getAllowedActions(): string[] {
    return ["checkOut"];
  }
}

/**
 * CheckedOut: Member has checked out during current visit
 * (Completed session)
 * Next valid state: Idle
 */
export class CheckedOutState implements IAttendanceState {
  readonly stateName = "checked-out";
  readonly isSessionActive = false;
  readonly canCheckIn = true; // Can check in again later
  readonly canCheckOut = false; // Already checked out
  readonly canEndSession = false;

  private context: AttendanceSessionContext;

  constructor(context: AttendanceSessionContext) {
    this.context = context;
  }

  toIdle(): void {
    this.context.setState(new IdleState(this.context));
  }

  toCheckedIn(): void {
    this.context.setState(new CheckedInState(this.context));
  }

  toCheckedOut(): void {
    throw new Error("Already checked out");
  }

  toWalkInActive(): void {
    throw new Error("Invalid state transition");
  }

  toWalkInExpired(): void {
    throw new Error("Invalid state transition");
  }

  getDescription(): string {
    return "Session ended. Great workout!";
  }

  getAllowedActions(): string[] {
    return ["checkIn"]; // Can check in again
  }
}

/**
 * WalkInActive: Walk-in session is active (24 hours valid)
 * Next valid states: WalkInExpired, Idle (manual end)
 */
export class WalkInActiveState implements IAttendanceState {
  readonly stateName = "walk-in-active";
  readonly isSessionActive = true;
  readonly canCheckIn = true; // Can check in during walk-in
  readonly canCheckOut = true; // Can check out
  readonly canEndSession = true; // Can manually end session

  private context: AttendanceSessionContext;

  constructor(context: AttendanceSessionContext) {
    this.context = context;
  }

  toIdle(): void {
    this.context.setState(new IdleState(this.context));
  }

  toCheckedIn(): void {
    this.context.setState(new CheckedInState(this.context));
  }

  toCheckedOut(): void {
    this.context.setState(new CheckedOutState(this.context));
  }

  toWalkInActive(): void {
    throw new Error("Already in walk-in active state");
  }

  toWalkInExpired(): void {
    this.context.setState(new WalkInExpiredState(this.context));
  }

  getDescription(): string {
    return "Your 24-hour walk-in pass is active! You can check in and out as needed.";
  }

  getAllowedActions(): string[] {
    return ["checkIn", "checkOut", "endSession"];
  }
}

/**
 * WalkInExpired: Walk-in session has expired (24 hours passed)
 * No more actions allowed
 * Must purchase new walk-in pass
 */
export class WalkInExpiredState implements IAttendanceState {
  readonly stateName = "walk-in-expired";
  readonly isSessionActive = false;
  readonly canCheckIn = false;
  readonly canCheckOut = false;
  readonly canEndSession = false;

  private context: AttendanceSessionContext;

  constructor(context: AttendanceSessionContext) {
    this.context = context;
  }

  toIdle(): void {
    this.context.setState(new IdleState(this.context));
  }

  toCheckedIn(): void {
    throw new Error("Walk-in session expired - purchase a new pass");
  }

  toCheckedOut(): void {
    throw new Error("Walk-in session expired - cannot check out");
  }

  toWalkInActive(): void {
    throw new Error("Session expired - purchase a new walk-in pass");
  }

  toWalkInExpired(): void {
    throw new Error("Already expired");
  }

  getDescription(): string {
    return "Your 24-hour walk-in pass has expired. Purchase a new pass to continue.";
  }

  getAllowedActions(): string[] {
    return ["buyNewPass"];
  }
}

/**
 * Context: Manages attendance session state
 */
export class AttendanceSessionContext {
  private currentState: IAttendanceState;
  private startTime: Date;
  private checkInTime?: Date;
  private checkOutTime?: Date;
  private sessionType: "regular" | "walk-in";

  constructor(sessionType: "regular" | "walk-in" = "regular") {
    this.sessionType = sessionType;
    this.startTime = new Date();
    this.currentState =
      sessionType === "walk-in"
        ? new WalkInActiveState(this)
        : new IdleState(this);
  }

  setState(state: IAttendanceState): void {
    this.currentState = state;
  }

  getState(): IAttendanceState {
    return this.currentState;
  }

  // State transition methods
  checkIn(): void {
    this.checkInTime = new Date();
    this.currentState.toCheckedIn();
  }

  checkOut(): void {
    this.checkOutTime = new Date();
    this.currentState.toCheckedOut();
  }

  startWalkIn(): void {
    this.sessionType = "walk-in";
    this.currentState.toWalkInActive();
  }

  endWalkInSession(): void {
    this.currentState.toWalkInExpired();
  }

  resetToIdle(): void {
    this.currentState.toIdle();
  }

  // Query methods
  canPerformAction(action: "checkIn" | "checkOut" | "endSession"): boolean {
    switch (action) {
      case "checkIn":
        return this.currentState.canCheckIn;
      case "checkOut":
        return this.currentState.canCheckOut;
      case "endSession":
        return this.currentState.canEndSession;
      default:
        return false;
    }
  }

  isSessionActive(): boolean {
    return this.currentState.isSessionActive;
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

  getSessionDuration(): number {
    const endTime = this.checkOutTime || new Date();
    if (!this.checkInTime) return 0;
    return endTime.getTime() - this.checkInTime.getTime();
  }

  getSessionInfo() {
    return {
      type: this.sessionType,
      state: this.currentState.stateName,
      startTime: this.startTime,
      checkInTime: this.checkInTime,
      checkOutTime: this.checkOutTime,
      duration: this.getSessionDuration(),
      isActive: this.isSessionActive(),
    };
  }
}
