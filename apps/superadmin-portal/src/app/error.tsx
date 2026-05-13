'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Global error boundary for superadmin-portal.
 * Catches unhandled errors in root layout subtree.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps): React.ReactElement {
  useEffect(() => {
    // TODO: Send to Sentry in Sprint 2
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Application Error</h1>
            <p className="text-sm text-gray-500">An unexpected error occurred in superadmin-portal.</p>
            {error.digest && (
              <p className="font-mono text-xs text-gray-400">Error ID: {error.digest}</p>
            )}
          </div>
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
