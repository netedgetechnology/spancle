'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PackageForm }  from '@/components/packages/package-form';
import { PageLoader }   from '@/components/ui/page-loader';
import { ErrorDisplay } from '@/components/ui/error-display';
import { fetchPackage, updatePackage, packageKeys } from '@/lib/packages.api';
import { STATUS_CONFIG, formatPrice, type PackageFormValues } from '@/types/packages.types';
import { cn } from '@/lib/utils/cn';

export default function PackageDetailPage(): React.ReactElement {
  const { id }      = useParams<{ id: string }>();
  const router      = useRouter();
  const queryClient = useQueryClient();

  const { data: pkg, isLoading, error, refetch } = useQuery({
    queryKey: packageKeys.detail(id),
    queryFn:  () => fetchPackage(id),
    enabled:  !!id,
  });

  const updateMut = useMutation({
    mutationFn: (v: Partial<PackageFormValues>) => updatePackage(id, v),
    onSuccess: (updated) => {
      queryClient.setQueryData(packageKeys.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: packageKeys.list() });
    },
  });

  if (isLoading) return <PageLoader message="Loading package..." />;
  if (error || !pkg) return <ErrorDisplay title="Package not found" retry={() => void refetch()} />;

  const sc = STATUS_CONFIG[pkg.status];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <button onClick={() => router.push('/packages')}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3">
          Back to packages
        </button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">{pkg.name}</h2>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', sc.bg, sc.text)}>{sc.label}</span>
            </div>
            <p className="text-xs font-mono text-gray-400 mt-0.5">{pkg.slug} · {pkg.tierKey}</p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>{formatPrice(pkg.priceMonthlyMinorUnits, pkg.currency)}/mo</p>
            <p>{formatPrice(pkg.priceAnnualMinorUnits, pkg.currency)}/yr</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <PackageForm
          pkg={pkg}
          onSave={async (v) => { await updateMut.mutateAsync(v); }}
          onCancel={() => router.push('/packages')}
          isSaving={updateMut.isPending}
        />
      </div>
    </div>
  );
}
