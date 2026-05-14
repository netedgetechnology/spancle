import * as React from 'react';
import { badgeVariants, type BadgeVariantProps } from './badge.variants';
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, BadgeVariantProps {
    dot?: boolean;
}
/**
 * Badge — inline status/category label.
 * Server Component safe — no interactivity.
 */
declare function Badge({ className, intent, size, dot, children, ...props }: BadgeProps): React.ReactElement;
export { Badge, badgeVariants };
//# sourceMappingURL=badge.d.ts.map