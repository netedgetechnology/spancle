import Link from 'next/link';

export default function UnauthorizedPage(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 border border-red-100">
        <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-gray-900">Access denied</h1>
        <p className="text-sm text-gray-500 max-w-xs mx-auto">
          You don't have permission to view this page.
          Please sign in with an authorised account.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Sign in
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
