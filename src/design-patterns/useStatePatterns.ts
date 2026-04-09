/**
 * State Pattern Hooks - React hooks for managing state machines
 * 
 * These hooks provide easy integration of state pattern contexts
 * into React components, with automatic re-render triggers.
 */

import { useCallback, useReducer } from "react";
import {
  MembershipStateContext,
  AttendanceSessionContext,
  PaymentStateContext,
} from "./index";
import type { Membership } from "../types/membership";
import type { PaymentStatus } from "../types/payment";

/**
 * useMembershipState - Hook to manage membership state machine
 * 
 * @param membership - Initial membership object
 * @returns state context and action dispatchers
 * 
 * @example
 * const { state, checkIn, checkOut, cancel, renew } = useMembershipState(membership);
 * 
 * if (state.canPerformAction('checkIn')) {
 *   checkIn();
 * }
 */
export function useMembershipState(membership: Membership | null) {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const [context] = useReducer(() => {
    if (!membership) return null;
    return new MembershipStateContext(membership);
  }, null);

  const checkIn = useCallback(() => {
    if (context) {
      context.checkIn();
      forceUpdate();
    }
  }, [context]);

  const checkOut = useCallback(() => {
    if (context) {
      context.checkOut();
      forceUpdate();
    }
  }, [context]);

  const cancel = useCallback(() => {
    if (context) {
      context.cancel();
      forceUpdate();
    }
  }, [context]);

  const reactivate = useCallback(() => {
    if (context) {
      context.reactivate();
      forceUpdate();
    }
  }, [context]);

  const confirmPayment = useCallback(() => {
    if (context) {
      context.confirmPayment();
      forceUpdate();
    }
  }, [context]);

  const activate = useCallback(() => {
    if (context) {
      context.activate();
      forceUpdate();
    }
  }, [context]);

  const expire = useCallback(() => {
    if (context) {
      context.expire();
      forceUpdate();
    }
  }, [context]);

  return {
    state: context,
    checkIn,
    checkOut,
    cancel,
    reactivate,
    confirmPayment,
    activate,
    expire,
  };
}

/**
 * useAttendanceSession - Hook to manage attendance/session state machine
 * 
 * @param sessionType - 'regular' or 'walk-in' session type
 * @returns context and action dispatchers
 * 
 * @example
 * const { state, checkIn, checkOut, endSession } = useAttendanceSession('regular');
 */
export function useAttendanceSession(
  sessionType: "regular" | "walk-in" = "regular"
) {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const [context] = useReducer(
    () => new AttendanceSessionContext(sessionType),
    null,
    () => new AttendanceSessionContext(sessionType)
  );

  const checkIn = useCallback(() => {
    if (context) {
      context.checkIn();
      forceUpdate();
    }
  }, [context]);

  const checkOut = useCallback(() => {
    if (context) {
      context.checkOut();
      forceUpdate();
    }
  }, [context]);

  const startWalkIn = useCallback(() => {
    if (context) {
      context.startWalkIn();
      forceUpdate();
    }
  }, [context]);

  const endWalkInSession = useCallback(() => {
    if (context) {
      context.endWalkInSession();
      forceUpdate();
    }
  }, [context]);

  const resetToIdle = useCallback(() => {
    if (context) {
      context.resetToIdle();
      forceUpdate();
    }
  }, [context]);

  return {
    state: context,
    checkIn,
    checkOut,
    startWalkIn,
    endWalkInSession,
    resetToIdle,
  };
}

/**
 * usePaymentState - Hook to manage payment state machine
 * 
 * @returns context and action dispatchers
 * 
 * @example
 * const { state, initiate, confirm, fail } = usePaymentState();
 */
export function usePaymentState() {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const [context] = useReducer(
    () => new PaymentStateContext(),
    null,
    () => new PaymentStateContext()
  );

  const initiate = useCallback(() => {
    if (context) {
      context.initiate();
      forceUpdate();
    }
  }, [context]);

  const requiresConfirmation = useCallback(() => {
    if (context) {
      context.requiresAdminConfirmation();
      forceUpdate();
    }
  }, [context]);

  const requiresVerification = useCallback(() => {
    if (context) {
      context.requiresProofVerification();
      forceUpdate();
    }
  }, [context]);

  const confirm = useCallback(() => {
    if (context) {
      context.confirm();
      forceUpdate();
    }
  }, [context]);

  const fail = useCallback((reason?: string) => {
    if (context) {
      context.fail(reason);
      forceUpdate();
    }
  }, [context]);

  const reject = useCallback((reason?: string) => {
    if (context) {
      context.reject(reason);
      forceUpdate();
    }
  }, [context]);

  const retry = useCallback(() => {
    if (context) {
      context.retry();
      forceUpdate();
    }
  }, [context]);

  const hydrate = useCallback(
    (status: PaymentStatus, meta?: { failureReason?: string; rejectionReason?: string }) => {
      if (context) {
        context.hydrate(status, meta);
        forceUpdate();
      }
    },
    [context]
  );

  return {
    state: context,
    initiate,
    requiresConfirmation,
    requiresVerification,
    confirm,
    fail,
    reject,
    retry,
    hydrate,
  };
}
