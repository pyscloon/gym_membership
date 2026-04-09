/**
 * 🛡️ ErrorBoundary - Catches React component errors gracefully
 * Prevents entire dashboard from crashing on component failure
 */

import React, { type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="w-full p-6 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-lg font-semibold text-red-900">Something went wrong</h3>
            <p className="mt-2 text-sm text-red-700">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reload Page
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * Error Fallback UI Component
 */
export function ErrorFallback({
  error,
  message,
}: {
  error?: Error;
  message?: string;
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
          <svg
            className="h-6 w-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4v2m0 0l-6-3-6 3v6l6 3 6-3v-6l-6-3zm0 0l6-3 6 3v6l-6 3-6-3v-6z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-red-900">Error</h4>
          <p className="mt-1 text-sm text-red-700">{message || error?.message || "An error occurred"}</p>
        </div>
      </div>
    </div>
  );
}
