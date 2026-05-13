'use client';

import { cn } from '@/lib/utils/cn';
import { SLOT_STATUS_CONFIG, type SlotStatus } from '@/types/slot.types';

interface SlotStatusBadgeProps {
  status:    SlotStatus;
  size?:     'xs' | 'sm';
  className?: string;
}

export function SlotStatusBadge({
  status,
  size = 'sm',
  className,
}: SlotStatusBadgeProps): React.ReactElement {
  const cfg = SLOT_STATUS_CONFIG[status];

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-medium ring-1 ring-inset',
      cfg.badgeBg, cfg.badgeText, cfg.ring,
      size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
      className,
    )}>
      <span className={cn(
        'rounded-full flex-shrink-0',
        cfg.dot,
        size === 'xs' ? 'h-1 w-1' : 'h-1.5 w-1.5',
      )} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}
