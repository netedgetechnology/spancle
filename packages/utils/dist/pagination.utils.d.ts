import type { PaginatedResult, PaginationQuery } from '@spancle/types';
/**
 * Normalises and clamps pagination query params.
 */
export declare function normalisePagination(query: Partial<PaginationQuery>): Required<Pick<PaginationQuery, 'page' | 'limit'>>;
/** Calculates TypeORM-style skip/take from page/limit. */
export declare function toSkipTake(page: number, limit: number): {
    skip: number;
    take: number;
};
/** Builds a PaginatedResult wrapper from raw data and count. */
export declare function buildPaginatedResult<T>(data: T[], total: number, page: number, limit: number): PaginatedResult<T>;
//# sourceMappingURL=pagination.utils.d.ts.map