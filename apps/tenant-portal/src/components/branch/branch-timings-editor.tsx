'use client';

import { cn } from '@/lib/utils/cn';
import {
  DAY_KEYS,
  DAY_LABELS,
  type DayKey,
  type WeeklyTimings,
  type DayTiming,
  type DaySession,
  type MaintenanceBlock,
  type TimeRange,
} from '@/types/branch.types';

interface BranchTimingsEditorProps {
  value:     WeeklyTimings;
  onChange:  (timings: WeeklyTimings) => void;
  disabled?: boolean;
}

// 30-minute increments across 24 hours
const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

const selectCls =
  'rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200 disabled:opacity-50 bg-white';

const addBtnCls =
  'inline-flex items-center gap-1 rounded-md border border-dashed border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

const removeBtnCls =
  'rounded p-0.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0';

// ── TimeSelect ────────────────────────────────────────────────────────────────

function TimeSelect({
  value, onChange, disabled, label,
}: {
  value:    string;
  onChange: (v: string) => void;
  disabled: boolean;
  label:    string;
}): React.ReactElement {
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={selectCls}
    >
      {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
    </select>
  );
}

// ── BreakRow ──────────────────────────────────────────────────────────────────

function BreakRow({
  br, index, sessionStart, sessionEnd,
  onChange, onRemove, disabled,
}: {
  br:           TimeRange;
  index:        number;
  sessionStart: string;
  sessionEnd:   string;
  onChange:     (updated: TimeRange) => void;
  onRemove:     () => void;
  disabled:     boolean;
}): React.ReactElement {
  const invalid =
    br.start >= br.end ||
    br.start < sessionStart ||
    br.end > sessionEnd;

  return (
    <div className="flex items-center gap-1.5 ml-4">
      <span className="text-[10px] text-gray-400 w-8 text-right flex-shrink-0">Break</span>
      <TimeSelect value={br.start} label={`Break ${index + 1} start`} disabled={disabled}
        onChange={(v) => onChange({ ...br, start: v })} />
      <span className="text-[10px] text-gray-400">–</span>
      <TimeSelect value={br.end} label={`Break ${index + 1} end`} disabled={disabled}
        onChange={(v) => onChange({ ...br, end: v })} />
      {invalid && (
        <span className="text-[10px] text-red-500 font-medium">Invalid range</span>
      )}
      <button type="button" onClick={onRemove} disabled={disabled} className={removeBtnCls}
        aria-label={`Remove break ${index + 1}`}>
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── SessionRow ────────────────────────────────────────────────────────────────

function SessionRow({
  session, sessionIndex,
  onChange, onRemove, disabled,
}: {
  session:      DaySession;
  sessionIndex: number;
  onChange:     (updated: DaySession) => void;
  onRemove:     () => void;
  disabled:     boolean;
}): React.ReactElement {
  const invalid = session.start >= session.end;

  const addBreak = () => {
    const breaks = session.breaks ?? [];
    onChange({
      ...session,
      breaks: [...breaks, { start: session.start, end: session.start }],
    });
  };

  const updateBreak = (i: number, updated: TimeRange) => {
    const breaks = [...(session.breaks ?? [])];
    breaks[i] = updated;
    onChange({ ...session, breaks });
  };

  const removeBreak = (i: number) => {
    const breaks = (session.breaks ?? []).filter((_, idx) => idx !== i);
    onChange({ ...session, breaks: breaks.length > 0 ? breaks : undefined });
  };

  return (
    <div className="flex flex-col gap-1.5 pl-2 border-l-2 border-primary-100">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-gray-400 w-8 text-right flex-shrink-0">
          S{sessionIndex + 1}
        </span>
        <TimeSelect value={session.start} label={`Session ${sessionIndex + 1} start`}
          disabled={disabled} onChange={(v) => onChange({ ...session, start: v })} />
        <span className="text-[10px] text-gray-400">–</span>
        <TimeSelect value={session.end} label={`Session ${sessionIndex + 1} end`}
          disabled={disabled} onChange={(v) => onChange({ ...session, end: v })} />
        {invalid && (
          <span className="text-[10px] text-red-500 font-medium">Start must be before end</span>
        )}
        <input
          type="text"
          placeholder="Label (optional)"
          value={session.label ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ ...session, label: e.target.value || undefined })}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200 disabled:opacity-50 w-28"
        />
        <button type="button" onClick={addBreak} disabled={disabled} className={addBtnCls}>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Break
        </button>
        <button type="button" onClick={onRemove} disabled={disabled} className={removeBtnCls}
          aria-label={`Remove session ${sessionIndex + 1}`}>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {(session.breaks ?? []).map((br, i) => (
        <BreakRow
          key={i}
          br={br}
          index={i}
          sessionStart={session.start}
          sessionEnd={session.end}
          onChange={(updated) => updateBreak(i, updated)}
          onRemove={() => removeBreak(i)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

// ── MaintenanceRow ────────────────────────────────────────────────────────────

function MaintenanceRow({
  block, index,
  onChange, onRemove, disabled,
}: {
  block:    MaintenanceBlock;
  index:    number;
  onChange: (updated: MaintenanceBlock) => void;
  onRemove: () => void;
  disabled: boolean;
}): React.ReactElement {
  const invalid = block.start >= block.end;
  return (
    <div className="flex items-center gap-1.5 flex-wrap pl-2 border-l-2 border-amber-100">
      <span className="text-[10px] text-amber-500 w-8 text-right flex-shrink-0">Maint</span>
      <TimeSelect value={block.start} label={`Maintenance ${index + 1} start`}
        disabled={disabled} onChange={(v) => onChange({ ...block, start: v })} />
      <span className="text-[10px] text-gray-400">–</span>
      <TimeSelect value={block.end} label={`Maintenance ${index + 1} end`}
        disabled={disabled} onChange={(v) => onChange({ ...block, end: v })} />
      <input
        type="text"
        placeholder="Reason (required)"
        value={block.reason}
        disabled={disabled}
        onChange={(e) => onChange({ ...block, reason: e.target.value })}
        className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200 disabled:opacity-50 w-36"
      />
      {invalid && <span className="text-[10px] text-red-500 font-medium">Invalid range</span>}
      {!block.reason && <span className="text-[10px] text-red-500 font-medium">Reason required</span>}
      <button type="button" onClick={onRemove} disabled={disabled} className={removeBtnCls}
        aria-label={`Remove maintenance block ${index + 1}`}>
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── TimingRow (one day) ───────────────────────────────────────────────────────

function TimingRow({
  day, timing, onChange, disabled,
}: {
  day:      DayKey;
  timing:   DayTiming;
  onChange: (t: DayTiming) => void;
  disabled: boolean;
}): React.ReactElement {
  const isOpen = !timing.isClosed;

  const addSession = () => {
    const sessions = timing.sessions ?? [];
    onChange({
      ...timing,
      sessions: [
        ...sessions,
        { start: timing.openTime, end: timing.closeTime },
      ],
    });
  };

  const updateSession = (i: number, updated: DaySession) => {
    const sessions = [...(timing.sessions ?? [])];
    sessions[i] = updated;
    onChange({ ...timing, sessions });
  };

  const removeSession = (i: number) => {
    const sessions = (timing.sessions ?? []).filter((_, idx) => idx !== i);
    onChange({ ...timing, sessions: sessions.length > 0 ? sessions : undefined });
  };

  const addMaintenance = () => {
    const blocks = timing.maintenanceBlocks ?? [];
    onChange({
      ...timing,
      maintenanceBlocks: [
        ...blocks,
        { start: timing.openTime, end: timing.openTime, reason: '' },
      ],
    });
  };

  const updateMaintenance = (i: number, updated: MaintenanceBlock) => {
    const blocks = [...(timing.maintenanceBlocks ?? [])];
    blocks[i] = updated;
    onChange({ ...timing, maintenanceBlocks: blocks });
  };

  const removeMaintenance = (i: number) => {
    const blocks = (timing.maintenanceBlocks ?? []).filter((_, idx) => idx !== i);
    onChange({ ...timing, maintenanceBlocks: blocks.length > 0 ? blocks : undefined });
  };

  return (
    <div className={cn(
      'flex flex-col gap-2 py-3 border-b border-gray-50 last:border-0',
      !isOpen && 'opacity-60',
    )}>
      {/* Day header row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 w-24 flex-shrink-0">
          <button
            type="button"
            role="switch"
            aria-checked={isOpen}
            aria-label={`${DAY_LABELS[day]} ${isOpen ? 'open' : 'closed'}`}
            disabled={disabled}
            onClick={() => onChange({ ...timing, isClosed: !timing.isClosed })}
            className={cn(
              'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:cursor-not-allowed',
              isOpen ? 'bg-primary-600' : 'bg-gray-200',
            )}
          >
            <span className={cn(
              'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow mt-[3px] transition-transform',
              isOpen ? 'translate-x-[18px]' : 'translate-x-0.5',
            )} />
          </button>
          <span className="text-sm font-medium text-gray-700 select-none">
            {DAY_LABELS[day]}
          </span>
        </div>

        {isOpen ? (
          <>
            {/* Primary open/close times */}
            <div className="flex items-center gap-1.5">
              <TimeSelect value={timing.openTime} label={`${DAY_LABELS[day]} open time`}
                disabled={disabled} onChange={(v) => onChange({ ...timing, openTime: v })} />
              <span className="text-xs text-gray-400">to</span>
              <TimeSelect value={timing.closeTime} label={`${DAY_LABELS[day]} close time`}
                disabled={disabled} onChange={(v) => onChange({ ...timing, closeTime: v })} />
            </div>
            {timing.openTime >= timing.closeTime && (
              <span className="text-xs text-red-500 font-medium">Open must be before close</span>
            )}
            {/* Add session / maintenance buttons */}
            <div className="flex items-center gap-2 ml-auto">
              <button type="button" onClick={addSession} disabled={disabled} className={addBtnCls}>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Session
              </button>
              <button type="button" onClick={addMaintenance} disabled={disabled}
                className={cn(addBtnCls, 'border-amber-200 text-amber-600 hover:border-amber-400 hover:text-amber-700')}>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                </svg>
                Maintenance
              </button>
            </div>
          </>
        ) : (
          <span className="text-sm text-gray-400 italic">Closed</span>
        )}
      </div>

      {/* Sessions */}
      {isOpen && (timing.sessions ?? []).map((session, i) => (
        <SessionRow
          key={i}
          session={session}
          sessionIndex={i}
          onChange={(updated) => updateSession(i, updated)}
          onRemove={() => removeSession(i)}
          disabled={disabled}
        />
      ))}

      {/* Maintenance blocks */}
      {isOpen && (timing.maintenanceBlocks ?? []).map((block, i) => (
        <MaintenanceRow
          key={i}
          block={block}
          index={i}
          onChange={(updated) => updateMaintenance(i, updated)}
          onRemove={() => removeMaintenance(i)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

// ── BranchTimingsEditor (root) ────────────────────────────────────────────────

/**
 * BranchTimingsEditor — 7-day weekly schedule editor.
 *
 * Each day supports:
 *   - Open/closed toggle
 *   - Primary openTime / closeTime (required, used as default session bounds)
 *   - Add Session: multiple bookable windows per day with optional label
 *   - Add Break: non-bookable periods within a session
 *   - Add Maintenance: recurring weekly maintenance blocks with required reason
 *
 * Used by both BranchForm and CourtForm (operating hours override).
 */
export function BranchTimingsEditor({
  value,
  onChange,
  disabled = false,
}: BranchTimingsEditorProps): React.ReactElement {
  const handleDayChange = (day: DayKey, timing: DayTiming): void => {
    onChange({ ...value, [day]: timing });
  };

  const openDays = DAY_KEYS.filter((d) => !value[d].isClosed).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700">Operating hours</p>
        <span className="text-xs text-gray-400">
          {openDays} day{openDays !== 1 ? 's' : ''} open
        </span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-4 py-1">
        {DAY_KEYS.map((day) => (
          <TimingRow
            key={day}
            day={day}
            timing={value[day]}
            onChange={(t) => handleDayChange(day, t)}
            disabled={disabled}
          />
        ))}
      </div>

      <p className="mt-2 text-[10px] text-gray-400 leading-relaxed">
        Sessions define multiple bookable windows per day.
        Breaks exclude non-bookable periods inside a session.
        Maintenance blocks are recurring weekly closures.
        When no sessions are added, the full open–close window is used.
      </p>
    </div>
  );
}
