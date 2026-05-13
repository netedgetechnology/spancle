import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  IsArray,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

// ── Feature flags sub-DTO ─────────────────────────────────────────────────────

export class PackageFeaturesDto {
  @IsBoolean() @IsOptional() customBranding?:    boolean;
  @IsBoolean() @IsOptional() advancedAnalytics?: boolean;
  @IsBoolean() @IsOptional() apiAccess?:         boolean;
  @IsBoolean() @IsOptional() webhooks?:          boolean;
  @IsBoolean() @IsOptional() multiAcademy?:      boolean;
  @IsBoolean() @IsOptional() prioritySupport?:   boolean;
  @IsBoolean() @IsOptional() auditLogAccess?:    boolean;
  @IsBoolean() @IsOptional() customRoles?:       boolean;
  @IsBoolean() @IsOptional() dataExport?:        boolean;
  @IsBoolean() @IsOptional() ssoIntegration?:    boolean;
}

// ── Resource limits sub-DTO ───────────────────────────────────────────────────
// -1 = unlimited; all other values must be >= 0.

function unlimitedOrPositive(value: unknown): boolean {
  return value === -1 || (typeof value === 'number' && value >= 0);
}

export class PackageLimitsDto {
  @IsInt() @IsOptional() maxUsers?:               number;
  @IsInt() @IsOptional() maxStorageGb?:           number;
  @IsInt() @IsOptional() maxApiCallsPerDay?:      number;
  @IsInt() @IsOptional() maxConcurrentBookings?:  number;
  @IsInt() @IsOptional() maxActiveTournaments?:   number;
  @IsInt() @IsOptional() maxAcademies?:           number;
  @IsInt() @IsOptional() maxPlayersPerAcademy?:   number;
  @IsInt() @IsOptional() maxNotificationsPerDay?: number;
  @IsInt() @IsOptional() maxReportsPerDay?:       number;
}

// ── CreatePackageDto ──────────────────────────────────────────────────────────

const TIER_KEYS = ['free', 'starter', 'growth', 'pro', 'enterprise'] as const;
const STATUSES  = ['draft', 'active', 'deprecated', 'archived']     as const;

export class CreatePackageDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(63)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens',
  })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  slug!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsEnum(TIER_KEYS, { message: `tierKey must be one of: ${TIER_KEYS.join(', ')}` })
  tierKey!: typeof TIER_KEYS[number];

  @IsEnum(STATUSES)
  @IsOptional()
  status?: typeof STATUSES[number];

  // ── Pricing ─────────────────────────────────────────────────────────────

  @IsInt()
  @Min(0)
  @IsOptional()
  priceMonthlyMinorUnits?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  priceAnnualMinorUnits?: number;

  @IsString()
  @IsOptional()
  @MaxLength(3)
  currency?: string;

  @IsInt()
  @Min(0)
  @Max(365)
  @IsOptional()
  trialDays?: number;

  // ── Features & limits ────────────────────────────────────────────────────

  @ValidateNested()
  @Type(() => PackageFeaturesDto)
  @IsOptional()
  features?: PackageFeaturesDto;

  @ValidateNested()
  @Type(() => PackageLimitsDto)
  @IsOptional()
  limits?: PackageLimitsDto;

  // ── Display ──────────────────────────────────────────────────────────────

  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @IsOptional()
  highlightFeatures?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(50)
  badgeText?: string;

  @IsBoolean()
  @IsOptional()
  isHighlighted?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

// ── UpdatePackageDto ──────────────────────────────────────────────────────────

export class UpdatePackageDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsEnum(STATUSES)
  @IsOptional()
  status?: typeof STATUSES[number];

  @IsInt()
  @Min(0)
  @IsOptional()
  priceMonthlyMinorUnits?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  priceAnnualMinorUnits?: number;

  @IsString()
  @IsOptional()
  @MaxLength(3)
  currency?: string;

  @IsInt()
  @Min(0)
  @Max(365)
  @IsOptional()
  trialDays?: number;

  @ValidateNested()
  @Type(() => PackageFeaturesDto)
  @IsOptional()
  features?: PackageFeaturesDto;

  @ValidateNested()
  @Type(() => PackageLimitsDto)
  @IsOptional()
  limits?: PackageLimitsDto;

  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @IsOptional()
  highlightFeatures?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(50)
  badgeText?: string;

  @IsBoolean()
  @IsOptional()
  isHighlighted?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
