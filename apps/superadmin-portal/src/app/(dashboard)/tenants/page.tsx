'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TenantTable } from '@/components/tenants/tenant-table';

export default function TenantsPage(): React.ReactElement {
  const searchParams = useSearchParams();
  const successMsg   = searchParams.get('success') ?? undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Tenants</h2>
          <p className="mt-0.5 text-xs text-gray-400">Manage all platform organisations</p>
        </div>
        <Link
          href="/tenants/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New tenant
        </Link>
      </div>

      <TenantTable initialSuccessMessage={successMsg} />
    </div>
  );
}
