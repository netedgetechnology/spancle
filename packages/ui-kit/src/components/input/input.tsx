'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '../../lib/cn';
import { inputVariants, type InputVariantProps } from './input.variants';

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'>,
    Omit<InputVariantProps, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  label?:       string;
  description?: string;
  error?:       string;
  hideLabel?:   boolean;
  prefix?:      React.ReactNode;
  suffix?:      React.ReactNode;
}

/**
 * Input — accessible text input with label, description, error and
 * leading/trailing adornment slots.
 *
 * Automatically applies error intent when error prop is provided.
 * Label is always rendered for accessibility — use hideLabel for visual hiding.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      intent,
      size,
      label,
      description,
      error,
      hideLabel = false,
      prefix,
      suffix,
      id: idProp,
      required,
      disabled,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const id          = idProp ?? generatedId;
    const descId      = `${id}-desc`;
    const errorId     = `${id}-error`;

    const resolvedIntent = error ? 'error' : intent;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <LabelPrimitive.Root
            htmlFor={id}
            className={cn(
              'text-sm font-medium text-gray-700',
              hideLabel && 'sr-only',
              disabled && 'opacity-50',
            )}
          >
            {label}
            {required && (
              <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>
            )}
          </LabelPrimitive.Root>
        )}

        {description && !hideLabel && (
          <p id={descId} className="text-xs text-gray-500">
            {description}
          </p>
        )}

        <div className="relative flex items-center">
          {prefix && (
            <div className="pointer-events-none absolute left-3 flex items-center text-gray-400">
              {prefix}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            className={cn(
              inputVariants({ intent: resolvedIntent, size }),
              prefix && 'pl-9',
              suffix && 'pr-9',
              className,
            )}
            aria-describedby={
              [description && descId, error && errorId]
                .filter(Boolean)
                .join(' ') || undefined
            }
            aria-invalid={error ? true : undefined}
            aria-required={required}
            disabled={disabled}
            required={required}
            {...props}
          />

          {suffix && (
            <div className="pointer-events-none absolute right-3 flex items-center text-gray-400">
              {suffix}
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export { Input };
