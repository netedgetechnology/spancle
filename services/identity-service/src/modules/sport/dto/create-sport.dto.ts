import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

// ── CreateSportDto ────────────────────────────────────────────────────────────

const SPORT_STATUSES = ['active', 'inactive'] as const;

export class CreateSportDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  /**
   * URL-safe slug — lowercase alphanumeric + hyphens.
   * Unique per tenant. Auto-generated from name if not supplied.
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens only (e.g. "five-a-side")',
  })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  slug!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  /**
   * Emoji or icon identifier — e.g. "⚽", "🏊", "tennis-ball".
   * Max 100 chars to accommodate icon system identifiers.
   */
  @IsString()
  @IsOptional()
  @MaxLength(100)
  icon?: string;

  /**
   * Hex colour code — must match #RRGGBB format.
   * e.g. "#3b82f6"
   */
  @IsString()
  @IsOptional()
  @Matches(/^#([0-9a-fA-F]{6})$/, {
    message: 'color must be a valid 6-digit hex colour (e.g. "#3b82f6")',
  })
  color?: string;

  /**
   * Arbitrary sport configuration.
   * Common keys: teamSize, sessionDurationMins, ageGroups, equipment.
   * Validated for structure in SportService; stored as-is in JSONB.
   */
  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;

  @IsEnum(SPORT_STATUSES, {
    message: `status must be one of: ${SPORT_STATUSES.join(', ')}`,
  })
  @IsOptional()
  status?: typeof SPORT_STATUSES[number];

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  /**
   * Initial branch IDs to assign this sport to.
   * Optional — branches can be assigned later via PATCH /sports/:id/branches.
   * All IDs must belong to the same tenant.
   */
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each branchId must be a valid UUID' })
  @IsOptional()
  branchIds?: string[];
}

// ── UpdateSportDto ────────────────────────────────────────────────────────────

export class UpdateSportDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  icon?: string;

  @IsString()
  @IsOptional()
  @Matches(/^#([0-9a-fA-F]{6})$/, {
    message: 'color must be a valid 6-digit hex colour (e.g. "#3b82f6")',
  })
  color?: string;

  /**
   * Config is merged with existing — never full-replaced.
   * Pass only the keys you want to update.
   */
  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;

  @IsEnum(SPORT_STATUSES)
  @IsOptional()
  status?: typeof SPORT_STATUSES[number];

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

// ── AssignBranchesDto ─────────────────────────────────────────────────────────

/**
 * AssignBranchesDto — replaces the full set of branch mappings for a sport.
 *
 * Passing an empty array removes all branch mappings (sport becomes
 * globally available, subject to business rules).
 *
 * All branchIds must belong to the same tenant as the sport.
 * Archived branches are rejected.
 */
export class AssignBranchesDto {
  @IsArray({ message: 'branchIds must be an array' })
  @IsUUID('4', { each: true, message: 'Each branchId must be a valid UUID' })
  branchIds!: string[];
}

// ── SportStatusDto ────────────────────────────────────────────────────────────

export class SportStatusDto {
  @IsEnum(SPORT_STATUSES, {
    message: `status must be one of: ${SPORT_STATUSES.join(', ')}`,
  })
  status!: typeof SPORT_STATUSES[number];
}
