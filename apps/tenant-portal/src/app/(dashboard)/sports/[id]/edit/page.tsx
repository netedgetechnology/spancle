'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils/cn';
import { SportForm }    from '@/components/sport/sport-form';
import { PageLoader }   from '@/components/ui/page-loader';
import { ErrorDisplay } from '@/components/ui/error-display';
import { fetchSport, updateSport, sportKeys } from '@/lib/sport.api';
import { SPORT_STATUS_CONFIG } from '@/types/sport.types';
import type { SportFormValues } from '@/types/sport.types';

/**
 * Edit sport page — /dashboard/sports/[id]/edit
 *
 * Loads the existing sport, renders SportForm in edit mode.
 * On save: PATCH /sports/:id (with optional branchIds triggering
 * PATCH /sports/:id/branches via the form payload).
 *
 * Branch assignment is included in the main update payload:
 * the service merges config and updates branches in one call.
 */
export default function EditSportPage(): React.ReactElement {
  const { id }      = useParams<{ id: string }>();
  const router      = useRouter();
  const queryClient = useQueryClient();

  const {
    data:      sport,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: sportKeys.detail(id),
    queryFn:  () => fetchSport(id),
    enabled:  !!id,
  });

  const mutation = useMutation({
    mutationFn: (values: Partial<SportFormValues>) => updateSport(id, values),
    onSuccess: (updated) => {
      queryClient.setQueryData(sportKeys.detail(id), updated);
      void queryClient.invalidateQueries({ queryKey: sportKeys.list() });
      void queryClient.invalidateQueries({ queryKey: sportKeys.summary() });
      router.push(`/sports/${id}`);
    },
  });

  if (isLoading) return <PageLoader message="Loading sport…" />;
  if (error || !sport) {
    return (
      <ErrorDisplay
        title="Sport not found"
        message={(error as Error | undefined)?.message}
        retry={() => void refetch()}
      />
    );
  }

  const sc = SPORT_STATUS_CONFIG[sport.status];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <button
          type="button"
          onClick={() => router.push(`/sports/${id}`)}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3 focus:outline-none"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to {sport.name}
        </button>

        <div className="flex items-center gap-3">
          {/* Icon swatch */}
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-xl"
            style={{ backgroundColor: (sport.color ?? '#3b82f6') + '22' }}
            aria-hidden="true"
          >
            {sport.icon ?? '🏅'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                Edit — {sport.name}
              </h2>
              <span className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                sc.bg, sc.text, sc.ring,
              )}>
                <span className={cn('h-1.5 w-1.5 rounded-full', sc.dot)} aria-hidden="true" />
                {sc.label}
              </span>
            </div>
            <p className="text-xs font-mono text-gray-400 mt-0.5">{sport.slug}</p>
          </div>
        </div>
      </div>

      {mutation.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
          {(mutation.error as Error).message}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <SportForm
          sport={sport}
          onSave={(values) => { void mutation.mutateAsync(values); }}
          onCancel={() => router.push(`/sports/${id}`)}
          isSaving={mutation.isPending}
        />
      </div>
    </div>
  );
}
