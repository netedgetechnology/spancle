'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { fetchTenantDetail, tenantKeys } from '@/lib/tenants.api';
import { TenantForm } from '@/components/tenants/tenant-form';
import { TenantStatusBadge } from '@/components/tenants/tenant-status-badge';

export default function TenantDetailPage(): React.ReactElement {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const { data: tenant, isLoading, error } = useQuery({
    queryKey: tenantKeys.detail(id),
    queryFn:  () => fetchTenantDetail(id),
    enabled:  !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-sm text-red-500">Failed to load tenant or tenant not found.</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-blue-600 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Breadcrumb + header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <nav className="flex items-center gap-1 text-xs text-gray-400">
            <Link href="/tenants" className="hover:text-gray-600 transition-colors">Tenants</Link>
            <span>/</span>
            <span className="text-gray-600 font-medium">{tenant.name}</span>
          </nav>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">{tenant.name}</h2>
            <TenantStatusBadge status={tenant.status} />
          </div>
          <p className="text-xs font-mono text-gray-400">
            {tenant.slug}.spancle.com
            {' · '}
            <a
              href={`https://${tenant.slug}.spancle.com`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              open ↗
            </a>
          </p>
        </div>

        {/* Quick info pills */}
        <div className="flex flex-wrap gap-2 flex-shrink-0">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 capitalize">
            {tenant.tier}
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            Created {new Date(tenant.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Edit form */}
      <TenantForm mode="edit" tenant={tenant} />
    </div>
  );
}
