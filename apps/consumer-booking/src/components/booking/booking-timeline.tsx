'use client';

/**
 * BookingTimeline — visual timeline of booking lifecycle events.
 *
 * Derives timeline from the booking entity fields:
 *   createdAt        → Created
 *   confirmedAt      → (implied by status ≥ confirmed)
 *   checkedInAt      → Checked In
 *   completedAt      → Completed
 *   cancelledAt      → Cancelled
 *
 * No separate audit log endpoint needed — all timestamps are on the booking row.
 */

import { cn }                  from '@/lib/utils/cn';
import { BOOKING_STATUS_CONFIG, type Booking, type BookingStatus } from '@/types/booking.types';

interface TimelineEvent {
  key:       string;
  label:     string;
  timestamp: string | null;
  status:    BookingStatus | 'created';
  isCurrent: boolean;
}

function deriveTimeline(booking: Booking): TimelineEvent[] {
  const events: TimelineEvent[] = [
    { key: 'created',    label: 'Booking created',    timestamp: booking.createdAt,   status: 'reserved',    isCurrent: false },
    { key: 'confirmed',  label: 'Booking confirmed',  timestamp: null,                status: 'confirmed',   isCurrent: false },
    { key: 'checked_in', label: 'Checked in',         timestamp: booking.checkedInAt, status: 'checked_in',  isCurrent: false },
    { key: 'completed',  label: 'Session completed',  timestamp: booking.completedAt, status: 'completed',   isCurrent: false },
  ];

  // Cancellation path
  if (booking.cancelledAt) {
    events.push({ key: 'cancelled', label: 'Booking cancelled', timestamp: booking.cancelledAt, status: 'cancelled', isCurrent: false });
  }

  // Derive confirmed timestamp from booking creation when status is past reserved
  const activeStatuses: BookingStatus[] = ['confirmed', 'checked_in', 'in_progress', 'completed', 'rescheduled'];
  const isConfirmed = activeStatuses.includes(booking.status);
  const confirmedEvent = events.find((e) => e.key === 'confirmed');
  if (confirmedEvent && isConfirmed) {
    // Use createdAt as approximation — exact confirmedAt not stored separately
    confirmedEvent.timestamp = booking.createdAt;
  }

  // Mark current
  events.forEach((e) => {
    e.isCurrent = e.key === booking.status || (e.key === 'created' && booking.status === 'pending_payment');
  });

  return events.filter((e) => e.timestamp !== null || e.isCurrent);
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function BookingTimeline({ booking }: { booking: Booking }): React.ReactElement {
  const events = deriveTimeline(booking);

  return (
    <div className="relative pl-4">
      {/* Vertical track */}
      <div className="absolute left-[11px] top-3 bottom-3 w-px bg-gray-200" aria-hidden="true" />

      <ol className="space-y-4">
        {events.map((event, i) => {
          const cfg      = event.status !== 'created' ? BOOKING_STATUS_CONFIG[event.status as BookingStatus] : null;
          const dotColor = cfg?.dot ?? 'bg-gray-300';
          const isPast   = event.timestamp !== null && !event.isCurrent;
          const isLast   = i === events.length - 1;

          return (
            <li key={event.key} className="relative flex items-start gap-3">
              {/* Dot */}
              <div
                className={cn(
                  'mt-0.5 flex-shrink-0 h-4 w-4 rounded-full border-2 border-white ring-2 z-10',
                  event.isCurrent ? [dotColor, 'ring-blue-300 scale-110'] : isPast ? [dotColor, 'ring-gray-200'] : ['bg-gray-200', 'ring-gray-100'],
                )}
                aria-hidden="true"
              />

              {/* Content */}
              <div className={cn('flex-1 min-w-0 pb-1', isLast ? '' : '')}>
                <p className={cn(
                  'text-xs font-semibold',
                  event.isCurrent ? 'text-gray-900' : isPast ? 'text-gray-700' : 'text-gray-400',
                )}>
                  {event.label}
                </p>
                {event.timestamp && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {formatTimestamp(event.timestamp)}
                  </p>
                )}
                {event.isCurrent && !event.timestamp && (
                  <p className="text-[10px] text-blue-500 mt-0.5">Current status</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
