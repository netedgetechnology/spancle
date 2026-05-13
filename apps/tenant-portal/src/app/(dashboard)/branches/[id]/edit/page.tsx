'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BranchForm }        from '@/components/branch/branch-form';
import { BranchStatusBadge } from '@/components/branch/branch-status-badge';
import { PageLoader }        from '@/components/ui/page-loader';
import { ErrorDisplay }      from '@/components/ui/error-display';
import { fetchBranch, updateBranch, branchKeys } from '@/lib/branch.api';
import { useToast } from '@spancle/ui-kit';
import type { BranchFormValues } from '@/types/branch.types';

/**
 * Edit branch page — /dashboard/branches/[id]/edit
 */
export default function EditBranchPage(): React.ReactElement {
  const { id }      = useParams<{ id: string }>();
  const router      = useRouter();
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  const {
    data:      branch,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: branchKeys.detail(id),
    queryFn:  () => fetchBranch(id),
    enabled:  !!id,
  });

  const mutation = useMutation({
    mutationFn: (values: Partial<BranchFormValues>) => updateBranch(id, values),
    onSuccess: (updated) => {
      queryClient.setQueryData(branchKeys.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: branchKeys.list() });
      queryClient.invalidateQueries({ queryKey: branchKeys.summary() });
      toast({ title: 'Branch updated', intent: 'success' });
      router.push(`/branches/${id}`);
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to update branch', description: err.message, intent: 'error' });
    },
  });

  if (isLoading) return <PageLoader message="Loading branch…" />;
  if (error || !branch) {
    return (
      <ErrorDisplay
        title="Branch not found"
        message={(error as Error | undefined)?.message}
        retry={() => void refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <button
          type="button"
          onClick={() => router.push(`/branches/${id}`)}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to {branch.name}
        </button>

        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-semibold text-gray-900">Edit — {branch.name}</h2>
          <BranchStatusBadge status={branch.status} />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <BranchForm
          branch={branch}
          onSave={(values) => { void mutation.mutateAsync(values); }}
          onCancel={() => router.push(`/branches/${id}`)}
          isSaving={mutation.isPending}
        />
      </div>
    </div>
  );
}
