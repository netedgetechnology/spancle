import * as React from 'react';
export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}
export interface SelectGroupOption {
    groupLabel: string;
    options: SelectOption[];
}
export interface SelectProps {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    placeholder?: string;
    options: (SelectOption | SelectGroupOption)[];
    disabled?: boolean;
    error?: string;
    label?: string;
    required?: boolean;
    id?: string;
    className?: string;
}
/**
 * Select — accessible dropdown built on Radix UI Select primitive.
 * Supports flat options and grouped options.
 */
declare function Select({ value, defaultValue, onValueChange, placeholder, options, disabled, error, label, required, id: idProp, className, }: SelectProps): React.ReactElement;
export { Select };
//# sourceMappingURL=select.d.ts.map