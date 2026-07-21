'use client';

import { cn }               from '@/lib/utils/cn';
import { QR_STATUS_CONFIG, type QrTokenStatus } from '@/types/booking.types';

interface QrStatusBadgeProps {
  status:     QrTokenStatus;
  size?:      'sm' | 'md';
  showDesc?:  boolean;
  className?: string;
}

/**
 * QrStatusBadge — coloured pill for QR token status.
 * Covers: active, used, expired, revoked.
 */
export function QrStatusBadge({
  status, size = 'md', showDesc, className,
}: QrStatusBadgeProps): React.ReactElement {
  const cfg = QR_STATUS_CONFIG[status];

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        cfg.bg, cfg.text,
      )}>
        <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', cfg.dot)} aria-hidden="true" />
        {cfg.label}
      </span>
      {showDesc && (
        <span className={cn('text-[10px]', cfg.text, 'opacity-80 pl-1')}>{cfg.desc}</span>
      )}
    </div>
  );
}
