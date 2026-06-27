'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RateCardForm } from '@/components/rate-card/rate-card-form';
import { fetchRateCard, updateRateCard, rateCardKeys } from '@/lib/rate-card.api';
import { PageLoader }   from '@/components/ui/page-loader';
import { ErrorDisplay } from '@/components/ui/error-display';

export default function EditRateCardPage(): React.ReactElement {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();

  const { data: card, isLoading, error, refetch } = useQuery({
    queryKey: rateCardKeys.detail(id),
    queryFn:  () => fetchRateCard(id),
    enabled:  !!id,
  });

  const mutation = useMutation({
    mutationFn: (v: Parameters<typeof updateRateCard>[1]) => updateRateCard(id, v),
    onSuccess:  () => { void qc.invalidateQueries({ queryKey: rateCardKeys.all() }); router.push('/rate-cards'); },
  });

  if (isLoading) return <PageLoader message="Loading rate card…" />;
  if (error || !card) return <ErrorDisplay title="Failed to load rate card" message={(error as Error)?.message ?? ''} retry={() => void refetch()} />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <nav className="flex items-center gap-1 text-xs text-gray-400 mb-1">
          <a href="/rate-cards" className="hover:text-gray-600 transition-colors">Rate Cards</a>
          <span>/</span>
          <span className="text-gray-600 font-medium">Edit</span>
        </nav>
        <h2 className="text-lg font-semibold text-gray-900">Edit: {card.name}</h2>
      </div>
      {mutation.isError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {(mutation.error as Error).message ?? 'Failed to save.'}
        </div>
      )}
      <RateCardForm initial={card} onSubmit={(v) => mutation.mutate(v)} isPending={mutation.isPending} submitLabel="Save changes" />
    </div>
  );
}
