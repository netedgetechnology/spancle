/**
 * Shared component prop types used across the ui-kit.
 */
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive' | 'link';
export type ColorIntent = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type Orientation = 'horizontal' | 'vertical';
export interface BaseComponentProps {
    className?: string;
    id?: string;
    testId?: string;
}
/** Props for components that can be disabled */
export interface DisableableProps {
    disabled?: boolean;
}
/** Props for components that carry a visible label */
export interface LabelledProps {
    label?: string;
    description?: string;
    required?: boolean;
}
/** Props for form field components */
export interface FormFieldProps extends BaseComponentProps, DisableableProps, LabelledProps {
    name: string;
    error?: string;
    hideLabel?: boolean;
}
//# sourceMappingURL=component.types.d.ts.map