import { cn } from '@/lib/utils/cn';
import { STATUS_CONFIG, type BranchStatus } from '@/types/branch.types';

interface BranchStatusBadgeProps {
  status:    BranchStatus;
  size?:     'sm' | 'md';
  showDot?:  boolean;
  className?: string;
}

/**
 * BranchStatusBadge — displays branch status as a coloured pill badge.
 */
export function BranchStatusBadge({
  status,
  size     = 'sm',
  showDot  = true,
  className,
}: BranchStatusBadgeProps): React.ReactElement {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset',
        config.bg,
        config.text,
        config.ringBg,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className,
      )}
    >
      {showDot && (
        <span
          className={cn('rounded-full flex-shrink-0', config.dot, size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2')}
          aria-hidden="true"
        />
      )}
      {config.label}
    </span>
  );
}
