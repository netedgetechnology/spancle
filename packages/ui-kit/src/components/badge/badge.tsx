import * as React from 'react';
import { cn } from '../../lib/cn';
import { badgeVariants, type BadgeVariantProps } from './badge.variants';

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    BadgeVariantProps {
  dot?: boolean;
}

/**
 * Badge — inline status/category label.
 * Server Component safe — no interactivity.
 */
function Badge({
  className,
  intent,
  size,
  dot = false,
  children,
  ...props
}: BadgeProps): React.ReactElement {
  return (
    <span
      className={cn(badgeVariants({ intent, size, dot }), className)}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full bg-current',
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
