/**
 * Pagination Constants
 */

export const PAGINATION = {
  DEFAULT_PAGE:  1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT:     100,
  MIN_LIMIT:     1,
} as const;

export const SORT_DIRECTIONS = {
  ASC:  'ASC',
  DESC: 'DESC',
} as const;

export type SortDirection = typeof SORT_DIRECTIONS[keyof typeof SORT_DIRECTIONS];
