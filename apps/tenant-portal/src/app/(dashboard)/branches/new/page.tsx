'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BranchForm } from '@/components/branch/branch-form';
import { createBranch, branchKeys } from '@/lib/branch.api';
import { useToast } from '@spancle/ui-kit';
import type { BranchFormValues } from '@/types/branch.types';

/**
 * New branch page — /dashboard/branches/new
 */
export default function NewBranchPage(): React.ReactElement {
  const router      = useRouter();
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  const mutation = useMutation({
    mutationFn: (values: Partial<BranchFormValues>) => createBranch(values),
    onSuccess: (branch) => {
      queryClient.invalidateQueries({ queryKey: branchKeys.all() });
      toast({ title: `Branch "${branch.name}" created`, intent: 'success' });
      router.push(`/branches/${branch.id}`);
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to create branch', description: err.message, intent: 'error' });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <button
          type="button"
          onClick={() => router.push('/branches')}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to branches
        </button>
        <h2 className="text-lg font-semibold text-gray-900">New branch</h2>
        <p className="text-xs text-gray-400 mt-0.5">Add a new physical location to your organisation</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <BranchForm
          onSave={(values) => { void mutation.mutateAsync(values); }}
          onCancel={() => router.push('/branches')}
          isSaving={mutation.isPending}
        />
      </div>
    </div>
  );
}
