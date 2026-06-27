'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RateCardForm } from '@/components/rate-card/rate-card-form';
import { createRateCard, rateCardKeys } from '@/lib/rate-card.api';

export default function NewRateCardPage(): React.ReactElement {
  const router = useRouter();
  const qc     = useQueryClient();

  const mutation = useMutation({
    mutationFn: createRateCard,
    onSuccess:  () => { void qc.invalidateQueries({ queryKey: rateCardKeys.all() }); router.push('/rate-cards'); },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <nav className="flex items-center gap-1 text-xs text-gray-400 mb-1">
          <a href="/rate-cards" className="hover:text-gray-600 transition-colors">Rate Cards</a>
          <span>/</span>
          <span className="text-gray-600 font-medium">New</span>
        </nav>
        <h2 className="text-lg font-semibold text-gray-900">New rate card</h2>
      </div>
      {mutation.isError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {(mutation.error as Error).message ?? 'Failed to create rate card.'}
        </div>
      )}
      <RateCardForm onSubmit={(v) => mutation.mutate(v)} isPending={mutation.isPending} submitLabel="Create rate card" />
    </div>
  );
}
