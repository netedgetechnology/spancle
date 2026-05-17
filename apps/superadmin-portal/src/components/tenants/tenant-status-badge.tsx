import { cn } from '@/lib/utils/cn';
import { STATUS_LABELS, STATUS_STYLES } from '@/types/tenant-detail.types';
import type { TenantStatus } from '@/types/admin.types';

interface TenantStatusBadgeProps {
  status: TenantStatus;
  size?:  'sm' | 'md';
}

export function TenantStatusBadge({ status, size = 'md' }: TenantStatusBadgeProps): React.ReactElement {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full ring-1 ring-inset font-medium',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
      STATUS_STYLES[status] ?? 'bg-gray-50 text-gray-700 ring-gray-600/20',
    )}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
