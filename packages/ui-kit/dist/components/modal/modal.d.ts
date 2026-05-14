import * as React from 'react';
export interface ModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    /** Prevents closing when clicking the backdrop */
    persistent?: boolean;
    className?: string;
}
/**
 * Modal — accessible dialog built on Radix UI Dialog primitive.
 *
 * Features:
 *   - Focus trap managed by Radix
 *   - Escape key closes (unless persistent=true)
 *   - Backdrop click closes (unless persistent=true)
 *   - Screen reader announcements via title and description
 *   - Portal renders outside app DOM tree
 */
declare function Modal({ open, onOpenChange, title, description, children, footer, size, persistent, className, }: ModalProps): React.ReactElement;
export { Modal };
//# sourceMappingURL=modal.d.ts.map