/**
 * slot.types.ts — Frontend types for the slot calendar module.
 * Mirrors booking-service SlotEntity exactly.
 */

// ── Status ────────────────────────────────────────────────────────────────────

export type SlotStatus =
  | 'available'
  | 'reserved'
  | 'booked'
  | 'cancelled'
  | 'completed'
  | 'unavailable';

/**
 * Visual config per status.
 * bg/text/border used on slot blocks in the calendar grid.
 * dot used in the status badge pill.
 */
export const SLOT_STATUS_CONFIG: Record<SlotStatus, {
  label:       string;
  bg:          string;       // block background
  text:        string;       // block text
  border:      string;       // block left-border accent
  dot:         string;       // status badge dot
  badgeBg:     string;       // badge pill background
  badgeText:   string;       // badge pill text
  ring:        string;       // badge ring
}> = {
  available:   {
    label: 'Available',
    bg: 'bg-emerald-50 hover:bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-l-emerald-500',
    dot: 'bg-emerald-500',
    badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-700', ring: 'ring-emerald-200',
  },
  reserved:    {
    label: 'Reserved',
    bg: 'bg-amber-50 hover:bg-amber-100',
    text: 'text-amber-800',
    border: 'border-l-amber-500',
    dot: 'bg-amber-500',
    badgeBg: 'bg-amber-50', badgeText: 'text-amber-700', ring: 'ring-amber-200',
  },
  booked:      {
    label: 'Booked',
    bg: 'bg-blue-100 hover:bg-blue-200',
    text: 'text-blue-900',
    border: 'border-l-blue-600',
    dot: 'bg-blue-600',
    badgeBg: 'bg-blue-100', badgeText: 'text-blue-800', ring: 'ring-blue-200',
  },
  cancelled:   {
    label: 'Cancelled',
    bg: 'bg-gray-100',
    text: 'text-gray-400',
    border: 'border-l-gray-300',
    dot: 'bg-gray-400',
    badgeBg: 'bg-gray-100', badgeText: 'text-gray-500', ring: 'ring-gray-200',
  },
  completed:   {
    label: 'Completed',
    bg: 'bg-slate-100',
    text: 'text-slate-500',
    border: 'border-l-slate-400',
    dot: 'bg-slate-400',
    badgeBg: 'bg-slate-100', badgeText: 'text-slate-600', ring: 'ring-slate-200',
  },
  unavailable: {
    label: 'Unavailable',
    bg: 'bg-red-50',
    text: 'text-red-400',
    border: 'border-l-red-300',
    dot: 'bg-red-400',
    badgeBg: 'bg-red-50', badgeText: 'text-red-600', ring: 'ring-red-200',
  },
};

// ── Slot entity mirror ────────────────────────────────────────────────────────

export interface Slot {
  id:                  string;
  tenantId:            string;
  courtId:             string;
  branchId:            string;
  sportId:             string | null;
  templateId:          string | null;
  bookingId:           string | null;
  startAt:             string;   // ISO string
  endAt:               string;
  durationMins:        number;
  status:              SlotStatus;
  reservedUntil:       string | null;
  resolvedPriceMinor:  number | null;
  priceOverrideMinor:  number | null;
  currency:            string;
  appliedRuleIds:      string[] | null;
  label:               string | null;
  notes:               string | null;
  maxBookings:         number;
  currentBookings:     number;
  isDeleted:           boolean;
  createdAt:           string;
  updatedAt:           string;
}

// ── Calendar filter state ─────────────────────────────────────────────────────

export interface CalendarFilters {
  /** Selected date — YYYY-MM-DD. Defaults to today. */
  date:       string;
  /** Branch filter — if set, only courts in this branch are shown */
  branchId:   string | null;
  /** Court filter — if set, only this court is shown */
  courtId:    string | null;
  /** Sport filter — if set, only courts with this sport are shown */
  sportId:    string | null;
  /** Status filter — if set, only slots of this status are shown */
  status:     SlotStatus | null;
}

export const DEFAULT_FILTERS: CalendarFilters = {
  date:     new Date().toISOString().slice(0, 10),
  branchId: null,
  courtId:  null,
  sportId:  null,
  status:   null,
};

// ── Occupancy summary ─────────────────────────────────────────────────────────

export interface OccupancySummary {
  total:       number;
  available:   number;
  reserved:    number;
  booked:      number;
  cancelled:   number;
  completed:   number;
  unavailable: number;
  /** (booked + completed) / (total - cancelled) × 100 */
  utilizationPct: number;
  /** available / (total - cancelled) × 100 */
  availabilityPct: number;
}

export function computeOccupancy(slots: Slot[]): OccupancySummary {
  const counts: Record<SlotStatus, number> = {
    available: 0, reserved: 0, booked: 0,
    cancelled: 0, completed: 0, unavailable: 0,
  };
  for (const s of slots) counts[s.status]++;

  const total      = slots.length;
  const active     = total - counts.cancelled;
  const utilized   = counts.booked + counts.completed;
  const available  = counts.available;

  return {
    total,
    ...counts,
    utilizationPct:  active > 0 ? Math.round((utilized / active) * 100) : 0,
    availabilityPct: active > 0 ? Math.round((available / active) * 100) : 0,
  };
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function formatSlotTime(isoString: string): string {
  return new Date(isoString).toISOString().slice(11, 16); // HH:MM
}

export function formatSlotPrice(
  slot: Pick<Slot, 'resolvedPriceMinor' | 'priceOverrideMinor' | 'currency'>,
): string {
  const minor = slot.priceOverrideMinor ?? slot.resolvedPriceMinor;
  if (minor === null) return 'Free';
  if (minor === 0)    return 'Free';
  return new Intl.NumberFormat('en-GB', {
    style:    'currency',
    currency: slot.currency ?? 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

export function formatCountdown(reservedUntil: string | null): string | null {
  if (!reservedUntil) return null;
  const ms = new Date(reservedUntil).getTime() - Date.now();
  if (ms <= 0) return 'Expiring…';
  const mins = Math.floor(ms / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Groups a flat list of slots by courtId.
 * Used by the calendar grid to render one column per court.
 */
export function groupSlotsByCourt(slots: Slot[]): Map<string, Slot[]> {
  const map = new Map<string, Slot[]>();
  for (const slot of slots) {
    const existing = map.get(slot.courtId) ?? [];
    existing.push(slot);
    map.set(slot.courtId, existing);
  }
  return map;
}

/**
 * Returns the pixel height for a slot block given its duration.
 * Base: 60px per 60 minutes.
 */
export function slotHeightPx(durationMins: number): number {
  return Math.max(28, Math.round((durationMins / 60) * 64));
}

export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDisplayDate(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}
