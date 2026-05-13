'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/cn';
import { buttonVariants, type ButtonVariantProps } from './button.variants';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantProps {
  /**
   * When true, renders the button's child as the root element via Radix Slot.
   * Use to compose Button styles onto Link or other elements.
   */
  asChild?:    boolean;
  isLoading?:  boolean;
  loadingText?: string;
}

/**
 * Button — the primary interactive element.
 *
 * Supports all variants, sizes, loading states and asChild composition.
 * Fully accessible: manages aria-disabled, aria-busy, focus ring.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      iconOnly,
      asChild     = false,
      isLoading   = false,
      loadingText,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    const isDisabled = disabled ?? isLoading;

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth, iconOnly }), className)}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>{loadingText ?? children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
