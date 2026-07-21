/**
 * booking.types.ts
 *
 * Frontend type definitions for the consumer booking flow.
 * Mirror booking-service entities exactly. No fabricated fields.
 */

// ── Venue ─────────────────────────────────────────────────────────────────────

export interface Venue {
  id:        string;
  tenantId:  string;
  name:      string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Court ─────────────────────────────────────────────────────────────────────

export type CourtStatus = 'available' | 'unavailable' | 'maintenance' | 'retired';
export type CourtType   = 'indoor' | 'outdoor';

export interface Court {
  id:                    string;
  tenantId:              string;
  venueId:               string;
  branchId:              string;
  sportId:               string | null;
  name:                  string;
  code:                  string | null;
  description:           string | null;
  courtType:             CourtType;
  surfaceType:           string;
  capacity:              number | null;
  maxBookingsConcurrent: number;
  status:                CourtStatus;
  courtNumber:           number | null;
  sortOrder:             number;
  imageUrl:              string | null;
  hourlyRateMinor:       number | null;
  rateCardId:            string | null;
  isDeleted:             boolean;
  createdAt:             string;
  updatedAt:             string;
}

// ── Slot ──────────────────────────────────────────────────────────────────────

export type SlotStatus =
  | 'available'
  | 'reserved'
  | 'booked'
  | 'cancelled'
  | 'completed'
  | 'unavailable';

export interface Slot {
  id:                 string;
  tenantId:           string;
  courtId:            string;
  branchId:           string;
  sportId:            string | null;
  templateId:         string | null;
  bookingId:          string | null;
  startAt:            string;
  endAt:              string;
  durationMins:       number;
  status:             SlotStatus;
  reservedUntil:      string | null;
  resolvedPriceMinor: number | null;
  priceOverrideMinor: number | null;
  currency:           string;
  appliedRuleIds:     string[] | null;
  label:              string | null;
  notes:              string | null;
  maxBookings:        number;
  currentBookings:    number;
  isDeleted:          boolean;
  createdAt:          string;
  updatedAt:          string;
}

// ── Booking ───────────────────────────────────────────────────────────────────

export type BookingStatus =
  | 'reserved'
  | 'pending_payment'
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'refunded'
  | 'rescheduled'
  | 'expired';

export type BookingChannel = 'online' | 'admin' | 'walk_in' | 'api';

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
  cancellationReason:  string | null;
  completedAt:         string | null;
  checkedInAt:         string | null;
  expiresAt:           string | null;
  createdAt:           string;
  updatedAt:           string;
}

// ── Create booking request ────────────────────────────────────────────────────

export interface CreateBookingPayload {
  slotIds:          string[];
  branchId:         string;
  courtId:          string;
  sportId?:         string;
  customer: {
    name:      string;
    email:     string;
    phone?:    string;
    userId?:   string;
    isMember?: boolean;
  };
  channel?:         BookingChannel;
  participantCount?: number;
  customerNotes?:   string;
}

// ── Slot status display ───────────────────────────────────────────────────────

export const SLOT_STATUS_CONFIG: Record<SlotStatus, {
  label:     string;
  bg:        string;
  text:      string;
  border:    string;
  selectable: boolean;
}> = {
  available:   { label: 'Available',   bg: 'bg-emerald-50',  text: 'text-emerald-800', border: 'border-emerald-300', selectable: true  },
  reserved:    { label: 'Reserved',    bg: 'bg-amber-50',    text: 'text-amber-800',   border: 'border-amber-300',   selectable: false },
  booked:      { label: 'Booked',      bg: 'bg-blue-100',    text: 'text-blue-900',    border: 'border-blue-400',    selectable: false },
  cancelled:   { label: 'Cancelled',   bg: 'bg-gray-100',    text: 'text-gray-400',    border: 'border-gray-200',    selectable: false },
  completed:   { label: 'Completed',   bg: 'bg-slate-100',   text: 'text-slate-500',   border: 'border-slate-300',   selectable: false },
  unavailable: { label: 'Unavailable', bg: 'bg-red-50',      text: 'text-red-400',     border: 'border-red-200',     selectable: false },
};

export const BOOKING_STATUS_CONFIG: Record<BookingStatus, {
  label:  string;
  bg:     string;
  text:   string;
  dot:    string;
  /** Whether a consumer can cancel this booking */
  cancellable: boolean;
  /** Whether a consumer can reschedule this booking */
  reschedulable: boolean;
}> = {
  reserved:        { label: 'Reserved',        bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400',   cancellable: true,  reschedulable: false },
  pending_payment: { label: 'Pending Payment', bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   cancellable: true,  reschedulable: false },
  confirmed:       { label: 'Confirmed',       bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', cancellable: true,  reschedulable: true  },
  checked_in:      { label: 'Checked In',      bg: 'bg-teal-50',    text: 'text-teal-700',    dot: 'bg-teal-500',    cancellable: false, reschedulable: false },
  in_progress:     { label: 'In Progress',     bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    cancellable: false, reschedulable: false },
  completed:       { label: 'Completed',       bg: 'bg-slate-100',  text: 'text-slate-600',   dot: 'bg-slate-400',   cancellable: false, reschedulable: false },
  cancelled:       { label: 'Cancelled',       bg: 'bg-gray-100',   text: 'text-gray-600',    dot: 'bg-gray-400',    cancellable: false, reschedulable: false },
  no_show:         { label: 'No Show',         bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-400',     cancellable: false, reschedulable: false },
  refunded:        { label: 'Refunded',        bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-400',  cancellable: false, reschedulable: false },
  rescheduled:     { label: 'Rescheduled',     bg: 'bg-indigo-50',  text: 'text-indigo-700',  dot: 'bg-indigo-400',  cancellable: false, reschedulable: false },
  expired:         { label: 'Expired',         bg: 'bg-gray-100',   text: 'text-gray-400',    dot: 'bg-gray-300',    cancellable: false, reschedulable: false },
};

// ── Reschedule request ────────────────────────────────────────────────────────

export interface ReschedulePayload {
  newSlotIds: string[];
  reason?:    string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatPrice(minor: number | null, currency = 'GBP'): string {
  if (minor == null) return 'Free';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency, minimumFractionDigits: 0,
  }).format(minor / 100);
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function slotPrice(slot: Slot): number | null {
  return slot.priceOverrideMinor ?? slot.resolvedPriceMinor;
}

export function totalPriceMinor(slots: Slot[]): number {
  return slots.reduce((sum, s) => sum + (slotPrice(s) ?? 0), 0);
}

export function totalDuration(slots: Slot[]): number {
  return slots.reduce((sum, s) => sum + s.durationMins, 0);
}
