'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils/cn';
import { PageLoader }   from '@/components/ui/page-loader';
import { ErrorDisplay } from '@/components/ui/error-display';
import {
  fetchPricingRules, deletePricingRule,
  activatePricingRule, deactivatePricingRule,
  pricingKeys,
} from '@/lib/pricing.api';
import type { PricingRule, PricingRuleType } from '@/lib/pricing.api';

const RULE_TYPE_LABELS: Record<PricingRuleType, string> = {
  base:    'Base Rate',
  peak:    'Peak Hours',
  weekend: 'Weekend',
  holiday: 'Holiday',
  member:  'Member Discount',
  custom:  'Custom',
};

const RULE_TYPE_STYLES: Record<PricingRuleType, string> = {
  base:    'bg-blue-50 text-blue-700 ring-blue-200',
  peak:    'bg-amber-50 text-amber-700 ring-amber-200',
  weekend: 'bg-purple-50 text-purple-700 ring-purple-200',
  holiday: 'bg-red-50 text-red-700 ring-red-200',
  member:  'bg-emerald-50 text-emerald-700 ring-emerald-200',
  custom:  'bg-gray-100 text-gray-700 ring-gray-200',
};

function formatModifier(rule: PricingRule): string {
  switch (rule.modifierType) {
    case 'percentage': return `${rule.modifierValue > 0 ? '+' : ''}${rule.modifierValue}%`;
    case 'fixed':      return `${rule.modifierValue > 0 ? '+' : ''}₹${(rule.modifierValue / 100).toFixed(2)}`;
    case 'absolute':   return `₹${(rule.modifierValue / 100).toFixed(2)} flat`;
    default:           return String(rule.modifierValue);
  }
}

export default function PricingRulesPage(): React.ReactElement {
  const router      = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<PricingRuleType | 'all'>('all');

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: pricingKeys.all() });

  const { data: rules = [], isLoading, error, refetch } = useQuery({
    queryKey: pricingKeys.list(filter === 'all' ? {} : { ruleType: filter }),
    queryFn:  () => fetchPricingRules(filter === 'all' ? undefined : { ruleType: filter }),
  });

  const activateMut = useMutation({
    mutationFn: activatePricingRule,
    onSuccess:  invalidate,
  });
  const deactivateMut = useMutation({
    mutationFn: deactivatePricingRule,
    onSuccess:  invalidate,
  });
  const deleteMut = useMutation({
    mutationFn: deletePricingRule,
    onSuccess:  invalidate,
  });

  const isBusy = activateMut.isPending || deactivateMut.isPending || deleteMut.isPending;

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete pricing rule "${name}"? This cannot be undone.`)) return;
    deleteMut.mutate(id);
  };

  const FILTER_TABS: Array<{ label: string; value: PricingRuleType | 'all' }> = [
    { label: 'All', value: 'all' },
    ...Object.entries(RULE_TYPE_LABELS).map(([v, label]) => ({
      label, value: v as PricingRuleType,
    })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Pricing Rules</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {rules.length} rule{rules.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/pricing/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New rule
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilter(tab.value)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              filter === tab.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <PageLoader message="Loading pricing rules…" />
      ) : error ? (
        <ErrorDisplay
          title="Failed to load pricing rules"
          message={(error as Error).message}
          retry={() => void refetch()}
        />
      ) : rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-20 text-center">
          <div className="rounded-full bg-gray-100 p-4 mb-4">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-600">No pricing rules yet</p>
          <p className="text-xs text-gray-400 mt-1">Create your first rule to control booking prices</p>
          <button
            type="button"
            onClick={() => router.push('/pricing/new')}
            className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
          >
            Add first rule
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Type', 'Modifier', 'Scope', 'Active', 'Priority', ''].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rules.map((rule) => (
                <tr key={rule.id} className={cn('hover:bg-gray-50 transition-colors', !rule.isActive && 'opacity-60')}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                      {rule.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{rule.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                      RULE_TYPE_STYLES[rule.ruleType],
                    )}>
                      {RULE_TYPE_LABELS[rule.ruleType]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">{formatModifier(rule)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 capitalize">{rule.scope}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                      rule.isActive
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                        : 'bg-gray-100 text-gray-500 ring-gray-200',
                    )}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">{rule.priority}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/pricing/${rule.id}/edit`)}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Edit
                      </button>
                      {rule.isActive ? (
                        <button type="button" disabled={isBusy}
                          onClick={() => deactivateMut.mutate(rule.id)}
                          className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-colors">
                          Deactivate
                        </button>
                      ) : (
                        <button type="button" disabled={isBusy}
                          onClick={() => activateMut.mutate(rule.id)}
                          className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition-colors">
                          Activate
                        </button>
                      )}
                      <button type="button" disabled={isBusy}
                        onClick={() => handleDelete(rule.id, rule.name)}
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
