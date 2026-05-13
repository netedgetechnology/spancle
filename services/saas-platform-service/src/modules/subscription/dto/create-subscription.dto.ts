import {{
  IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min,
}} from 'class-validator';

const BILLING_CYCLES = ['monthly', 'annual', 'one_time', 'custom'] as const;

export class CreateSubscriptionDto {{
  @IsUUID()
  packageId!: string;

  @IsEnum(BILLING_CYCLES)
  @IsOptional()
  billingCycle?: typeof BILLING_CYCLES[number];
}}

export class CancelSubscriptionDto {{
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}}

export class ActivateSubscriptionDto {{
  @IsString()
  @IsOptional()
  @MaxLength(255)
  externalSubId?: string;
}}
