"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDebounce = useDebounce;
const react_1 = require("react");
/**
 * useDebounce — delays updating the returned value until after
 * the given delay has elapsed since the last change.
 *
 * Usage:
 *   const debouncedSearch = useDebounce(searchInput, 300);
 *   // Use debouncedSearch in queries — fires only after user stops typing
 */
function useDebounce(value, delayMs) {
    const [debouncedValue, setDebouncedValue] = (0, react_1.useState)(value);
    (0, react_1.useEffect)(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delayMs);
        return () => {
            clearTimeout(timer);
        };
    }, [value, delayMs]);
    return debouncedValue;
}
//# sourceMappingURL=use-debounce.js.map