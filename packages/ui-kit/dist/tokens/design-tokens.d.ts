/**
 * design-tokens.ts
 *
 * Canonical design tokens for all Spancle applications.
 * Import these constants instead of hardcoding Tailwind class strings.
 *
 * Theme values map directly to tailwind.config.ts extension keys.
 * Light/dark variants are provided for each semantic token.
 */
export declare const colors: {
    readonly brand: {
        readonly primary: "#0ea5e9";
        readonly primaryDk: "#0369a1";
        readonly secondary: "#8b5cf6";
    };
    readonly semantic: {
        readonly success: "#22c55e";
        readonly warning: "#f59e0b";
        readonly error: "#ef4444";
        readonly info: "#3b82f6";
    };
};
export declare const typography: {
    readonly fontFamily: {
        readonly sans: "var(--font-inter), system-ui, sans-serif";
    };
    readonly fontSize: {
        readonly xs: "0.75rem";
        readonly sm: "0.875rem";
        readonly base: "1rem";
        readonly lg: "1.125rem";
        readonly xl: "1.25rem";
        readonly '2xl': "1.5rem";
        readonly '3xl': "1.875rem";
    };
};
export declare const spacing: {
    readonly pagePadding: "p-4 sm:p-6";
    readonly cardPadding: "p-4 sm:p-5";
    readonly sectionGap: "space-y-6";
    readonly inputPadding: "px-3 py-2";
};
export declare const tw: {
    readonly page: "bg-gray-50 dark:bg-gray-950";
    readonly card: "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm";
    readonly sidebar: "bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800";
    readonly textPrimary: "text-gray-900 dark:text-gray-100";
    readonly textSecondary: "text-gray-600 dark:text-gray-400";
    readonly textMuted: "text-gray-400 dark:text-gray-600";
    readonly badge: {
        readonly success: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400";
        readonly warning: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
        readonly error: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400";
        readonly info: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
        readonly neutral: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    };
    readonly navActive: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    readonly navInactive: "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800";
    readonly btnPrimary: "bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors";
    readonly btnSecondary: "bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300";
    readonly btnDanger: "bg-red-50 hover:bg-red-100 text-red-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors dark:bg-red-900/20 dark:text-red-400";
};
export interface NavItem {
    label: string;
    href: string;
    icon?: string;
    badge?: string | number;
    children?: NavItem[];
    roles?: string[];
}
//# sourceMappingURL=design-tokens.d.ts.map