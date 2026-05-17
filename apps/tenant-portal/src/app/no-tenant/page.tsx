import Link from 'next/link';

/**
 * /no-tenant — shown when:
 *  - No tenant slug found in the hostname or headers
 *  - A reserved slug was requested (www, manage, api, booking, etc.)
 *  - An unknown subdomain that does not match any tenant
 */
export default function NoTenantPage(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-900 px-4 text-center">
      <div className="space-y-2">
        <p className="text-6xl font-bold text-slate-700 leading-none select-none">404</p>
        <h1 className="text-xl font-semibold text-white">Organisation not found</h1>
        <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
          The organisation you are looking for does not exist or may have moved.
          Check the URL and try again.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="https://www.spancle.com/login"
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors"
        >
          Find your organisation
        </Link>
        <Link
          href="https://www.spancle.com"
          className="rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors"
        >
          Go to Spancle
        </Link>
      </div>
    </div>
  );
}
