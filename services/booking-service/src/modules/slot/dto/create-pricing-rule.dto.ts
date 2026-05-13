import {
  IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional,
  IsString, IsUUID, Max, MaxLength, Min,
} from 'class-validator';

const RULE_TYPES    = ['base', 'peak', 'weekend', 'holiday', 'member', 'custom'] as const;
const MOD_TYPES     = ['percentage', 'fixed', 'absolute']                         as const;
const SCOPES        = ['tenant', 'branch', 'sport', 'court']                      as const;
const DAYS_OF_WEEK  = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;

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
  ruleType!: typeof RULE_TYPES[number];

  @IsEnum(MOD_TYPES)
  @IsOptional()
  modifierType?: typeof MOD_TYPES[number];

  /** For percentage: 25 = +25%. For fixed/absolute: minor currency units */
  @IsInt()
  modifierValue!: number;

  @IsEnum(SCOPES)
  @IsOptional()
  scope?: typeof SCOPES[number];

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsUUID()
  @IsOptional()
  sportId?: string;

  @IsUUID()
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

  /** HH:MM — start of time window (null = all day) */
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
}
