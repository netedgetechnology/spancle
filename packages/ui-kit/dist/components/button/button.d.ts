import * as React from 'react';
import { buttonVariants, type ButtonVariantProps } from './button.variants';
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariantProps {
    /**
     * When true, renders the button's child as the root element via Radix Slot.
     * Use to compose Button styles onto Link or other elements.
     */
    asChild?: boolean;
    isLoading?: boolean;
    loadingText?: string;
}
/**
 * Button — the primary interactive element.
 *
 * Supports all variants, sizes, loading states and asChild composition.
 * Fully accessible: manages aria-disabled, aria-busy, focus ring.
 */
declare const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;
export { Button, buttonVariants };
//# sourceMappingURL=button.d.ts.map