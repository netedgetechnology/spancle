import * as React from 'react';
import { type InputVariantProps } from './input.variants';
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'>, Omit<InputVariantProps, 'size'> {
    size?: 'sm' | 'md' | 'lg';
    label?: string;
    description?: string;
    error?: string;
    hideLabel?: boolean;
    prefix?: React.ReactNode;
    suffix?: React.ReactNode;
}
/**
 * Input — accessible text input with label, description, error and
 * leading/trailing adornment slots.
 *
 * Automatically applies error intent when error prop is provided.
 * Label is always rendered for accessibility — use hideLabel for visual hiding.
 */
declare const Input: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLInputElement>>;
export { Input };
//# sourceMappingURL=input.d.ts.map