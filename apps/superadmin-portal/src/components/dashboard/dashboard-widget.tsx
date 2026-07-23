/**
 * dashboard-widget.tsx
 *
 * Reusable widget framework for dashboard pages.
 *
 * Components:
 *   DashboardGrid   — responsive CSS grid container
 *   DashboardWidget — card shell with loading/error states
 *   WidgetHeader    — title + optional action slot
 *   WidgetBody      — scrollable content area
 *   WidgetFooter    — secondary actions / metadata
 *   KpiCard         — loading-aware KPI placeholder card
 *
 * Design rules:
 *   - All components are Server Component safe (no 'use client' here).
 *   - Loading state uses skeleton placeholders to prevent layout shift.
 *   - All interactive wrappers are aria-labelled.
 *   - Reuses design tokens from @spancle/ui-kit.
 */

import { cn } from '@/lib/utils/cn';

// ── DashboardGrid ─────────────────────────────────────────────────────────────

export type GridColumns = 1 | 2 | 3 | 4 | 6 | 12;

interface DashboardGridProps {
  /** Number of columns on lg+ screens. Defaults to 3. */
  cols?:      GridColumns;
  /** Gap between cells. Defaults to 4 (1rem). */
  gap?:       2 | 4 | 6;
  className?: string;
  children:   React.ReactNode;
  /** ARIA region label for screen readers. */
  label?:     string;
}

const COL_CLASSES: Record<GridColumns, string> = {
  1:  'grid-cols-1',
  2:  'grid-cols-1 sm:grid-cols-2',
  3:  'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4:  'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  6:  'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
  12: 'grid-cols-12',
};

const GAP_CLASSES: Record<2 | 4 | 6, string> = { 2: 'gap-2', 4: 'gap-4', 6: 'gap-6' };

export function DashboardGrid({
  cols = 3, gap = 4, className, children, label,
}: DashboardGridProps): React.ReactElement {
  return (
    <div
      className={cn('grid', COL_CLASSES[cols], GAP_CLASSES[gap], className)}
      role={label ? 'region' : undefined}
      aria-label={label}
    >
      {children}
    </div>
  );
}

// ── DashboardWidget ───────────────────────────────────────────────────────────

interface DashboardWidgetProps {
  /** Number of columns this widget spans in the parent grid. */
  colSpan?:   1 | 2 | 3 | 4 | 6 | 'full';
  /** When true, renders skeleton placeholder instead of children. */
  isLoading?: boolean;
  /** When provided, renders an error banner above children. */
  error?:     string | null;
  className?: string;
  children:   React.ReactNode;
  /** ARIA labelledby id — should match a heading inside the widget. */
  labelledBy?: string;
}

const SPAN_CLASSES: Record<string, string> = {
  '1': 'col-span-1',
  '2': 'col-span-2',
  '3': 'col-span-3',
  '4': 'col-span-4',
  '6': 'col-span-6',
  'full': 'col-span-full',
};

export function DashboardWidget({
  colSpan, isLoading, error, className, children, labelledBy,
}: DashboardWidgetProps): React.ReactElement {
  return (
    <section
      className={cn(
        'rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden',
        colSpan ? SPAN_CLASSES[String(colSpan)] : '',
        className,
      )}
      aria-labelledby={labelledBy}
      aria-busy={isLoading}
    >
      {error && (
        <div role="alert" className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      {isLoading ? (
        <div className="animate-pulse p-5 space-y-3" aria-hidden="true">
          <div className="h-4 w-1/3 rounded bg-gray-200" />
          <div className="h-3 w-2/3 rounded bg-gray-100" />
          <div className="h-24 rounded bg-gray-100" />
        </div>
      ) : children}
    </section>
  );
}

// ── WidgetHeader ──────────────────────────────────────────────────────────────

interface WidgetHeaderProps {
  /** Heading text — rendered in an h2 by default. */
  title:       string;
  /** Optional subtext below the title. */
  description?: string;
  /** Content slotted to the right of the title. */
  action?:     React.ReactNode;
  /** id for aria-labelledby wiring. */
  id?:         string;
  /** Heading level. Defaults to 'h2'. */
  as?:         'h2' | 'h3' | 'h4';
  className?:  string;
}

export function WidgetHeader({
  title, description, action, id, as: Heading = 'h2', className,
}: WidgetHeaderProps): React.ReactElement {
  return (
    <div className={cn('flex items-start justify-between gap-2 border-b border-gray-100 px-5 py-4', className)}>
      <div className="min-w-0">
        <Heading
          id={id}
          className="text-sm font-semibold text-gray-900 truncate"
        >
          {title}
        </Heading>
        {description && (
          <p className="mt-0.5 text-xs text-gray-500 truncate">{description}</p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0 flex items-center gap-2">{action}</div>
      )}
    </div>
  );
}

// ── WidgetBody ────────────────────────────────────────────────────────────────

interface WidgetBodyProps {
  /** When true, removes default padding. */
  noPadding?:  boolean;
  /** When true, makes the body vertically scrollable with a fixed max height. */
  scrollable?: boolean;
  className?:  string;
  children:    React.ReactNode;
}

export function WidgetBody({ noPadding, scrollable, className, children }: WidgetBodyProps): React.ReactElement {
  return (
    <div
      className={cn(
        !noPadding && 'p-5',
        scrollable && 'overflow-y-auto max-h-64',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ── WidgetFooter ──────────────────────────────────────────────────────────────

interface WidgetFooterProps {
  className?: string;
  children:   React.ReactNode;
}

export function WidgetFooter({ className, children }: WidgetFooterProps): React.ReactElement {
  return (
    <div className={cn('border-t border-gray-100 px-5 py-3', className)}>
      {children}
    </div>
  );
}

// ── KpiCard ───────────────────────────────────────────────────────────────────

export type KpiTrend = 'up' | 'down' | 'neutral';

interface KpiCardProps {
  label:       string;
  /** Value to display. When undefined, renders skeleton. */
  value?:      string | number;
  trend?:      KpiTrend;
  /** Human-readable change description, e.g. "+12% vs last month". */
  trendLabel?: string;
  /** Icon element rendered left of the label. */
  icon?:       React.ReactNode;
  isLoading?:  boolean;
  className?:  string;
}

const TREND_CLASSES: Record<KpiTrend, string> = {
  up:      'text-green-600',
  down:    'text-red-500',
  neutral: 'text-gray-400',
};

const TREND_ICONS: Record<KpiTrend, React.ReactElement> = {
  up: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
    </svg>
  ),
  down: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
    </svg>
  ),
  neutral: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
    </svg>
  ),
};

export function KpiCard({
  label, value, trend = 'neutral', trendLabel, icon, isLoading, className,
}: KpiCardProps): React.ReactElement {
  if (isLoading) {
    return (
      <div
        className={cn('rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse', className)}
        aria-busy="true"
        aria-label={`Loading ${label}`}
      >
        <div className="h-3 w-1/2 rounded bg-gray-200 mb-3" aria-hidden="true" />
        <div className="h-7 w-2/3 rounded bg-gray-200 mb-2" aria-hidden="true" />
        <div className="h-3 w-1/3 rounded bg-gray-100" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div
      className={cn('rounded-xl border border-gray-200 bg-white p-5 shadow-sm', className)}
      aria-label={`${label}: ${value ?? 'not available'}`}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon && (
          <span className="flex-shrink-0 text-gray-400" aria-hidden="true">{icon}</span>
        )}
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      </div>

      <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
        {value ?? <span className="text-gray-300">—</span>}
      </p>

      {(trend !== 'neutral' || trendLabel) && (
        <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', TREND_CLASSES[trend])}>
          {TREND_ICONS[trend]}
          {trendLabel && <span>{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}
