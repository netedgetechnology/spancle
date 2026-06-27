'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils/cn';
import { PageLoader }   from '@/components/ui/page-loader';
import { ErrorDisplay } from '@/components/ui/error-display';
import {
  fetchRateCards, activateRateCard, deactivateRateCard,
  deleteRateCard, rateCardKeys,
} from '@/lib/rate-card.api';
import type { RateCard } from '@/lib/rate-card.api';

function formatPrice(minor: number | null, currency: string): string {
  if (minor == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency, minimumFractionDigits: 0,
  }).format(minor / 100) + '/hr';
}

export default function RateCardsPage(): React.ReactElement {
  const router = useRouter();
  const qc = useQueryClient();

  const invalidate = () => void qc.invalidateQueries({ queryKey: rateCardKeys.all() });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: rateCardKeys.list(),
    queryFn:  () => fetchRateCards(),
  });

  const activateMut   = useMutation({ mutationFn: activateRateCard,   onSuccess: invalidate });
  const deactivateMut = useMutation({ mutationFn: deactivateRateCard, onSuccess: invalidate });
  const deleteMut     = useMutation({
    mutationFn: deleteRateCard,
    onSuccess:  invalidate,
  });

  const cards  = data?.data ?? [];
  const isBusy = activateMut.isPending || deactivateMut.isPending || deleteMut.isPending;

  const handleDelete = (card: RateCard) => {
    if (!confirm(`Delete rate card "${card.name}"? Courts using it will lose their Rate Card assignment.`)) return;
    deleteMut.mutate(card.id);
  };

  if (isLoading) return <PageLoader message="Loading rate cards…" />;
  if (error)     return <ErrorDisplay title="Failed to load rate cards" message={(error as Error).message} retry={() => void refetch()} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Rate Cards</h2>
          <p className="mt-0.5 text-xs text-gray-400">{cards.length} rate card{cards.length !== 1 ? 's' : ''}</p>
        </div>
        <button type="button" onClick={() => router.push('/rate-cards/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New rate card
        </button>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-20 text-center">
          <p className="text-sm font-medium text-gray-600">No rate cards yet</p>
          <p className="text-xs text-gray-400 mt-1">Create a rate card to define weekly pricing for your courts</p>
          <button type="button" onClick={() => router.push('/rate-cards/new')}
            className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors">
            Create first rate card
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Name','Currency','Default price','Status','Overrides',''].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cards.map((card) => (
                <tr key={card.id} className={cn('hover:bg-gray-50 transition-colors', !card.isActive && 'opacity-60')}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{card.name}</p>
                    {card.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{card.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">{card.currency}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 font-mono">{formatPrice(card.defaultPriceMinor, card.currency)}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                      card.isActive
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                        : 'bg-gray-100 text-gray-500 ring-gray-200',
                    )}>
                      {card.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {card.dateOverrides.length > 0 ? `${card.dateOverrides.length} override${card.dateOverrides.length !== 1 ? 's' : ''}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button type="button" disabled={isBusy}
                        onClick={() => router.push(`/rate-cards/${card.id}/edit`)}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                        Edit
                      </button>
                      {card.isActive ? (
                        <button type="button" disabled={isBusy}
                          onClick={() => deactivateMut.mutate(card.id)}
                          className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-colors">
                          Deactivate
                        </button>
                      ) : (
                        <button type="button" disabled={isBusy}
                          onClick={() => activateMut.mutate(card.id)}
                          className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition-colors">
                          Activate
                        </button>
                      )}
                      <button type="button" disabled={isBusy}
                        onClick={() => handleDelete(card)}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
