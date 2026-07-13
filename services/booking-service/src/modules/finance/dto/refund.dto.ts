import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class PrepareRefundDto {
  @IsUUID()
  paymentId!: string;

  @IsUUID()
  invoiceId!: string;

  /** Amount to refund in minor currency units. Must be > 0. */
  @IsInt() @Min(1)
  amountMinor!: number;

  @IsString() @IsNotEmpty() @MaxLength(3)
  currency!: string;

  /**
   * Caller-supplied idempotency key (M7).
   * Unique per tenant. Duplicate key returns the existing refund.
   */
  @IsString() @IsNotEmpty() @MaxLength(64)
  idempotencyKey!: string;

  /** Source type for cross-engine traceability. */
  @IsString() @IsOptional() @MaxLength(20)
  sourceType?: string;

  @IsUUID() @IsOptional()
  sourceId?: string;
}

export class CompleteRefundDto {
  /** Gateway-assigned refund ID if available. */
  @IsString() @IsOptional() @MaxLength(100)
  gatewayRefundId?: string;

  @IsString() @IsOptional()
  gatewayMetadata?: Record<string, unknown>;
}

export class RejectRefundDto {
  @IsString() @IsNotEmpty() @MaxLength(500)
  reason!: string;
}
