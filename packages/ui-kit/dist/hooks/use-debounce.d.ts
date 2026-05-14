/**
 * useDebounce — delays updating the returned value until after
 * the given delay has elapsed since the last change.
 *
 * Usage:
 *   const debouncedSearch = useDebounce(searchInput, 300);
 *   // Use debouncedSearch in queries — fires only after user stops typing
 */
export declare function useDebounce<T>(value: T, delayMs: number): T;
//# sourceMappingURL=use-debounce.d.ts.map