'use client';

import { createContext, useCallback, useContext, useState } from 'react';

interface LoadingContextValue {
  isLoading:  boolean;
  setLoading: (loading: boolean) => void;
  startLoading: () => void;
  stopLoading:  () => void;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function useLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error('useLoading must be used within LoadingProvider');
  return ctx;
}

/**
 * LoadingProvider — global loading state.
 * Use for full-page transitions, route changes, or multi-step workflows.
 * Per-component loading states should use local useState.
 */
export function LoadingProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [isLoading, setIsLoading] = useState(false);
  const setLoading  = useCallback((v: boolean) => setIsLoading(v), []);
  const startLoading = useCallback(() => setIsLoading(true), []);
  const stopLoading  = useCallback(() => setIsLoading(false), []);

  return (
    <LoadingContext.Provider value={{ isLoading, setLoading, startLoading, stopLoading }}>
      {/* Full-page loading overlay */}
      {isLoading && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-white/70 backdrop-blur-sm"
          role="status"
          aria-label="Loading"
        >
          <svg className="h-10 w-10 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}
      {children}
    </LoadingContext.Provider>
  );
}
