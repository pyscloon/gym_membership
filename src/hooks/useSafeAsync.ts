/**
 * 🎣 useSafeAsync - React hook for safe async operations
 * Prevents "setState on unmounted component" errors and handles failures gracefully
 */

import { useEffect, useRef, useState } from "react";
import { executeWithRetry, withTimeout, DEFAULT_RETRY_CONFIG, type RetryConfig } from "../lib/stabilityUtils";

export interface UseSafeAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseSafeAsyncOptions {
  retryConfig?: RetryConfig;
  timeoutMs?: number;
  autoFetch?: boolean;
}

/**
 * Safe async hook that prevents unmount errors
 * @param asyncFn - Async function to execute
 * @param dependency - Dependency array for re-execution
 * @param options - Configuration options
 */
export function useSafeAsync<T>(
  asyncFn: () => Promise<T>,
  dependency: React.DependencyList = [],
  options: UseSafeAsyncOptions = {}
): UseSafeAsyncState<T> & { refetch: () => Promise<void> } {
  const [state, setState] = useState<UseSafeAsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(new AbortController());

  const {
    retryConfig = DEFAULT_RETRY_CONFIG,
    timeoutMs = 30000,
    autoFetch = true,
  } = options;

  const refetch = async () => {
    if (!isMountedRef.current) return;

    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      // Create a wrapper that respects abort signal
      const result = await executeWithRetry(
        async () => {
          if (abortControllerRef.current.signal.aborted) {
            throw new Error("Operation aborted");
          }
          return await withTimeout(asyncFn(), timeoutMs, "Async operation timed out");
        },
        asyncFn.name || "async operation",
        retryConfig
      );

      if (isMountedRef.current) {
        if (result !== null) {
          setState({
            data: result,
            loading: false,
            error: null,
          });
        } else {
          setState({
            data: null,
            loading: false,
            error: new Error("Operation failed after retries"),
          });
        }
      }
    } catch (err) {
      if (isMountedRef.current && !abortControllerRef.current.signal.aborted) {
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    abortControllerRef.current = new AbortController();

    if (autoFetch) {
      refetch();
    }

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current.abort();
    };
  }, dependency);

  return {
    ...state,
    refetch,
  };
}

/**
 * Hook for managing multiple async operations with coordination
 * Useful for dashboard with multiple data sources
 */
export function useMultipleSafeAsync<T extends Record<string, any>>(
  asyncFns: Record<keyof T, () => Promise<any>>,
  dependency: React.DependencyList = [],
  options: UseSafeAsyncOptions = {}
) {
  const [state, setState] = useState<Record<keyof T, UseSafeAsyncState<any>>>(() =>
    Object.keys(asyncFns).reduce(
      (acc, key) => ({
        ...acc,
        [key]: { data: null, loading: true, error: null },
      }),
      {} as Record<keyof T, UseSafeAsyncState<any>>
    )
  );

  const isMountedRef = useRef(true);

  const refetchAll = async () => {
    if (!isMountedRef.current) return;

    const results = await Promise.all(
      Object.entries(asyncFns).map(async ([key, fn]) => {
        try {
          const result = await executeWithRetry(fn as any, key as string, options.retryConfig);
          return [key, { data: result, loading: false, error: null }] as const;
        } catch (err) {
          return [
            key,
            {
              data: null,
              loading: false,
              error: err instanceof Error ? err : new Error(String(err)),
            },
          ] as const;
        }
      })
    );

    if (isMountedRef.current) {
      setState((prev) => ({
        ...prev,
        ...Object.fromEntries(results),
      }));
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    if (options.autoFetch !== false) {
      refetchAll();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, dependency);

  const isLoading = Object.values(state).some((s) => s.loading);
  const hasError = Object.values(state).some((s) => s.error);
  const allErrors = Object.values(state)
    .filter((s) => s.error)
    .map((s) => s.error?.message)
    .filter(Boolean);

  return {
    state,
    isLoading,
    hasError,
    errors: allErrors,
    refetchAll,
  };
}
