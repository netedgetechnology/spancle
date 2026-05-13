import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  // Base classes applied to every button
  [
    'inline-flex items-center justify-center gap-2',
    'rounded-md font-medium',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none whitespace-nowrap',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-primary-600 text-white',
          'hover:bg-primary-700 active:bg-primary-800',
          'focus-visible:ring-primary-500',
        ],
        secondary: [
          'bg-gray-100 text-gray-900',
          'hover:bg-gray-200 active:bg-gray-300',
          'focus-visible:ring-gray-400',
        ],
        outline: [
          'border border-gray-300 bg-white text-gray-700',
          'hover:bg-gray-50 active:bg-gray-100',
          'focus-visible:ring-gray-400',
        ],
        ghost: [
          'bg-transparent text-gray-700',
          'hover:bg-gray-100 active:bg-gray-200',
          'focus-visible:ring-gray-400',
        ],
        destructive: [
          'bg-red-600 text-white',
          'hover:bg-red-700 active:bg-red-800',
          'focus-visible:ring-red-500',
        ],
        link: [
          'bg-transparent text-primary-600 underline-offset-4',
          'hover:underline',
          'focus-visible:ring-primary-500',
          'h-auto p-0',
        ],
      },
      size: {
        xs: 'h-7  px-2.5 text-xs',
        sm: 'h-8  px-3   text-sm',
        md: 'h-9  px-4   text-sm',
        lg: 'h-10 px-5   text-base',
        xl: 'h-12 px-6   text-base',
      },
      fullWidth: {
        true:  'w-full',
        false: 'w-auto',
      },
      iconOnly: {
        true:  'px-0',
        false: '',
      },
    },
    defaultVariants: {
      variant:   'primary',
      size:      'md',
      fullWidth: false,
      iconOnly:  false,
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
