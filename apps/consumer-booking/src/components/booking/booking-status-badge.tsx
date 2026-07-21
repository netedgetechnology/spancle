'use client';

import { cn }                  from '@/lib/utils/cn';
import { BOOKING_STATUS_CONFIG, type BookingStatus } from '@/types/booking.types';

interface BookingStatusBadgeProps {
  status:     BookingStatus;
  size?:      'sm' | 'md';
  className?: string;
}

/**
 * BookingStatusBadge — coloured pill for any booking status.
 * Covers all 11 backend statuses. Used in list, detail, and reschedule pages.
 */
export function BookingStatusBadge({ status, size = 'md', className }: BookingStatusBadgeProps): React.ReactElement {
  const cfg = BOOKING_STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        cfg.bg,
        cfg.text,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', cfg.dot)} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}
