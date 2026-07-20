"use strict";
/**
 * design-tokens.ts
 *
 * Canonical design tokens for all Spancle applications.
 * Import these constants instead of hardcoding Tailwind class strings.
 *
 * Theme values map directly to tailwind.config.ts extension keys.
 * Light/dark variants are provided for each semantic token.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.tw = exports.spacing = exports.typography = exports.colors = void 0;
// ── Colour palette ────────────────────────────────────────────────────────────
exports.colors = {
    brand: {
        primary: '#0ea5e9', // sky-500
        primaryDk: '#0369a1', // sky-700
        secondary: '#8b5cf6', // violet-500
    },
    semantic: {
        success: '#22c55e', // green-500
        warning: '#f59e0b', // amber-500
        error: '#ef4444', // red-500
        info: '#3b82f6', // blue-500
    },
};
// ── Typography scale ──────────────────────────────────────────────────────────
exports.typography = {
    fontFamily: { sans: 'var(--font-inter), system-ui, sans-serif' },
    fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
    },
};
// ── Spacing ────────────────────────────────────────────────────────────────────
exports.spacing = {
    pagePadding: 'p-4 sm:p-6',
    cardPadding: 'p-4 sm:p-5',
    sectionGap: 'space-y-6',
    inputPadding: 'px-3 py-2',
};
// ── Semantic Tailwind classes (light mode defaults) ───────────────────────────
exports.tw = {
    // Surfaces
    page: 'bg-gray-50 dark:bg-gray-950',
    card: 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm',
    sidebar: 'bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800',
    // Text
    textPrimary: 'text-gray-900 dark:text-gray-100',
    textSecondary: 'text-gray-600 dark:text-gray-400',
    textMuted: 'text-gray-400 dark:text-gray-600',
    // Status badges
    badge: {
        success: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        error: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        info: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    },
    // Nav link states
    navActive: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    navInactive: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800',
    // Buttons (supplement @spancle/ui-kit Button)
    btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors',
    btnSecondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300',
    btnDanger: 'bg-red-50 hover:bg-red-100 text-red-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors dark:bg-red-900/20 dark:text-red-400',
};
//# sourceMappingURL=design-tokens.js.map