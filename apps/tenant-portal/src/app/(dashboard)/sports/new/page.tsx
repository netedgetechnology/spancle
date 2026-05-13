'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SportForm }  from '@/components/sport/sport-form';
import { createSport, sportKeys } from '@/lib/sport.api';
import type { SportFormValues } from '@/types/sport.types';

/**
 * New sport page — /dashboard/sports/new
 */
export default function NewSportPage(): React.ReactElement {
  const router      = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: Partial<SportFormValues>) => createSport(values),
    onSuccess: (sport) => {
      void queryClient.invalidateQueries({ queryKey: sportKeys.all() });
      router.push(`/sports/${sport.id}`);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <button
          type="button"
          onClick={() => router.push('/sports')}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3 focus:outline-none"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to sports
        </button>
        <h2 className="text-lg font-semibold text-gray-900">New sport</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Add a sport or activity to your organisation
        </p>
      </div>

      {mutation.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
          {(mutation.error as Error).message}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <SportForm
          onSave={(values) => { void mutation.mutateAsync(values); }}
          onCancel={() => router.push('/sports')}
          isSaving={mutation.isPending}
        />
      </div>
    </div>
  );
}
