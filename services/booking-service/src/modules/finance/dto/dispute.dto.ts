import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class OpenDisputeDto {
  @IsUUID()
  paymentId!: string;

  @IsString() @IsNotEmpty() @MaxLength(30)
  gateway!: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  gatewayDisputeId!: string;

  @IsString() @IsNotEmpty() @MaxLength(60)
  reason!: string;

  /** Disputed amount in minor currency units. Must be > 0. */
  @IsInt() @Min(1)
  disputedAmountMinor!: number;

  /** Gateway chargeback fee, if known. 0 if not applicable. */
  @IsInt() @Min(0)
  feeAmountMinor!: number;

  @IsString() @IsNotEmpty() @MaxLength(3)
  currency!: string;

  @IsDateString()
  openedAt!: string;

  @IsDateString() @IsOptional()
  evidenceDueAt?: string;

  @IsString() @IsOptional()
  metadata?: Record<string, unknown>;
}

export class ResolveDisputeDto {
  @IsDateString() @IsOptional()
  resolvedAt?: string;

  /** Optional note or gateway resolution message. */
  @IsString() @IsOptional() @MaxLength(500)
  note?: string;
}

export class CancelDisputeDto {
  @IsString() @IsOptional() @MaxLength(500)
  reason?: string;
}
