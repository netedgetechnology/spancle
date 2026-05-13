import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

// ── Shared granularity ────────────────────────────────────────────────────────

export const GRANULARITIES = ['day', 'week', 'month', 'quarter', 'year'] as const;
export type Granularity = typeof GRANULARITIES[number];

// ── Base date range ───────────────────────────────────────────────────────────

export class DateRangeDto {
  /** ISO date string — inclusive start. e.g. '2025-04-01' */
  @IsDateString()
  from!: string;

  /** ISO date string — inclusive end. e.g. '2025-06-30' */
  @IsDateString()
  to!: string;

  @IsEnum(GRANULARITIES)
  @IsOptional()
  granularity?: Granularity;
}

// ── Revenue summary query ─────────────────────────────────────────────────────

export class RevenueSummaryQueryDto extends DateRangeDto {
  @IsUUID() @IsOptional()
  branchId?: string;

  @IsEnum(['booking', 'membership', 'academy', 'manual', 'credit_note']) @IsOptional()
  invoiceType?: string;

  /** Include voided/cancelled invoices in totals (default: false) */
  @IsOptional()
  @Transform(({ value }: { value: string }) => value === 'true')
  includeCancelled?: boolean;
}

// ── GST summary query ─────────────────────────────────────────────────────────

export class GstSummaryQueryDto extends DateRangeDto {
  @IsUUID() @IsOptional()
  branchId?: string;

  @IsEnum(['intra_state', 'inter_state', 'exempt', 'zero_rated', 'composite']) @IsOptional()
  gstType?: string;

  /** HSN/SAC code filter */
  @IsString() @IsOptional()
  hsnSacCode?: string;

  /** Financial year filter — overrides from/to when set. e.g. '2024-25' */
  @IsString() @IsOptional()
  financialYear?: string;
}

// ── Payment mode report query ─────────────────────────────────────────────────

export class PaymentModeReportQueryDto extends DateRangeDto {
  @IsUUID() @IsOptional()
  branchId?: string;

  @IsEnum([
    'cash', 'upi', 'card_debit', 'card_credit',
    'bank_transfer', 'cheque', 'voucher',
  ]) @IsOptional()
  method?: string;

  @IsEnum([
    'initiated', 'pending', 'captured', 'settled',
    'failed', 'cancelled', 'refunded', 'partial_refund',
  ]) @IsOptional()
  status?: string;

  /** Include failed and cancelled payments (default: false) */
  @IsOptional()
  @Transform(({ value }: { value: string }) => value === 'true')
  includeUnsuccessful?: boolean;
}

// ── Branch revenue report query ───────────────────────────────────────────────

export class BranchRevenueQueryDto extends DateRangeDto {
  /** When set, returns only this branch; otherwise returns all branches */
  @IsUUID() @IsOptional()
  branchId?: string;

  @IsEnum(['revenue', 'invoices', 'payments']) @IsOptional()
  sortBy?: 'revenue' | 'invoices' | 'payments';

  @IsInt() @Min(1) @Max(100) @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  limit?: number;
}
