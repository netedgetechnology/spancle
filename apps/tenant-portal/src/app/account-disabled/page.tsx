import Link from 'next/link';

export default function AccountDisabledPage(): React.ReactElement {
  const supportEmail = process.env['NEXT_PUBLIC_SUPPORT_EMAIL'] ?? 'support@spancle.io';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 border border-red-100">
        <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      </div>
      <div className="space-y-2 max-w-xs">
        <h1 className="text-xl font-semibold text-gray-900">Account disabled</h1>
        <p className="text-sm text-gray-500">
          Your account has been disabled. If you believe this is an error, please contact support.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <a
          href={`mailto:${supportEmail}`}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Contact support
        </a>
        <Link
          href="/login"
          className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
