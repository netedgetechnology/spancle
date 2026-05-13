import type { Config } from 'tailwindcss';

/**
 * ui-kit Tailwind config.
 *
 * IMPORTANT — consuming apps must include this package in their content array:
 *
 *   content: [
 *     './src/**\/*.{ts,tsx}',
 *     '../../packages/ui-kit/src/**\/*.{ts,tsx}',  // ← required
 *   ]
 *
 * Without this, Tailwind will purge ui-kit classes in production builds.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'toast-slide-in': {
          from: { transform: 'translateX(calc(100% + 1rem))' },
          to:   { transform: 'translateX(0)' },
        },
        'toast-slide-out': {
          from: { transform: 'translateX(0)' },
          to:   { transform: 'translateX(calc(100% + 1rem))' },
        },
        'toast-swipe-out': {
          from: { transform: 'translateX(var(--radix-toast-swipe-end-x))' },
          to:   { transform: 'translateX(calc(100% + 1rem))' },
        },
        'fade-in':  { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
      },
      animation: {
        'toast-slide-in':  'toast-slide-in 150ms cubic-bezier(0.16, 1, 0.3, 1)',
        'toast-slide-out': 'toast-slide-out 100ms ease-in',
        'toast-swipe-out': 'toast-swipe-out 100ms ease-out',
        'fade-in':         'fade-in 150ms ease-out',
        'fade-out':        'fade-out 150ms ease-in',
      },
    },
  },
  plugins: [],
};

export default config;
