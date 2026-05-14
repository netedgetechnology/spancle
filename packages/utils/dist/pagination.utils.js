"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalisePagination = normalisePagination;
exports.toSkipTake = toSkipTake;
exports.buildPaginatedResult = buildPaginatedResult;
const constants_1 = require("@spancle/constants");
/**
 * Normalises and clamps pagination query params.
 */
function normalisePagination(query) {
    const page = Math.max(Number(query.page ?? constants_1.PAGINATION.DEFAULT_PAGE), constants_1.PAGINATION.MIN_LIMIT);
    const limit = Math.min(Math.max(Number(query.limit ?? constants_1.PAGINATION.DEFAULT_LIMIT), constants_1.PAGINATION.MIN_LIMIT), constants_1.PAGINATION.MAX_LIMIT);
    return { page, limit };
}
/** Calculates TypeORM-style skip/take from page/limit. */
function toSkipTake(page, limit) {
    return { skip: (page - 1) * limit, take: limit };
}
/** Builds a PaginatedResult wrapper from raw data and count. */
function buildPaginatedResult(data, total, page, limit) {
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
//# sourceMappingURL=pagination.utils.js.map