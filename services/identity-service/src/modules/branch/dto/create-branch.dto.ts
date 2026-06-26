import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

// ── Day timing sub-DTO ────────────────────────────────────────────────────────

// ── Time range sub-DTO ────────────────────────────────────────────────────────

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;
const HH_MM_MSG = { message: 'Time must be in HH:MM 24-hour format (e.g. "09:00")' };

export class TimeRangeDto {
  @IsString()
  @Matches(HH_MM, HH_MM_MSG)
  start!: string;

  @IsString()
  @Matches(HH_MM, HH_MM_MSG)
  end!: string;
}

// ── Day session sub-DTO ───────────────────────────────────────────────────────

export class DaySessionDto {
  @IsString()
  @Matches(HH_MM, HH_MM_MSG)
  start!: string;

  @IsString()
  @Matches(HH_MM, HH_MM_MSG)
  end!: string;

  /** Optional human-readable label, e.g. "Morning session" */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  /** Non-bookable break periods within this session */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  breaks?: TimeRangeDto[];
}

// ── Maintenance block sub-DTO ─────────────────────────────────────────────────

export class MaintenanceBlockDto {
  @IsString()
  @Matches(HH_MM, HH_MM_MSG)
  start!: string;

  @IsString()
  @Matches(HH_MM, HH_MM_MSG)
  end!: string;

  @IsString()
  @MaxLength(200)
  reason!: string;
}

// ── Day timing sub-DTO ────────────────────────────────────────────────────────

export class DayTimingDto {
  @IsEnum([true, false])
  isClosed!: boolean;

  /**
   * HH:MM 24-hour format — primary/default open time.
   * Required even when isClosed: true (preserves time for when re-opened).
   * When sessions[] is also provided, the booking engine uses sessions instead.
   */
  @IsString()
  @Matches(HH_MM, HH_MM_MSG)
  openTime!: string;

  @IsString()
  @Matches(HH_MM, HH_MM_MSG)
  closeTime!: string;

  /**
   * Optional: multiple bookable sessions per day.
   * When omitted, a single session from openTime to closeTime is implied.
   * Sessions must not overlap (validated at service layer).
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DaySessionDto)
  sessions?: DaySessionDto[];

  /**
   * Optional: recurring weekly maintenance windows on this day.
   * Distinct from one-off court-level maintenance (use court status for that).
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaintenanceBlockDto)
  maintenanceBlocks?: MaintenanceBlockDto[];
}

// ── Weekly timings sub-DTO ────────────────────────────────────────────────────

export class WeeklyTimingsDto {
  @ValidateNested() @Type(() => DayTimingDto) monday!:    DayTimingDto;
  @ValidateNested() @Type(() => DayTimingDto) tuesday!:   DayTimingDto;
  @ValidateNested() @Type(() => DayTimingDto) wednesday!: DayTimingDto;
  @ValidateNested() @Type(() => DayTimingDto) thursday!:  DayTimingDto;
  @ValidateNested() @Type(() => DayTimingDto) friday!:    DayTimingDto;
  @ValidateNested() @Type(() => DayTimingDto) saturday!:  DayTimingDto;
  @ValidateNested() @Type(() => DayTimingDto) sunday!:    DayTimingDto;
}

// ── CreateBranchDto ───────────────────────────────────────────────────────────

const BRANCH_STATUSES = ['active', 'inactive', 'suspended', 'archived'] as const;

export class CreateBranchDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  /**
   * URL-safe slug — lowercase alphanumeric + hyphens.
   * Unique per tenant.
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens only',
  })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  slug!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  // ── Address ────────────────────────────────────────────────────────────────

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  addressLine1!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  addressLine2?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  county?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  postcode!: string;

  @IsString()
  @IsOptional()
  @Length(2, 2, { message: 'countryCode must be a 2-character ISO 3166-1 alpha-2 code (e.g. GB)' })
  @Transform(({ value }: { value: string }) => value?.toUpperCase().trim())
  countryCode?: string;

  // ── Geo ────────────────────────────────────────────────────────────────────

  @IsLatitude({ message: 'latitude must be between -90 and 90' })
  @IsOptional()
  latitude?: number;

  @IsLongitude({ message: 'longitude must be between -180 and 180' })
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  geoLabel?: string;

  // ── Contact ────────────────────────────────────────────────────────────────

  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(254)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email?: string;

  @IsUrl()
  @IsOptional()
  @MaxLength(2048)
  website?: string;

  // ── Manager ────────────────────────────────────────────────────────────────

  @IsUUID()
  @IsOptional()
  managerUserId?: string;

  // ── Status + timings ───────────────────────────────────────────────────────

  @IsEnum(BRANCH_STATUSES)
  @IsOptional()
  status?: typeof BRANCH_STATUSES[number];

  @ValidateNested()
  @Type(() => WeeklyTimingsDto)
  @IsOptional()
  timings?: WeeklyTimingsDto;

  // ── Display ────────────────────────────────────────────────────────────────

  @IsUrl()
  @IsOptional()
  @MaxLength(2048)
  mapUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  facilities?: string[];

  @IsUrl()
  @IsOptional()
  @MaxLength(2048)
  imageUrl?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

// ── UpdateBranchDto ───────────────────────────────────────────────────────────

export class UpdateBranchDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  addressLine1?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  addressLine2?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  county?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  postcode?: string;

  @IsString()
  @IsOptional()
  @Length(2, 2)
  @Transform(({ value }: { value: string }) => value?.toUpperCase().trim())
  countryCode?: string;

  @IsLatitude()
  @IsOptional()
  latitude?: number;

  @IsLongitude()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  geoLabel?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(254)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email?: string;

  @IsUrl()
  @IsOptional()
  @MaxLength(2048)
  website?: string;

  @IsUUID()
  @IsOptional()
  managerUserId?: string | null;

  @IsEnum(BRANCH_STATUSES)
  @IsOptional()
  status?: typeof BRANCH_STATUSES[number];

  @ValidateNested()
  @Type(() => WeeklyTimingsDto)
  @IsOptional()
  timings?: WeeklyTimingsDto;

  @IsUrl()
  @IsOptional()
  @MaxLength(2048)
  mapUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  facilities?: string[];

  @IsUrl()
  @IsOptional()
  @MaxLength(2048)
  imageUrl?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

// ── AssignManagerDto ──────────────────────────────────────────────────────────

export class AssignManagerDto {
  /** Pass null to unassign the current manager */
  @IsUUID()
  @IsOptional()
  managerUserId!: string | null;
}

// ── BranchStatusDto ───────────────────────────────────────────────────────────

export class BranchStatusDto {
  @IsEnum(BRANCH_STATUSES, {
    message: `status must be one of: ${BRANCH_STATUSES.join(', ')}`,
  })
  status!: typeof BRANCH_STATUSES[number];
}
