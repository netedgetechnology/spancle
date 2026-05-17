import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
  IsBoolean,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// ── Tenant settings ──────────────────────────────────────────────────────────

class TenantSettingsDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  ownerName?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  locale?: string;

  @IsString()
  @IsOptional()
  @MaxLength(3)
  currency?: string;

  @IsString()
  @IsOptional()
  dateFormat?: string;

  @IsBoolean()
  @IsOptional()
  allowPublicBookings?: boolean;

  @IsBoolean()
  @IsOptional()
  requireMfa?: boolean;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  maxSessionDurationMs?: number;
}

// ── CreateTenantDto ──────────────────────────────────────────────────────────

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  /**
   * URL-safe slug: lowercase alphanumeric + hyphens only.
   * 2–63 chars (max subdomain label length per RFC 1123).
   * Immutable after creation.
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(63)
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, {
    message: 'Slug must be lowercase alphanumeric and hyphens only, cannot start or end with a hyphen',
  })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  slug!: string;

  @IsEmail({}, { message: 'A valid email address is required' })
  @MaxLength(254)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email!: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @IsEnum(['free', 'starter', 'growth', 'pro', 'enterprise', 'trial'], {
    message: 'Tier must be one of: free, starter, growth, pro, enterprise, trial',
  })
  @IsOptional()
  tier?: 'free' | 'starter' | 'growth' | 'pro' | 'enterprise';

  @ValidateNested()
  @Type(() => TenantSettingsDto)
  @IsOptional()
  settings?: TenantSettingsDto;
}

// ── UpdateTenantDto ──────────────────────────────────────────────────────────

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(254)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @IsUrl()
  @IsOptional()
  @MaxLength(2048)
  logoUrl?: string;
}

// ── UpdateTenantSettingsDto ──────────────────────────────────────────────────

export class UpdateTenantSettingsDto {
  @ValidateNested()
  @Type(() => TenantSettingsDto)
  settings!: TenantSettingsDto;
}

// ── TenantStatusTransitionDto ────────────────────────────────────────────────

export class TenantStatusTransitionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

// ── ChangeTierDto ────────────────────────────────────────────────────────────

export class ChangeTierDto {
  @IsEnum(['free', 'starter', 'growth', 'pro', 'enterprise'], {
    message: 'Tier must be one of: free, starter, growth, pro, enterprise',
  })
  tier!: 'free' | 'starter' | 'growth' | 'pro' | 'enterprise';
}
