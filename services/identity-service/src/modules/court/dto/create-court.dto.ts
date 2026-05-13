import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

// ── Shared constants ──────────────────────────────────────────────────────────

export const COURT_STATUSES  = ['available', 'unavailable', 'maintenance', 'retired'] as const;
export const COURT_TYPES     = ['indoor', 'outdoor']                                  as const;
export const SURFACE_TYPES   = [
  'grass', 'artificial_grass', 'hard_court', 'clay', 'carpet',
  'wood', 'rubber', 'sand', 'water', 'ice', 'other',
] as const;

// ── CreateCourtDto ────────────────────────────────────────────────────────────

export class CreateCourtDto {
  /** Branch this court belongs to — must be in the same tenant */
  @IsUUID()
  branchId!: string;

  /**
   * Optional primary sport — null means multi-sport / sport selected at booking.
   * Must belong to the same tenant if provided.
   */
  @IsUUID()
  @IsOptional()
  sportId?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  /** Short display code for calendars — e.g. "C1" */
  @IsString()
  @IsOptional()
  @MaxLength(20)
  code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  // ── Physical ───────────────────────────────────────────────────────────────

  @IsEnum(COURT_TYPES, {
    message: `courtType must be one of: ${COURT_TYPES.join(', ')}`,
  })
  @IsOptional()
  courtType?: typeof COURT_TYPES[number];

  @IsEnum(SURFACE_TYPES, {
    message: `surfaceType must be one of: ${SURFACE_TYPES.join(', ')}`,
  })
  @IsOptional()
  surfaceType?: typeof SURFACE_TYPES[number];

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  maxBookingsConcurrent?: number;

  /** Court dimensions string — e.g. "68m × 105m" */
  @IsString()
  @IsOptional()
  @MaxLength(50)
  dimensions?: string;

  // ── Status ─────────────────────────────────────────────────────────────────

  @IsEnum(COURT_STATUSES)
  @IsOptional()
  status?: typeof COURT_STATUSES[number];

  // ── Operating hours ────────────────────────────────────────────────────────

  /**
   * WeeklyTimings JSONB — court-specific hours.
   * Omit to inherit from parent branch.
   */
  @IsObject()
  @IsOptional()
  operatingHours?: Record<string, unknown>;

  // ── Display ────────────────────────────────────────────────────────────────

  @IsInt()
  @Min(1)
  @IsOptional()
  courtNumber?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsUrl()
  @IsOptional()
  @MaxLength(2048)
  imageUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];

  @IsInt()
  @Min(0)
  @IsOptional()
  hourlyRateMinor?: number;
}

// ── UpdateCourtDto ────────────────────────────────────────────────────────────

export class UpdateCourtDto {
  @IsUUID()
  @IsOptional()
  sportId?: string | null;

  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsEnum(COURT_TYPES)
  @IsOptional()
  courtType?: typeof COURT_TYPES[number];

  @IsEnum(SURFACE_TYPES)
  @IsOptional()
  surfaceType?: typeof SURFACE_TYPES[number];

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  maxBookingsConcurrent?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  dimensions?: string;

  @IsEnum(COURT_STATUSES)
  @IsOptional()
  status?: typeof COURT_STATUSES[number];

  @IsObject()
  @IsOptional()
  operatingHours?: Record<string, unknown> | null;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsUrl()
  @IsOptional()
  @MaxLength(2048)
  imageUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];

  @IsInt()
  @Min(0)
  @IsOptional()
  hourlyRateMinor?: number;
}

// ── CourtStatusDto ────────────────────────────────────────────────────────────

export class CourtStatusDto {
  @IsEnum(COURT_STATUSES, {
    message: `status must be one of: ${COURT_STATUSES.join(', ')}`,
  })
  status!: typeof COURT_STATUSES[number];
}

// ── MaintenanceDto ────────────────────────────────────────────────────────────

/**
 * MaintenanceDto — sets a court into maintenance with a reason and optional
 * expected completion date. Used by PATCH /courts/:id/maintenance.
 */
export class MaintenanceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  maintenanceNote!: string;

  /** ISO-8601 datetime — expected maintenance end */
  @IsDateString()
  @IsOptional()
  maintenanceExpectedEnd?: string;
}

// ── GenerateCourtsDto ─────────────────────────────────────────────────────────

/**
 * GenerateCourtsDto — bulk court generation.
 *
 * Generates `count` courts with auto-incrementing names:
 *   namePrefix + separator + startNumber … startNumber + count - 1
 *
 * Examples:
 *   prefix="Court" separator=" " startNumber=1 count=6
 *   → Court 1, Court 2, Court 3, Court 4, Court 5, Court 6
 *
 *   prefix="Lane" separator="-" startNumber=1 count=8
 *   → Lane-1, Lane-2 … Lane-8
 */
export class GenerateCourtsDto {
  /** Branch to generate courts in */
  @IsUUID()
  branchId!: string;

  /** Optional primary sport for all generated courts */
  @IsUUID()
  @IsOptional()
  sportId?: string;

  /** Name prefix — e.g. "Court", "Lane", "Pitch", "Pool" */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  namePrefix!: string;

  /** Separator between prefix and number — e.g. " ", "-", "_" */
  @IsString()
  @IsOptional()
  @MaxLength(5)
  separator?: string;

  /** Starting number for the sequence */
  @IsInt()
  @Min(1)
  @IsOptional()
  startNumber?: number;

  /** Number of courts to generate */
  @IsInt()
  @Min(1)
  @Max(50)
  count!: number;

  @IsEnum(COURT_TYPES)
  @IsOptional()
  courtType?: typeof COURT_TYPES[number];

  @IsEnum(SURFACE_TYPES)
  @IsOptional()
  surfaceType?: typeof SURFACE_TYPES[number];

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @IsObject()
  @IsOptional()
  operatingHours?: Record<string, unknown>;
}
