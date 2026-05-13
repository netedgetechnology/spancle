'use client';

import { useEffect, useState } from 'react';

/**
 * useDebounce — delays updating the returned value until after
 * the given delay has elapsed since the last change.
 *
 * Usage:
 *   const debouncedSearch = useDebounce(searchInput, 300);
 *   // Use debouncedSearch in queries — fires only after user stops typing
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
