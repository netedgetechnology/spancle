'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error:    Error | null;
}

interface ErrorBoundaryProps {
  children:   React.ReactNode;
  fallback?:  (error: Error, reset: () => void) => React.ReactNode;
}

/**
 * ErrorBoundary — catches React render errors in the component tree.
 *
 * Must be a class component (React error boundary requirement).
 * Provides a default fallback UI and a reset mechanism.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <RiskyComponent />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // In production, send to error monitoring (Sentry, Datadog, etc.)
    if (process.env['NODE_ENV'] !== 'production') {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  reset(): void {
    this.setState({ hasError: false, error: null });
  }

  override render(): React.ReactNode {
    if (!this.state.hasError || !this.state.error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(this.state.error, this.reset);
    }

    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center" role="alert">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Unexpected error</h2>
          <p className="mt-1 text-sm text-gray-500">
            {this.state.error.message || 'An unexpected error occurred.'}
          </p>
        </div>
        <button
          type="button"
          onClick={this.reset}
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }
}
