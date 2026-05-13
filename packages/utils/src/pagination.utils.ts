import type { PaginatedResult, PaginationQuery } from '@spancle/types';
import { PAGINATION } from '@spancle/constants';

/**
 * Normalises and clamps pagination query params.
 */
export function normalisePagination(query: Partial<PaginationQuery>): Required<Pick<PaginationQuery, 'page' | 'limit'>> {
  const page  = Math.max(Number(query.page  ?? PAGINATION.DEFAULT_PAGE),  PAGINATION.MIN_LIMIT);
  const limit = Math.min(
    Math.max(Number(query.limit ?? PAGINATION.DEFAULT_LIMIT), PAGINATION.MIN_LIMIT),
    PAGINATION.MAX_LIMIT,
  );
  return { page, limit };
}

/** Calculates TypeORM-style skip/take from page/limit. */
export function toSkipTake(page: number, limit: number): { skip: number; take: number } {
  return { skip: (page - 1) * limit, take: limit };
}

/** Builds a PaginatedResult wrapper from raw data and count. */
export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
