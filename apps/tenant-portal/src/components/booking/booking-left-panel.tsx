'use client';

import { cn } from '@/lib/utils/cn';

interface BookingLeftPanelProps {
  branches:       { id: string; name: string }[];
  courts:         { id: string; name: string; rateCardId: string | null }[];
  branchId:       string;
  courtId:        string;
  date:           string;
  onBranchChange: (id: string) => void;
  onCourtChange:  (id: string) => void;
  onDateChange:   (date: string) => void;
  onRefresh:      () => void;
  isRefreshing:   boolean;
}

const selectCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BookingLeftPanel({
  branches, courts, branchId, courtId, date,
  onBranchChange, onCourtChange, onDateChange,
  onRefresh, isRefreshing,
}: BookingLeftPanelProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white shadow-sm p-4 h-fit">
      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Filters</p>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Venue</label>
        <select value={branchId} onChange={(e) => onBranchChange(e.target.value)} className={selectCls}>
          <option value="">Select venue…</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Court</label>
        <select value={courtId} onChange={(e) => onCourtChange(e.target.value)}
          disabled={!branchId} className={cn(selectCls, !branchId && 'opacity-50 cursor-not-allowed')}>
          <option value="">Select court…</option>
          {courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Date</label>
        <input type="date" value={date} min={today()}
          onChange={(e) => onDateChange(e.target.value)}
          className={selectCls} />
      </div>

      {/* Quick date buttons */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { label: 'Today',    offset: 0 },
          { label: 'Tomorrow', offset: 1 },
          { label: '+2 days',  offset: 2 },
        ].map(({ label, offset }) => {
          const d = new Date();
          d.setDate(d.getDate() + offset);
          const iso = d.toISOString().slice(0, 10);
          return (
            <button key={label} type="button" onClick={() => onDateChange(iso)}
              className={cn(
                'flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
                date === iso
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50',
              )}>
              {label}
            </button>
          );
        })}
      </div>

      <button type="button" onClick={onRefresh} disabled={isRefreshing || !courtId}
        className="w-full rounded-lg border border-gray-300 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
        {isRefreshing ? (
          <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        )}
        Refresh availability
      </button>
    </div>
  );
}
