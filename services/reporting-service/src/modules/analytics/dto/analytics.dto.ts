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

export const GRANULARITIES = ['hour', 'day', 'week', 'month'] as const;
export type  Granularity   = typeof GRANULARITIES[number];

// ── Base ──────────────────────────────────────────────────────────────────────

export class AnalyticsDateRangeDto {
  /** YYYY-MM-DD inclusive start */
  @IsDateString()
  from!: string;

  /** YYYY-MM-DD inclusive end */
  @IsDateString()
  to!: string;
}

// ── Occupancy ─────────────────────────────────────────────────────────────────

export class OccupancyQueryDto extends AnalyticsDateRangeDto {
  @IsUUID() @IsOptional()
  branchId?: string;

  @IsUUID() @IsOptional()
  courtId?: string;

  @IsUUID() @IsOptional()
  sportId?: string;

  @IsEnum(GRANULARITIES) @IsOptional()
  granularity?: Granularity;

  /** Include cancelled slots in denominators (default false) */
  @IsOptional()
  @Transform(({ value }: { value: string }) => value === 'true')
  includeCancelled?: boolean;
}

// ── Court utilisation ─────────────────────────────────────────────────────────

export class CourtUtilizationQueryDto extends AnalyticsDateRangeDto {
  @IsUUID() @IsOptional()
  branchId?: string;

  @IsUUID() @IsOptional()
  courtId?: string;

  @IsEnum(['revenue', 'bookings', 'utilization']) @IsOptional()
  sortBy?: 'revenue' | 'bookings' | 'utilization';

  @IsInt() @Min(1) @Max(100) @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  limit?: number;
}

// ── Peak hours ────────────────────────────────────────────────────────────────

export class PeakHourQueryDto extends AnalyticsDateRangeDto {
  @IsUUID() @IsOptional()
  branchId?: string;

  @IsUUID() @IsOptional()
  courtId?: string;

  @IsUUID() @IsOptional()
  sportId?: string;

  /** Day of week filter: 0 = Sunday … 6 = Saturday */
  @IsInt() @Min(0) @Max(6) @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  dayOfWeek?: number;
}

// ── Cancellation ──────────────────────────────────────────────────────────────

export class CancellationQueryDto extends AnalyticsDateRangeDto {
  @IsUUID() @IsOptional()
  branchId?: string;

  @IsUUID() @IsOptional()
  courtId?: string;

  @IsEnum(GRANULARITIES) @IsOptional()
  granularity?: Granularity;

  /** Group cancellation reasons (default true) */
  @IsOptional()
  @Transform(({ value }: { value: string }) => value !== 'false')
  groupByReason?: boolean;
}

// ── Revenue by sport ─────────────────────────────────────────────────────────

export class RevenueBySportQueryDto extends AnalyticsDateRangeDto {
  @IsUUID() @IsOptional()
  branchId?: string;
}

// ── Revenue by branch ─────────────────────────────────────────────────────────

export class RevenueByBranchQueryDto extends AnalyticsDateRangeDto {
  @IsUUID() @IsOptional()
  sportId?: string;
}

// ── Booking trends ────────────────────────────────────────────────────────────

export class BookingTrendsQueryDto extends AnalyticsDateRangeDto {
  @IsUUID() @IsOptional()
  branchId?: string;

  @IsUUID() @IsOptional()
  sportId?: string;

  @IsEnum(GRANULARITIES) @IsOptional()
  granularity?: Granularity;
}

// ── Customer booking summary ──────────────────────────────────────────────────

export class CustomerSummaryQueryDto extends AnalyticsDateRangeDto {
  @IsUUID() @IsOptional()
  branchId?: string;

  @IsUUID() @IsOptional()
  sportId?: string;

  @IsInt() @Min(1) @Max(200) @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  limit?: number;

  @IsInt() @Min(0) @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  offset?: number;
}

// ── Membership usage ──────────────────────────────────────────────────────────

export class MembershipUsageQueryDto extends AnalyticsDateRangeDto {
  @IsUUID() @IsOptional()
  branchId?: string;
}

// ── Export ────────────────────────────────────────────────────────────────────

export const EXPORT_FORMATS = ['csv', 'xlsx'] as const;
export type  ExportFormat   = typeof EXPORT_FORMATS[number];

export const EXPORT_REPORTS = [
  'occupancy', 'court-utilization', 'peak-hours', 'cancellations',
  'no-shows', 'revenue-by-sport', 'revenue-by-branch', 'booking-trends',
  'customer-summary', 'membership-usage',
] as const;
export type ExportReport = typeof EXPORT_REPORTS[number];

export class ExportQueryDto extends AnalyticsDateRangeDto {
  @IsEnum(EXPORT_FORMATS)
  format!: ExportFormat;

  @IsEnum(EXPORT_REPORTS)
  report!: ExportReport;

  @IsUUID() @IsOptional()
  branchId?: string;

  @IsUUID() @IsOptional()
  sportId?: string;

  @IsUUID() @IsOptional()
  courtId?: string;

  @IsEnum(GRANULARITIES) @IsOptional()
  granularity?: Granularity;
}

// ── No-show ───────────────────────────────────────────────────────────────────

export class NoShowQueryDto extends AnalyticsDateRangeDto {
  @IsUUID() @IsOptional()
  branchId?: string;

  @IsUUID() @IsOptional()
  courtId?: string;

  @IsEnum(GRANULARITIES) @IsOptional()
  granularity?: Granularity;

  /** Threshold no-show rate (%) to flag courts as high-risk (default 20) */
  @IsInt() @Min(1) @Max(100) @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  riskThresholdPct?: number;
}
