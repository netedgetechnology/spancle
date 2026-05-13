import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

// ── Shared constants ──────────────────────────────────────────────────────────

export const RULE_TYPES   = ['base', 'peak', 'weekend', 'holiday', 'member', 'custom'] as const;
export const MOD_TYPES    = ['percentage', 'fixed', 'absolute']                         as const;
export const SCOPES       = ['tenant', 'branch', 'sport', 'court']                      as const;
export const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
] as const;

// ── UpdatePricingRuleDto ──────────────────────────────────────────────────────

/**
 * All fields are optional — partial updates allowed.
 * When modifierType or modifierValue changes, validation re-runs
 * against ruleType semantics in PricingRuleValidationService.
 */
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

  /** For percentage: -100 to 10000. For fixed/absolute: 0 to 2_147_483_647 (int max) */
  @IsInt()
  @Min(-10_000)
  @Max(2_147_483_647)
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

  /** Empty array = applies all days. Null = applies all days. */
  @IsArray()
  @IsEnum(DAYS_OF_WEEK, { each: true })
  @IsOptional()
  daysOfWeek?: (typeof DAYS_OF_WEEK[number])[] | null;

  /** HH:MM 24-hour format */
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
}
