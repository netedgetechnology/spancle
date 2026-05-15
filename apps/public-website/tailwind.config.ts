import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    // ui-kit source — ensures button/badge/card variants are not purged
    '../../packages/ui-kit/src/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    // CMS section background styles (set dynamically from payload.bgStyle)
    'bg-primary-600', 'bg-gray-900', 'bg-gray-50', 'bg-white',
    'bg-primary-50', 'bg-slate-900',
    // Text colours used by CMS sections
    'text-white', 'text-gray-900', 'text-gray-600', 'text-gray-300',
    // Overlay and opacity utilities
    'opacity-40', 'opacity-60',
    // Grid columns used by feature/pricing sections
    'sm:grid-cols-2', 'lg:grid-cols-3', 'lg:grid-cols-4',
    // Rotate for accordion chevron
    'rotate-180',
    // Max-height for accordion animation
    'max-h-0', 'max-h-[1000px]',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc',
          400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1',
          800: '#075985', 900: '#0c4a6e', 950: '#082f49',
        },
        brand: { DEFAULT: '#0ea5e9', dark: '#0369a1' },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
