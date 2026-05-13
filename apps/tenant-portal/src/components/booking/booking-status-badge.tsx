'use client';

import { cn } from '@/lib/utils/cn';
import { BOOKING_STATUS_CONFIG, type BookingStatus } from '@/types/booking.types';

interface BookingStatusBadgeProps {
  status:     BookingStatus;
  size?:      'xs' | 'sm' | 'md';
  className?: string;
}

export function BookingStatusBadge({
  status,
  size = 'sm',
  className,
}: BookingStatusBadgeProps): React.ReactElement {
  const cfg = BOOKING_STATUS_CONFIG[status];
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset',
      cfg.bg, cfg.text, cfg.ring,
      size === 'xs' && 'px-1.5 py-0.5 text-[10px]',
      size === 'sm' && 'px-2 py-0.5 text-xs',
      size === 'md' && 'px-2.5 py-1 text-sm',
      className,
    )}>
      <span
        className={cn('rounded-full flex-shrink-0', cfg.dot,
          size === 'xs' ? 'h-1 w-1' : size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2',
        )}
        aria-hidden="true"
      />
      {cfg.label}
    </span>
  );
}
