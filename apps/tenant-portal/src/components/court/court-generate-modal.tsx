'use client';

import { useState, useMemo } from 'react';
import { useQuery }   from '@tanstack/react-query';
import { cn }         from '@/lib/utils/cn';
import { fetchBranches, branchKeys } from '@/lib/branch.api';
import { fetchSports,   sportKeys }  from '@/lib/sport.api';
import { SURFACE_TYPE_OPTIONS, type CourtType, type SurfaceType } from '@/types/court.types';

interface CourtGenerateModalProps {
  onGenerate: (payload: Record<string, unknown>) => void | Promise<void>;
  onClose:    () => void;
  isLoading:  boolean;
  defaultBranchId?: string;
}

const SEPARATOR_OPTIONS = [
  { label: 'Space  (Court 1)',    value: ' '  },
  { label: 'Hyphen (Court-1)',    value: '-'  },
  { label: 'None   (Court1)',     value: ''   },
  { label: 'Dot    (Court.1)',    value: '.'  },
];

const PREFIX_PRESETS = ['Court', 'Pitch', 'Lane', 'Pool', 'Track', 'Ring', 'Field', 'Rink'];

/**
 * CourtGenerateModal — bulk court generation dialog.
 *
 * Features:
 *   - Branch selector (required)
 *   - Optional sport link
 *   - Name prefix + separator + start number + count
 *   - Live preview of generated court names
 *   - Shared surface type, indoor/outdoor, capacity
 */
export function CourtGenerateModal({
  onGenerate,
  onClose,
  isLoading,
  defaultBranchId,
}: CourtGenerateModalProps): React.ReactElement {
  const [branchId,    setBranchId]    = useState(defaultBranchId ?? '');
  const [sportId,     setSportId]     = useState('');
  const [namePrefix,  setNamePrefix]  = useState('Court');
  const [separator,   setSeparator]   = useState(' ');
  const [startNumber, setStartNumber] = useState(1);
  const [count,       setCount]       = useState(6);
  const [courtType,   setCourtType]   = useState<CourtType>('indoor');
  const [surfaceType, setSurfaceType] = useState<SurfaceType>('hard_court');
  const [capacity,    setCapacity]    = useState('');
  const [error,       setError]       = useState<string | null>(null);

  const { data: branches = [] } = useQuery({
    queryKey: branchKeys.list(),
    queryFn:  () => fetchBranches(),
  });

  const { data: sports = [] } = useQuery({
    queryKey: sportKeys.list(),
    queryFn:  () => fetchSports(),
  });

  // Live preview of court names to be generated
  const preview = useMemo(() => {
    const names: string[] = [];
    for (let i = 0; i < Math.min(count, 12); i++) {
      names.push(`${namePrefix.trim()}${separator}${startNumber + i}`);
    }
    return names;
  }, [namePrefix, separator, startNumber, count]);

  const handleSubmit = async (): Promise<void> => {
    if (!branchId) { setError('Please select a branch'); return; }
    if (!namePrefix.trim()) { setError('Name prefix is required'); return; }
    if (count < 1 || count > 50) { setError('Count must be between 1 and 50'); return; }

    setError(null);

    const payload: Record<string, unknown> = {
      branchId,
      namePrefix:  namePrefix.trim(),
      separator,
      startNumber,
      count,
      courtType,
      surfaceType,
    };

    if (sportId) payload['sportId'] = sportId;
    if (capacity.trim()) {
      const n = Number(capacity);
      if (!isNaN(n) && n > 0) payload['capacity'] = n;
    }

    await onGenerate(payload);
  };

  const inp = cn(
    'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900',
    'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200',
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog" aria-modal aria-label="Generate courts"
    >
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Generate courts</h3>
            <p className="text-xs text-gray-400 mt-0.5">Bulk-create numbered courts with shared settings</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 focus:outline-none"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          {/* Branch + Sport */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Branch <span className="text-red-500">*</span>
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className={inp}
              >
                <option value="">Select branch…</option>
                {branches.filter((b) => b.status !== 'archived').map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Primary sport (optional)</label>
              <select value={sportId} onChange={(e) => setSportId(e.target.value)} className={inp}>
                <option value="">Multi-sport / none</option>
                {sports.map((s) => (
                  <option key={s.id} value={s.id}>{s.icon ? `${s.icon} ` : ''}{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Naming */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Name prefix</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PREFIX_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setNamePrefix(p)}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium border transition-colors',
                    namePrefix === p
                      ? 'bg-primary-100 text-primary-700 border-primary-300'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={namePrefix}
              onChange={(e) => setNamePrefix(e.target.value)}
              placeholder="Court"
              className={inp}
              maxLength={50}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Separator</label>
              <select value={separator} onChange={(e) => setSeparator(e.target.value)} className={inp}>
                {SEPARATOR_OPTIONS.map((o) => (
                  <option key={JSON.stringify(o.value)} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Start number</label>
              <input
                type="number" min={1} value={startNumber}
                onChange={(e) => setStartNumber(Math.max(1, Number(e.target.value)))}
                className={inp}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Count <span className="text-gray-400">(max 50)</span>
              </label>
              <input
                type="number" min={1} max={50} value={count}
                onChange={(e) => setCount(Math.min(50, Math.max(1, Number(e.target.value))))}
                className={inp}
              />
            </div>
          </div>

          {/* Name preview */}
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 mb-2">
              Preview — {count} court{count !== 1 ? 's' : ''} will be created:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {preview.map((name, i) => (
                <span
                  key={i}
                  className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700"
                >
                  {name}
                </span>
              ))}
              {count > 12 && (
                <span className="text-xs text-gray-400 self-center">+ {count - 12} more…</span>
              )}
            </div>
          </div>

          {/* Shared settings */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Type</label>
              <select
                value={courtType}
                onChange={(e) => setCourtType(e.target.value as CourtType)}
                className={inp}
              >
                <option value="indoor">🏢 Indoor</option>
                <option value="outdoor">🌳 Outdoor</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Surface</label>
              <select
                value={surfaceType}
                onChange={(e) => setSurfaceType(e.target.value as SurfaceType)}
                className={inp}
              >
                {SURFACE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Capacity</label>
              <input
                type="number" min={1} value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="Optional"
                className={inp}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            type="button" onClick={onClose} disabled={isLoading}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isLoading || !branchId || !namePrefix.trim()}
            className="px-5 py-2 rounded-lg bg-primary-600 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Generating…' : `Generate ${count} court${count !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
