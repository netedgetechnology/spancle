import { z } from 'zod';
declare const __brand: unique symbol;
type Brand<T, B> = T & {
    readonly [__brand]: B;
};
export type UUID = Brand<string, 'UUID'>;
export type TenantId = Brand<string, 'TenantId'>;
export type UserId = Brand<string, 'UserId'>;
export type Email = Brand<string, 'Email'>;
export type Timestamp = Brand<string, 'Timestamp'>;
export type CurrencyCode = Brand<string, 'CurrencyCode'>;
export declare const PaginationQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortDir: z.ZodDefault<z.ZodEnum<["ASC", "DESC"]>>;
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortDir: "ASC" | "DESC";
    search?: string | undefined;
    sortBy?: string | undefined;
}, {
    search?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortDir?: "ASC" | "DESC" | undefined;
}>;
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}
export interface ApiSuccessResponse<T> {
    success: true;
    data: T;
    message?: string;
    meta?: Record<string, unknown>;
}
export interface ApiErrorResponse {
    success: false;
    statusCode: number;
    error: string;
    message: string | string[];
    timestamp: string;
    path?: string;
    details?: Record<string, string[]>;
}
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
export interface AuditFields {
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
    createdBy?: string;
    updatedBy?: string;
}
export declare const AddressSchema: z.ZodObject<{
    line1: z.ZodString;
    line2: z.ZodOptional<z.ZodString>;
    city: z.ZodString;
    state: z.ZodOptional<z.ZodString>;
    postalCode: z.ZodString;
    country: z.ZodString;
}, "strip", z.ZodTypeAny, {
    line1: string;
    city: string;
    postalCode: string;
    country: string;
    line2?: string | undefined;
    state?: string | undefined;
}, {
    line1: string;
    city: string;
    postalCode: string;
    country: string;
    line2?: string | undefined;
    state?: string | undefined;
}>;
export type Address = z.infer<typeof AddressSchema>;
export declare const MoneySchema: z.ZodObject<{
    amount: z.ZodNumber;
    currency: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currency: string;
    amount: number;
}, {
    currency: string;
    amount: number;
}>;
export type Money = z.infer<typeof MoneySchema>;
export interface SortOption {
    field: string;
    direction: 'ASC' | 'DESC';
}
export interface FilterOption {
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'nin';
    value: unknown;
}
export type ActiveStatus = 'active' | 'inactive';
export type LifecycleStatus = 'draft' | 'active' | 'archived' | 'deleted';
export {};
//# sourceMappingURL=common.types.d.ts.map