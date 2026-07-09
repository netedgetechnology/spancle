import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { BillingCycle } from '../entities/membership-plan.entity';

const BILLING_CYCLES: BillingCycle[] = ['monthly', 'quarterly', 'annual', 'lifetime'];

const MEMBERSHIP_TYPES = [
  'individual', 'family', 'corporate', 'academy', 'vip', 'lifetime', 'trial',
] as const;

export class CreateBenefitDto {
  @IsString() @IsNotEmpty() @MaxLength(80)
  benefitType!: string;

  @IsInt() @Min(1) @IsOptional()
  unitsPerPeriod?: number;

  @IsString() @IsOptional() @MaxLength(20)
  periodType?: string;

  @IsInt() @Min(1) @Max(31) @IsOptional()
  resetDay?: number;

  @IsBoolean() @IsOptional()
  rolloverAllowed?: boolean;

  @IsInt() @Min(0) @IsOptional()
  maxRolloverUnits?: number;

  @IsBoolean() @IsOptional()
  transferable?: boolean;

  @IsBoolean() @IsOptional()
  expiresWithMembership?: boolean;

  @IsInt() @Min(0) @IsOptional()
  sortOrder?: number;
}

export class CreateMembershipPlanDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  name!: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  slug!: string;

  @IsString() @IsOptional() @MaxLength(2000)
  description?: string;

  @IsString() @IsNotEmpty()
  membershipType!: typeof MEMBERSHIP_TYPES[number] | string;

  @IsString() @IsOptional() @MaxLength(3)
  currency?: string;

  @IsString() @IsOptional()
  billingCycle?: BillingCycle;

  @IsInt() @Min(0) @IsOptional()
  priceMinor?: number;

  @IsInt() @Min(0) @IsOptional()
  setupFeeMinor?: number;

  @IsInt() @Min(0) @IsOptional()
  trialDays?: number;

  @IsBoolean() @IsOptional()
  autoRenew?: boolean;

  @IsInt() @Min(0) @Max(90) @IsOptional()
  gracePeriodDays?: number;

  @IsInt() @Min(1) @IsOptional()
  maxMembers?: number;

  @IsInt() @Min(1) @IsOptional()
  maxFamilyDependants?: number;

  @IsInt() @Min(1) @IsOptional()
  maxCorporateSeats?: number;

  @IsBoolean() @IsOptional()
  refundOnCancellation?: boolean;

  @IsBoolean() @IsOptional()
  isPublic?: boolean;

  @IsInt() @Min(0) @IsOptional()
  sortOrder?: number;

  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateBenefitDto) @IsOptional()
  benefits?: CreateBenefitDto[];
}
