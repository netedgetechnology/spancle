'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface SelectOption {
  value:     string;
  label:     string;
  disabled?: boolean;
}

export interface SelectGroupOption {
  groupLabel: string;
  options:    SelectOption[];
}

export interface SelectProps {
  value?:        string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?:  string;
  options:       (SelectOption | SelectGroupOption)[];
  disabled?:     boolean;
  error?:        string;
  label?:        string;
  required?:     boolean;
  id?:           string;
  className?:    string;
}

function isGroupOption(opt: SelectOption | SelectGroupOption): opt is SelectGroupOption {
  return 'groupLabel' in opt;
}

/**
 * Select — accessible dropdown built on Radix UI Select primitive.
 * Supports flat options and grouped options.
 */
function Select({
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Select an option',
  options,
  disabled = false,
  error,
  label,
  required,
  id: idProp,
  className,
}: SelectProps): React.ReactElement {
  const generatedId = React.useId();
  const id          = idProp ?? generatedId;
  const errorId     = `${id}-error`;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={id}
          className={cn(
            'text-sm font-medium text-gray-700',
            disabled && 'opacity-50',
          )}
        >
          {label}
          {required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
        </label>
      )}

      <SelectPrimitive.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          aria-required={required}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border px-3 text-sm',
            'bg-white text-gray-900',
            'placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50',
            'transition-colors duration-150',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200',
            className,
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className={cn(
              'relative z-50 min-w-[8rem] overflow-hidden',
              'rounded-md border border-gray-200 bg-white shadow-md',
              'data-[state=open]:animate-fade-in',
            )}
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((opt, idx) =>
                isGroupOption(opt) ? (
                  <SelectPrimitive.Group key={`group-${idx}`}>
                    <SelectPrimitive.Label className="px-2 py-1.5 text-xs font-semibold text-gray-400">
                      {opt.groupLabel}
                    </SelectPrimitive.Label>
                    {opt.options.map((item) => (
                      <SelectItem key={item.value} {...item} />
                    ))}
                  </SelectPrimitive.Group>
                ) : (
                  <SelectItem key={opt.value} {...opt} />
                ),
              )}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>

      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function SelectItem({
  value,
  label,
  disabled,
}: SelectOption): React.ReactElement {
  return (
    <SelectPrimitive.Item
      value={value}
      disabled={disabled}
      className={cn(
        'relative flex cursor-default select-none items-center',
        'rounded-sm px-2 py-1.5 pl-7 text-sm text-gray-900',
        'outline-none transition-colors',
        'focus:bg-primary-50 focus:text-primary-700',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
      )}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{label}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export { Select };
