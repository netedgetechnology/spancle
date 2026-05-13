'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PackageTable } from '@/components/packages/package-table';
import { PackageForm }  from '@/components/packages/package-form';
import { PageLoader }   from '@/components/ui/page-loader';
import { ErrorDisplay } from '@/components/ui/error-display';
import {
  fetchPackages, createPackage, publishPackage, deprecatePackage,
  archivePackage, clonePackage, seedPackages, packageKeys,
} from '@/lib/packages.api';
import type { Package, PackageFormValues } from '@/types/packages.types';

export default function PackagesPage(): React.ReactElement {
  const router      = useRouter();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [archived,   setArchived]   = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: packageKeys.list() });

  const { data: packages = [], isLoading, error, refetch } = useQuery({
    queryKey: packageKeys.list(archived),
    queryFn:  () => fetchPackages(archived),
  });

  const createMut    = useMutation({ mutationFn: (v: Partial<PackageFormValues>) => createPackage(v), onSuccess: () => { void invalidate(); setShowCreate(false); } });
  const publishMut   = useMutation({ mutationFn: publishPackage,   onSuccess: () => void invalidate() });
  const deprecateMut = useMutation({ mutationFn: deprecatePackage, onSuccess: () => void invalidate() });
  const archiveMut   = useMutation({ mutationFn: archivePackage,   onSuccess: () => void invalidate() });
  const cloneMut     = useMutation({ mutationFn: (id: string) => clonePackage(id, 'clone-' + Date.now()), onSuccess: () => void invalidate() });
  const seedMut      = useMutation({ mutationFn: seedPackages, onSuccess: () => void invalidate() });

  const isBusy = [createMut, publishMut, deprecateMut, archiveMut, cloneMut, seedMut].some(m => m.isPending);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">SaaS Packages</h2>
          <p className="text-xs text-gray-400 mt-0.5">Platform package definitions — pricing, features, limits</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={archived} onChange={e => setArchived(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-primary-600" />
            Show archived
          </label>
          <button onClick={() => seedMut.mutate()} disabled={isBusy}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            {seedMut.isPending ? 'Seeding...' : 'Seed defaults'}
          </button>
          <button onClick={() => setShowCreate(true)} disabled={isBusy}
            className="px-3 py-1.5 rounded-lg bg-primary-600 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50">
            New package
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-6">Create package</h3>
          <PackageForm
            onSave={async (v) => { await createMut.mutateAsync(v); }}
            onCancel={() => setShowCreate(false)}
            isSaving={createMut.isPending}
          />
        </div>
      )}

      {isLoading ? <PageLoader message="Loading packages..." /> :
        error ? <ErrorDisplay title="Failed to load packages" message={(error as Error).message} retry={() => void refetch()} /> :
        <PackageTable
          packages={packages}
          onEdit={(pkg: Package) => router.push('/packages/' + pkg.id)}
          onPublish={(id) => publishMut.mutate(id)}
          onDeprecate={(id) => deprecateMut.mutate(id)}
          onArchive={(id) => archiveMut.mutate(id)}
          onClone={(id) => cloneMut.mutate(id)}
          isLoading={isBusy}
        />
      }
    </div>
  );
}
