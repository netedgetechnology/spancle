'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface ModalProps {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  title:         string;
  description?:  string;
  children:      React.ReactNode;
  footer?:       React.ReactNode;
  size?:         'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Prevents closing when clicking the backdrop */
  persistent?:   boolean;
  className?:    string;
}

const SIZE_MAP = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-2xl',
  full: 'max-w-[calc(100vw-2rem)]',
} as const;

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
function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size      = 'md',
  persistent = false,
  className,
}: ModalProps): React.ReactElement {
  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen && persistent) return;
    onOpenChange(nextOpen);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm',
            'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
          )}
        />

        {/* Panel */}
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2',
            'rounded-xl border border-gray-200 bg-white shadow-xl',
            'focus:outline-none',
            'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
            SIZE_MAP[size],
            className,
          )}
          onInteractOutside={(e) => {
            if (persistent) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (persistent) e.preventDefault();
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
            <div className="flex flex-col gap-0.5 pr-8">
              <Dialog.Title className="text-base font-semibold text-gray-900">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="text-sm text-gray-500">
                  {description}
                </Dialog.Description>
              )}
            </div>
            {!persistent && (
              <Dialog.Close
                className={cn(
                  'rounded-md p-1 text-gray-400 transition-colors',
                  'hover:bg-gray-100 hover:text-gray-600',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
                )}
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Dialog.Close>
            )}
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { Modal };
