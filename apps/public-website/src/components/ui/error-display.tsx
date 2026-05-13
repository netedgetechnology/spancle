'use client';

import { cn } from '@/lib/utils/cn';

interface ErrorDisplayProps {
  title?: string;
  message?: string;
  retry?: () => void;
  className?: string;
}

export function ErrorDisplay({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  retry,
  className,
}: ErrorDisplayProps): React.ReactElement {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center',
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-red-800">{title}</h3>
        <p className="text-sm text-red-600">{message}</p>
      </div>
      {retry && (
        <button
          type="button"
          onClick={retry}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Try again
        </button>
      )}
    </div>
  );
}
