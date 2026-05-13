import { cva, type VariantProps } from 'class-variance-authority';

export const badgeVariants = cva(
  [
    'inline-flex items-center gap-1 rounded-full font-medium',
    'transition-colors',
  ],
  {
    variants: {
      intent: {
        default:     'bg-gray-100  text-gray-700',
        primary:     'bg-primary-100 text-primary-700',
        success:     'bg-green-100  text-green-700',
        warning:     'bg-amber-100  text-amber-700',
        danger:      'bg-red-100    text-red-700',
        info:        'bg-blue-100   text-blue-700',
      },
      size: {
        sm: 'px-2   py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3   py-1   text-sm',
      },
      dot: {
        true:  '',
        false: '',
      },
    },
    defaultVariants: {
      intent: 'default',
      size:   'md',
      dot:    false,
    },
  },
);

export type BadgeVariantProps = VariantProps<typeof badgeVariants>;
