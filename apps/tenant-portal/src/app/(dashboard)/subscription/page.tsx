'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlanCard }    from '@/components/subscription/plan-card';
import { UpgradeCta }  from '@/components/subscription/upgrade-cta';
import { PageLoader }  from '@/components/ui/page-loader';
import { ErrorDisplay } from '@/components/ui/error-display';
import {
  fetchCurrentSubscription,
  fetchSubscriptionHistory,
  cancelSubscription,
  subscriptionKeys,
} from '@/lib/subscription.api';
import {
  STATUS_CONFIG,
  formatPrice,
  type Subscription,
} from '@/types/subscription.types';
import { cn } from '@/lib/utils/cn';

// ── Cancel modal ──────────────────────────────────────────────────────────────

interface CancelModalProps {
  onConfirm: (reason: string) => void;
  onClose:   () => void;
  isLoading: boolean;
}

function CancelModal({ onConfirm, onClose, isLoading }: CancelModalProps): React.ReactElement {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6 flex flex-col gap-5">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Cancel subscription</h3>
          <p className="text-sm text-gray-500 mt-1">
            Your access continues until the end of the current billing period.
            This action cannot be undone.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Reason for cancelling <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            placeholder="Please tell us why you're leaving…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            className="block w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
          <p className="text-xs text-gray-400 mt-0.5 text-right">{reason.length}/500</p>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Keep subscription
          </button>
          <button
            type="button"
            onClick={() => onConfirm(trimmed)}
            disabled={!trimmed || isLoading}
            className="px-4 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? 'Cancelling…' : 'Confirm cancellation'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── History row ────────────────────────────────────────────────────────────────

function HistoryRow({ sub }: { sub: Subscription }): React.ReactElement {
  const sc = STATUS_CONFIG[sub.status];
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800 capitalize">{sub.tierKey}</p>
        <p className="text-xs text-gray-400">
          {new Date(sub.periodStart).toLocaleDateString(undefined, { dateStyle: 'medium' })}
          {' → '}
          {new Date(sub.periodEnd).toLocaleDateString(undefined, { dateStyle: 'medium' })}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">
          {formatPrice(sub.priceMinorUnits, sub.currency)}/{sub.billingCycle === 'annual' ? 'yr' : 'mo'}
        </span>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', sc.bg, sc.text)}>
          {sc.label}
        </span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

/**
 * Subscription management page — /dashboard/subscription
 *
 * Layout:
 *   Section 1 — Current plan (PlanCard with full feature/limit detail)
 *   Section 2 — Upgrade CTA (hidden for enterprise and cancelled subs)
 *   Section 3 — Subscription history (collapsible, last 5 entries)
 *
 * Cancel flow:
 *   1. User clicks "Cancel subscription" in PlanCard footer
 *   2. CancelModal opens with reason textarea
 *   3. On confirm: POST /subscriptions/:id/cancel
 *   4. Query invalidated → PlanCard re-renders with cancelled status
 */
export default function SubscriptionPage(): React.ReactElement {
  const queryClient    = useQueryClient();
  const [showCancel,   setShowCancel]   = useState(false);
  const [showHistory,  setShowHistory]  = useState(false);
  const [cancelError,  setCancelError]  = useState<string | null>(null);

  // ── Current subscription ────────────────────────────────────────────────────

  const {
    data:      current,
    isLoading: loadingCurrent,
    error:     errorCurrent,
    refetch,
  } = useQuery({
    queryKey: subscriptionKeys.current(),
    queryFn:  fetchCurrentSubscription,
  });

  // ── History (lazy — only fetched when toggled) ─────────────────────────────

  const {
    data:      history = [],
    isLoading: loadingHistory,
    refetch:   refetchHistory,
  } = useQuery({
    queryKey: subscriptionKeys.history(),
    queryFn:  fetchSubscriptionHistory,
    enabled:  showHistory,
  });

  // ── Cancel mutation ─────────────────────────────────────────────────────────

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => {
      if (!current) throw new Error('No active subscription');
      return cancelSubscription(current.id, reason);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionKeys.all() });
      setShowCancel(false);
      setCancelError(null);
    },
    onError: (err: Error) => {
      setCancelError(err.message);
    },
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loadingCurrent) return <PageLoader message="Loading subscription…" />;
  if (errorCurrent) {
    return (
      <ErrorDisplay
        title="Failed to load subscription"
        message={(errorCurrent as Error).message}
        retry={() => void refetch()}
      />
    );
  }

  return (
    <>
      {/* Cancel modal */}
      {showCancel && (
        <CancelModal
          onConfirm={(reason) => cancelMutation.mutate(reason)}
          onClose={() => { setShowCancel(false); setCancelError(null); }}
          isLoading={cancelMutation.isPending}
        />
      )}

      <div className="flex flex-col gap-6 max-w-3xl">

        {/* Page header */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Subscription</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage your plan, features, and billing
          </p>
        </div>

        {/* Cancel error */}
        {cancelError && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {cancelError}
          </div>
        )}

        {/* Current plan or empty state */}
        {current ? (
          <PlanCard
            subscription={current}
            onCancel={() => setShowCancel(true)}
            isCancelling={cancelMutation.isPending}
          />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-16 text-center">
            <div className="rounded-full bg-gray-100 p-3 mb-3">
              <svg
                className="h-6 w-6 text-gray-400"
                fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600">No active subscription</p>
            <p className="text-xs text-gray-400 mt-1">
              Contact your account manager to activate a plan
            </p>
          </div>
        )}

        {/* Upgrade CTA */}
        {current && (
          <UpgradeCta
            currentStatus={current.status}
            currentTier={current.tierKey}
          />
        )}

        {/* Subscription history */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
            onClick={() => {
              setShowHistory((v) => !v);
              if (!showHistory) void refetchHistory();
            }}
            aria-expanded={showHistory}
          >
            <p className="text-sm font-semibold text-gray-800">Subscription history</p>
            <svg
              className={cn('h-4 w-4 text-gray-400 transition-transform', showHistory && 'rotate-180')}
              fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {showHistory && (
            <div className="border-t border-gray-100 px-5 py-2">
              {loadingHistory ? (
                <div className="py-6 text-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-400 border-t-transparent mx-auto" aria-label="Loading" />
                </div>
              ) : history.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No history found</p>
              ) : (
                history.slice(0, 10).map((sub) => (
                  <HistoryRow key={sub.id} sub={sub} />
                ))
              )}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
