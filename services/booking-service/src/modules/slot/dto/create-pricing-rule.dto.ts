import {
  IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional,
  IsString, IsUUID, Max, MaxLength, Min, ValidateIf,
} from 'class-validator';

const RULE_TYPES = [
  'base', 'peak', 'weekend', 'holiday', 'member', 'custom',
  'time_of_day', 'day_of_week', 'seasonal', 'promotion',
  'membership', 'coach', 'tournament', 'coupon',
] as const;

const MOD_TYPES    = ['percentage', 'fixed', 'absolute'] as const;
const SCOPES       = ['tenant', 'branch', 'venue', 'sport', 'court'] as const;
const DAYS_OF_WEEK = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;

type RuleType = typeof RULE_TYPES[number];

export class CreatePricingRuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsEnum(RULE_TYPES)
  ruleType!: RuleType;

  @IsEnum(MOD_TYPES)
  @IsOptional()
  modifierType?: typeof MOD_TYPES[number];

  /** For percentage: 25 = +25%, -10 = -10%. For fixed/absolute: minor currency units */
  @IsInt()
  @Min(-1_000_000)
  @Max(100_000_000)
  modifierValue!: number;

  @IsEnum(SCOPES)
  @IsOptional()
  scope?: typeof SCOPES[number];

  @IsUUID()
  @ValidateIf((o: CreatePricingRuleDto) => o.scope === 'branch')
  @IsOptional()
  branchId?: string;

  @IsUUID()
  @ValidateIf((o: CreatePricingRuleDto) => o.scope === 'venue')
  @IsOptional()
  venueId?: string;

  @IsUUID()
  @ValidateIf((o: CreatePricingRuleDto) => o.scope === 'sport')
  @IsOptional()
  sportId?: string;

  @IsUUID()
  @ValidateIf((o: CreatePricingRuleDto) => o.scope === 'court')
  @IsOptional()
  courtId?: string;

  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @IsArray()
  @IsEnum(DAYS_OF_WEEK, { each: true })
  @IsOptional()
  daysOfWeek?: (typeof DAYS_OF_WEEK[number])[];

  /** HH:MM 24-hour — start of time window (null = all day) */
  @IsString()
  @IsOptional()
  timeStart?: string;

  @IsString()
  @IsOptional()
  timeEnd?: string;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  priority?: number;

  // ── Coupon fields (required when ruleType = 'coupon') ─────────────────────

  /**
   * Coupon code — required when ruleType = 'coupon'.
   * Stored normalised (UPPER-CASED). Case-insensitive on redemption.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @ValidateIf((o: CreatePricingRuleDto) => o.ruleType === 'coupon')
  @IsOptional()
  couponCode?: string;

  /**
   * Maximum number of total redemptions across all bookings.
   * Null = unlimited. Only meaningful when ruleType = 'coupon'.
   */
  @IsInt()
  @Min(1)
  @ValidateIf((o: CreatePricingRuleDto) => o.ruleType === 'coupon')
  @IsOptional()
  maxRedemptions?: number;
}
