'use client';

import { cn } from '@/lib/utils/cn';
import type { Sport } from '@/types/sport.types';

interface Venue  { id: string; name: string }
interface CourtOpt { id: string; name: string; rateCardId: string | null; sportId: string | null }

interface BookingLeftPanelProps {
  branches:       Venue[];
  courts:         CourtOpt[];
  sports:         Sport[];
  branchId:       string;
  courtId:        string;      // '' = all courts
  sportId:        string;      // '' = all sports
  date:           string;
  onBranchChange: (id: string) => void;
  onCourtChange:  (id: string) => void;
  onSportChange:  (id: string) => void;
  onDateChange:   (date: string) => void;
  onRefresh:      () => void;
  isRefreshing:   boolean;
  selectedCount:  number;
  branchName:     string;
}

const selectCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:opacity-50';

function todayISO(): string { return new Date().toISOString().slice(0, 10); }
function offsetISO(n: number): string {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10);
}

export function BookingLeftPanel({
  branches, courts, sports, branchId, courtId, sportId, date,
  onBranchChange, onCourtChange, onSportChange, onDateChange,
  onRefresh, isRefreshing, selectedCount, branchName,
}: BookingLeftPanelProps): React.ReactElement {
  const quickDates = [
    { label: 'Today',    iso: todayISO()    },
    { label: 'Tomorrow', iso: offsetISO(1)  },
    { label: '+2',       iso: offsetISO(2)  },
    { label: '+3',       iso: offsetISO(3)  },
  ];

  const filteredCourts = sportId
    ? courts.filter((c) => c.sportId === sportId)
    : courts;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white shadow-sm p-4 h-full">
      {/* Venue */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Venue</label>
        <select value={branchId} onChange={(e) => onBranchChange(e.target.value)} className={selectCls}>
          <option value="">All venues</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Sport */}
      {sports.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Sport</label>
          <select value={sportId} onChange={(e) => { onSportChange(e.target.value); onCourtChange(''); }}
            disabled={!branchId} className={selectCls}>
            <option value="">All sports</option>
            {sports.map((s) => <option key={s.id} value={s.id}>{s.icon ? s.icon + ' ' : ''}{s.name}</option>)}
          </select>
        </div>
      )}

      {/* Court */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Court</label>
        <select value={courtId} onChange={(e) => onCourtChange(e.target.value)}
          disabled={!branchId} className={selectCls}>
          <option value="">All courts</option>
          {filteredCourts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Date picker */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date</label>
        <input type="date" value={date} onChange={(e) => onDateChange(e.target.value)}
          className={selectCls} />
        <div className="grid grid-cols-4 gap-1 mt-1.5">
          {quickDates.map(({ label, iso }) => (
            <button key={iso} type="button" onClick={() => onDateChange(iso)}
              className={cn(
                'rounded-md border py-1 text-[11px] font-medium transition-colors',
                date === iso
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50',
              )}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Refresh */}
      <button type="button" onClick={onRefresh} disabled={isRefreshing || !branchId}
        className="w-full rounded-lg border border-gray-300 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5">
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
        {isRefreshing ? 'Refreshing…' : 'Refresh'}
      </button>

      {/* Selected slot summary */}
      {selectedCount > 0 && (
        <div className="rounded-lg bg-primary-50 border border-primary-200 px-3 py-2.5 text-xs text-primary-700 font-medium text-center">
          {selectedCount} slot{selectedCount !== 1 ? 's' : ''} selected
        </div>
      )}

      {/* Status at bottom */}
      {branchName && (
        <div className="mt-auto pt-2 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 leading-snug">
            <span className="font-medium text-gray-500">Venue:</span> {branchName}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Auto-refreshes every 30 s
          </p>
        </div>
      )}
    </div>
  );
}
