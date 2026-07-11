import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

const PAYMENT_METHODS = [
  'online_card', 'card_present', 'cash', 'upi',
  'wallet', 'bank_transfer', 'voucher',
] as const;

const GATEWAYS = ['stripe', 'razorpay', 'cash', 'manual'] as const;

export class InitiatePaymentDto {
  @IsEnum(PAYMENT_METHODS)
  method!: typeof PAYMENT_METHODS[number];

  @IsEnum(GATEWAYS)
  gateway!: typeof GATEWAYS[number];

  /** Amount caller intends to pay. Minor currency units. */
  @IsInt() @Min(1)
  amountMinor!: number;

  @IsString() @IsNotEmpty() @MaxLength(3)
  currency!: string;

  @IsUUID() @IsOptional()
  customerId?: string;

  /**
   * Caller-supplied idempotency key (M7).
   * Duplicate requests with the same key return the existing payment.
   */
  @IsString() @IsNotEmpty() @MaxLength(64)
  idempotencyKey!: string;

  @IsString() @IsOptional() @MaxLength(45)
  ipAddress?: string;

  @IsString() @IsOptional() @MaxLength(100)
  deviceId?: string;

  /** Invoice(s) this payment is intended to settle. */
  @IsUUID(undefined, { each: true }) @IsOptional()
  invoiceIds?: string[];
}

export class CapturePaymentDto {
  /** Amount to capture. Defaults to full authorized amount if omitted. */
  @IsInt() @Min(1) @IsOptional()
  amountMinor?: number;
}

export class AllocatePaymentDto {
  @IsUUID()
  invoiceId!: string;

  /** Amount to allocate from this payment to the invoice. Minor units. */
  @IsInt() @Min(1)
  allocatedMinor!: number;
}

export class FailPaymentDto {
  @IsString() @IsOptional() @MaxLength(500)
  reason?: string;
}
