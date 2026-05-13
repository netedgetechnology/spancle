import { z } from 'zod';

// ── Branded primitives ────────────────────────────────────────────────────────

declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

export type UUID        = Brand<string, 'UUID'>;
export type TenantId    = Brand<string, 'TenantId'>;
export type UserId      = Brand<string, 'UserId'>;
export type Email       = Brand<string, 'Email'>;
export type Timestamp   = Brand<string, 'Timestamp'>;   // ISO-8601
export type CurrencyCode = Brand<string, 'CurrencyCode'>; // ISO 4217

// ── Pagination ────────────────────────────────────────────────────────────────

export const PaginationQuerySchema = z.object({
  page:    z.coerce.number().int().min(1).default(1),
  limit:   z.coerce.number().int().min(1).max(100).default(20),
  sortBy:  z.string().optional(),
  sortDir: z.enum(['ASC', 'DESC']).default('DESC'),
  search:  z.string().max(200).optional(),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export interface PaginatedResult<T> {
  data:        T[];
  total:       number;
  page:        number;
  limit:       number;
  totalPages:  number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ── API response envelope ─────────────────────────────────────────────────────

export interface ApiSuccessResponse<T> {
  success: true;
  data:    T;
  message?: string;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success:    false;
  statusCode: number;
  error:      string;
  message:    string | string[];
  timestamp:  string;
  path?:      string;
  details?:   Record<string, string[]>;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ── Audit ─────────────────────────────────────────────────────────────────────

export interface AuditFields {
  createdAt:  Date;
  updatedAt:  Date;
  deletedAt?: Date | null;
  createdBy?: string;
  updatedBy?: string;
}

// ── Address ───────────────────────────────────────────────────────────────────

export const AddressSchema = z.object({
  line1:      z.string().max(255),
  line2:      z.string().max(255).optional(),
  city:       z.string().max(100),
  state:      z.string().max(100).optional(),
  postalCode: z.string().max(20),
  country:    z.string().length(2), // ISO 3166-1 alpha-2
});

export type Address = z.infer<typeof AddressSchema>;

// ── Money ─────────────────────────────────────────────────────────────────────

export const MoneySchema = z.object({
  amount:   z.number().int().min(0), // stored in minor units (pence/cents)
  currency: z.string().length(3),    // ISO 4217
});

export type Money = z.infer<typeof MoneySchema>;

// ── Sort / Filter ─────────────────────────────────────────────────────────────

export interface SortOption {
  field:     string;
  direction: 'ASC' | 'DESC';
}

export interface FilterOption {
  field:    string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'nin';
  value:    unknown;
}

// ── Status ────────────────────────────────────────────────────────────────────

export type ActiveStatus = 'active' | 'inactive';
export type LifecycleStatus = 'draft' | 'active' | 'archived' | 'deleted';
