import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ConsumeEntitlementDto {
  @IsString() @IsNotEmpty() @MaxLength(80)
  benefitType!: string;

  @IsInt() @Min(1) @Max(1000)
  quantity!: number;

  /**
   * Context that triggered this consumption.
   * Values: booking | academy | tournament | pos | manual
   */
  @IsString() @IsOptional() @MaxLength(30)
  referenceType?: string;

  @IsUUID() @IsOptional()
  referenceId?: string;

  @IsString() @IsOptional() @MaxLength(500)
  note?: string;

  /** metadata: e.g. { guestName: 'Jane Smith' } for guest passes */
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class RefundEntitlementDto {
  @IsString() @IsNotEmpty() @MaxLength(80)
  benefitType!: string;

  @IsInt() @Min(1) @Max(1000)
  quantity!: number;

  /** The original transaction ID being refunded. */
  @IsUUID()
  originalTransactionId!: string;

  @IsString() @IsOptional() @MaxLength(500)
  note?: string;
}

export class AdjustEntitlementDto {
  @IsString() @IsNotEmpty() @MaxLength(80)
  benefitType!: string;

  /**
   * Signed delta — positive to credit, negative to debit.
   * Admin adjustments bypass the insufficient-balance guard.
   */
  @IsInt() @Min(-10_000) @Max(10_000)
  delta!: number;

  @IsString() @IsNotEmpty() @MaxLength(500)
  note!: string;
}

export class ReserveEntitlementDto {
  @IsString() @IsNotEmpty() @MaxLength(80)
  benefitType!: string;

  @IsInt() @Min(1) @Max(1000)
  quantity!: number;

  @IsString() @IsOptional() @MaxLength(30)
  referenceType?: string;

  @IsUUID() @IsOptional()
  referenceId?: string;
}

export class ReleaseReservedEntitlementDto {
  @IsString() @IsNotEmpty() @MaxLength(80)
  benefitType!: string;

  @IsInt() @Min(1) @Max(1000)
  quantity!: number;

  @IsString() @IsOptional() @MaxLength(30)
  referenceType?: string;

  @IsUUID() @IsOptional()
  referenceId?: string;

  @IsString() @IsOptional() @MaxLength(500)
  note?: string;
}

export class InitialiseEntitlementDto {
  @IsString() @IsNotEmpty() @MaxLength(80)
  benefitType!: string;

  @IsInt() @Min(0)
  units!: number;

  @IsString() @IsOptional() @MaxLength(20)
  periodType?: string;

  @IsInt() @Min(0) @IsOptional()
  rolloverAllowed?: number;

  @IsInt() @Min(0) @IsOptional()
  maxRolloverUnits?: number;
}
