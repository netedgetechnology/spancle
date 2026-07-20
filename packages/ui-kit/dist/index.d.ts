/**
 * @spancle/ui-kit — Accessible, headless UI component library.
 *
 * Built on Radix UI primitives with Tailwind CSS styling via CVA variants.
 *
 * IMPORTANT — consuming app Tailwind config must include:
 *   content: [
 *     './src/**\/*.{ts,tsx}',
 *     '../../packages/ui-kit/src/**\/*.{ts,tsx}',
 *   ]
 *
 * All interactive components are Client Components ('use client').
 * Display-only components (Card, Badge, Table) are RSC-safe.
 */
export { colors, typography, spacing, tw } from './tokens/design-tokens';
export type { NavItem } from './tokens/design-tokens';
export type { AuthUser, AuthState, AuthStatus, LogoutOptions } from './hooks/auth.hooks';
export { UserMenu } from './components/user-menu/user-menu';
export type { UserMenuProps, UserMenuLink } from './components/user-menu/user-menu';
export { Button, buttonVariants } from './components/button/button';
export type { ButtonProps } from './components/button/button';
export type { ButtonVariantProps } from './components/button/button.variants';
export { Input } from './components/input/input';
export type { InputProps } from './components/input/input';
export { Badge, badgeVariants } from './components/badge/badge';
export type { BadgeProps } from './components/badge/badge';
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, } from './components/card/card';
export type { CardProps } from './components/card/card';
export { Modal } from './components/modal/modal';
export type { ModalProps } from './components/modal/modal';
export { Select } from './components/select/select';
export type { SelectProps, SelectOption, SelectGroupOption } from './components/select/select';
export { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption, } from './components/table/table';
export { Toast, ToastProvider, useToast, } from './components/toast/toast';
export type { ToastIntent, ToastMessage } from './components/toast/toast';
export { useDisclosure } from './hooks/use-disclosure';
export type { DisclosureState } from './hooks/use-disclosure';
export { useDebounce } from './hooks/use-debounce';
export type { Size, Variant, ColorIntent, Orientation, BaseComponentProps, DisableableProps, LabelledProps, FormFieldProps, } from './types/component.types';
export { cn } from './lib/cn';
//# sourceMappingURL=index.d.ts.map