import Link from 'next/link';

export default function SessionExpiredPage(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 border border-amber-100">
        <svg className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="space-y-2 max-w-xs">
        <h1 className="text-xl font-semibold text-gray-900">Session expired</h1>
        <p className="text-sm text-gray-500">
          Your session has timed out for security reasons. Please sign in again to continue.
        </p>
      </div>
      <Link
        href="/login"
        className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        Sign in again
      </Link>
    </div>
  );
}
