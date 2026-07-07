import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty,
  IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateIf,
} from 'class-validator';

export const RULE_TYPES = [
  'base', 'peak', 'weekend', 'holiday', 'member', 'custom',
  'time_of_day', 'day_of_week', 'seasonal', 'promotion',
  'membership', 'coach', 'tournament', 'coupon',
] as const;

export const MOD_TYPES    = ['percentage', 'fixed', 'absolute'] as const;
export const SCOPES       = ['tenant', 'branch', 'venue', 'sport', 'court'] as const;
export const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
] as const;

export class UpdatePricingRuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsEnum(RULE_TYPES)
  @IsOptional()
  ruleType?: typeof RULE_TYPES[number];

  @IsEnum(MOD_TYPES)
  @IsOptional()
  modifierType?: typeof MOD_TYPES[number];

  @IsInt()
  @Min(-1_000_000)
  @Max(100_000_000)
  @IsOptional()
  modifierValue?: number;

  @IsEnum(SCOPES)
  @IsOptional()
  scope?: typeof SCOPES[number];

  @IsUUID()
  @ValidateIf((o: UpdatePricingRuleDto) => o.scope === 'branch')
  @IsOptional()
  branchId?: string | null;

  @IsUUID()
  @ValidateIf((o: UpdatePricingRuleDto) => o.scope === 'venue')
  @IsOptional()
  venueId?: string | null;

  @IsUUID()
  @ValidateIf((o: UpdatePricingRuleDto) => o.scope === 'sport')
  @IsOptional()
  sportId?: string | null;

  @IsUUID()
  @ValidateIf((o: UpdatePricingRuleDto) => o.scope === 'court')
  @IsOptional()
  courtId?: string | null;

  @IsDateString()
  @IsOptional()
  validFrom?: string | null;

  @IsDateString()
  @IsOptional()
  validUntil?: string | null;

  @IsArray()
  @IsEnum(DAYS_OF_WEEK, { each: true })
  @IsOptional()
  daysOfWeek?: (typeof DAYS_OF_WEEK[number])[] | null;

  @IsString()
  @IsOptional()
  timeStart?: string | null;

  @IsString()
  @IsOptional()
  timeEnd?: string | null;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  // ── Coupon fields ──────────────────────────────────────────────────────────

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @IsOptional()
  couponCode?: string | null;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxRedemptions?: number | null;
}
