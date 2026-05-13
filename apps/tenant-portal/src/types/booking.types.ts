/**
 * booking.types.ts — Frontend types for the booking module.
 * Mirrors booking-service BookingEntity exactly.
 */

// ── Status ────────────────────────────────────────────────────────────────────

export type BookingStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'refunded';

export type BookingChannel = 'online' | 'admin' | 'walk_in' | 'api';

export const BOOKING_STATUS_CONFIG: Record<BookingStatus, {
  label:    string;
  bg:       string;
  text:     string;
  dot:      string;
  ring:     string;
}> = {
  pending_payment: { label: 'Pending Payment', bg: 'bg-amber-50',   text: 'text-amber-800',   dot: 'bg-amber-400',   ring: 'ring-amber-200'   },
  confirmed:       { label: 'Confirmed',        bg: 'bg-emerald-50', text: 'text-emerald-800', dot: 'bg-emerald-500', ring: 'ring-emerald-200' },
  completed:       { label: 'Completed',        bg: 'bg-blue-50',    text: 'text-blue-800',    dot: 'bg-blue-500',    ring: 'ring-blue-200'    },
  cancelled:       { label: 'Cancelled',        bg: 'bg-gray-100',   text: 'text-gray-600',    dot: 'bg-gray-400',    ring: 'ring-gray-200'    },
  no_show:         { label: 'No Show',          bg: 'bg-red-50',     text: 'text-red-800',     dot: 'bg-red-500',     ring: 'ring-red-200'     },
  refunded:        { label: 'Refunded',         bg: 'bg-purple-50',  text: 'text-purple-800',  dot: 'bg-purple-500',  ring: 'ring-purple-200'  },
};

// ── Entity mirror ─────────────────────────────────────────────────────────────

export interface Booking {
  id:                  string;
  tenantId:            string;
  reference:           string;
  branchId:            string;
  courtId:             string;
  sportId:             string | null;
  slotIds:             string[];
  userId:              string | null;
  customerName:        string;
  customerEmail:       string;
  customerPhone:       string | null;
  isMember:            boolean;
  status:              BookingStatus;
  channel:             BookingChannel;
  startsAt:            string;
  endsAt:              string;
  totalDurationMins:   number;
  finalPriceMinor:     number | null;
  amountPaidMinor:     number;
  amountRefundedMinor: number;
  currency:            string;
  participantCount:    number;
  customerNotes:       string | null;
  internalNotes:       string | null;
  metadata:            Record<string, unknown> | null;
  cancelledAt:         string | null;
  cancelledById:       string | null;
  cancellationReason:  string | null;
  completedAt:         string | null;
  checkedInAt:         string | null;
  createdById:         string | null;
  updatedById:         string | null;
  isDeleted:           boolean;
  createdAt:           string;
  updatedAt:           string;
}

// ── Form values ───────────────────────────────────────────────────────────────

export interface BookingFormValues {
  slotIds:          string[];
  branchId:         string;
  courtId:          string;
  sportId:          string;
  customerName:     string;
  customerEmail:    string;
  customerPhone:    string;
  userId:           string;
  isMember:         boolean;
  channel:          BookingChannel;
  participantCount: number;
  customerNotes:    string;
  internalNotes:    string;
  // Recurrence
  enableRecurrence:  boolean;
  recurrenceFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  recurrenceOccurrences: number;
}

export const EMPTY_BOOKING_FORM: BookingFormValues = {
  slotIds: [], branchId: '', courtId: '', sportId: '',
  customerName: '', customerEmail: '', customerPhone: '',
  userId: '', isMember: false, channel: 'admin',
  participantCount: 1, customerNotes: '', internalNotes: '',
  enableRecurrence: false, recurrenceFrequency: 'weekly',
  recurrenceOccurrences: 4,
};

// ── Query params ──────────────────────────────────────────────────────────────

export interface BookingQueryParams {
  branchId?:  string;
  courtId?:   string;
  sportId?:   string;
  userId?:    string;
  status?:    BookingStatus | '';
  reference?: string;
  from?:      string;
  to?:        string;
  limit?:     number;
  offset?:    number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatBookingPrice(booking: Pick<Booking, 'finalPriceMinor' | 'currency'>): string {
  if (booking.finalPriceMinor === null) return 'Free';
  if (booking.finalPriceMinor === 0)    return 'Free';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: booking.currency,
    minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(booking.finalPriceMinor / 100);
}

export function formatBookingTime(booking: Pick<Booking, 'startsAt' | 'endsAt' | 'totalDurationMins'>): string {
  const start = new Date(booking.startsAt);
  const end   = new Date(booking.endsAt);
  const time  = `${start.toISOString().slice(11, 16)}–${end.toISOString().slice(11, 16)}`;
  const date  = start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `${date} · ${time} (${booking.totalDurationMins}min)`;
}

export function balanceDue(booking: Booking): number {
  return Math.max(0, (booking.finalPriceMinor ?? 0) - booking.amountPaidMinor);
}
