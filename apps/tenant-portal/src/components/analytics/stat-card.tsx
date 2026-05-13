'use client';

import { cn } from '@/lib/utils/cn';

interface StatCardProps {
  label:       string;
  value:       string | number;
  subValue?:   string;
  trend?:      number;         // positive = good, negative = bad
  trendLabel?: string;
  icon?:       React.ReactNode;
  accent?:     'emerald' | 'blue' | 'amber' | 'red' | 'purple' | 'slate';
  isLoading?:  boolean;
}

const ACCENT_RING: Record<NonNullable<StatCardProps['accent']>, string> = {
  emerald: 'border-l-emerald-500 bg-emerald-50/40',
  blue:    'border-l-blue-500 bg-blue-50/40',
  amber:   'border-l-amber-500 bg-amber-50/40',
  red:     'border-l-red-500 bg-red-50/40',
  purple:  'border-l-purple-500 bg-purple-50/40',
  slate:   'border-l-slate-400 bg-slate-50/40',
};

const ICON_BG: Record<NonNullable<StatCardProps['accent']>, string> = {
  emerald: 'bg-emerald-100 text-emerald-700',
  blue:    'bg-blue-100 text-blue-700',
  amber:   'bg-amber-100 text-amber-700',
  red:     'bg-red-100 text-red-700',
  purple:  'bg-purple-100 text-purple-700',
  slate:   'bg-slate-100 text-slate-600',
};

export function StatCard({
  label, value, subValue, trend, trendLabel, icon,
  accent = 'slate', isLoading = false,
}: StatCardProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-3 w-24 rounded bg-gray-200" />
          <div className="h-8 w-8 rounded-lg bg-gray-100" />
        </div>
        <div className="h-7 w-32 rounded bg-gray-200 mb-1" />
        <div className="h-3 w-20 rounded bg-gray-100" />
      </div>
    );
  }

  const trendPositive = (trend ?? 0) >= 0;

  return (
    <div className={cn(
      'rounded-xl border border-l-4 border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md',
      ACCENT_RING[accent],
    )}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide leading-tight">
          {label}
        </p>
        {icon && (
          <span className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0',
            ICON_BG[accent],
          )}>
            {icon}
          </span>
        )}
      </div>

      <p className="text-2xl font-bold text-gray-900 leading-none mb-1">
        {value}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        {subValue && (
          <span className="text-xs text-gray-500">{subValue}</span>
        )}
        {trend !== undefined && (
          <span className={cn(
            'inline-flex items-center gap-0.5 text-xs font-semibold',
            trendPositive ? 'text-emerald-600' : 'text-red-500',
          )}>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d={
                trendPositive
                  ? 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941'
                  : 'M2.25 6L9 12.75l4.306-4.307a11.95 11.95 0 015.814 5.519l2.74 1.22m0 0l-5.94 2.28m5.94-2.28l-2.28-5.941'
              } />
            </svg>
            {Math.abs(trend)}%
          </span>
        )}
        {trendLabel && (
          <span className="text-[10px] text-gray-400">{trendLabel}</span>
        )}
      </div>
    </div>
  );
}
