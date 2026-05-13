'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn }           from '@/lib/utils/cn';
import { CourtForm }    from '@/components/court/court-form';
import { PageLoader }   from '@/components/ui/page-loader';
import { ErrorDisplay } from '@/components/ui/error-display';
import { fetchCourt, updateCourt, courtKeys } from '@/lib/court.api';
import { COURT_STATUS_CONFIG } from '@/types/court.types';
import type { CourtFormValues } from '@/types/court.types';

export default function EditCourtPage(): React.ReactElement {
  const { id }      = useParams<{ id: string }>();
  const router      = useRouter();
  const queryClient = useQueryClient();

  const { data: court, isLoading, error, refetch } = useQuery({
    queryKey: courtKeys.detail(id),
    queryFn:  () => fetchCourt(id),
    enabled:  !!id,
  });

  const mutation = useMutation({
    mutationFn: (values: Partial<CourtFormValues>) => updateCourt(id, values),
    onSuccess: (updated) => {
      queryClient.setQueryData(courtKeys.detail(id), updated);
      void queryClient.invalidateQueries({ queryKey: courtKeys.list() });
      void queryClient.invalidateQueries({ queryKey: courtKeys.summary() });
      router.push(`/courts/${id}`);
    },
  });

  if (isLoading) return <PageLoader message="Loading court…" />;
  if (error || !court) {
    return <ErrorDisplay title="Court not found" message={(error as Error | undefined)?.message} retry={() => void refetch()} />;
  }

  const sc = COURT_STATUS_CONFIG[court.status];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <button type="button" onClick={() => router.push(`/courts/${id}`)}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3 focus:outline-none">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to {court.name}
        </button>

        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-semibold text-gray-900">Edit — {court.name}</h2>
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', sc.bg, sc.text, sc.ring)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', sc.dot)} aria-hidden="true" />
            {sc.label}
          </span>
        </div>
      </div>

      {mutation.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
          {(mutation.error as Error).message}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <CourtForm
          court={court}
          onSave={(v) => { void mutation.mutateAsync(v); }}
          onCancel={() => router.push(`/courts/${id}`)}
          isSaving={mutation.isPending}
        />
      </div>
    </div>
  );
}
