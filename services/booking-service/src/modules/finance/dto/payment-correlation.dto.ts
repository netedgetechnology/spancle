import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

const CORRELATION_SOURCES = ['webhook', 'api', 'manual', 'migration'] as const;

export class CreatePaymentCorrelationDto {
  /** Booking domain payment ID (booking_payments.id). */
  @IsUUID()
  bookingPaymentId!: string;

  /** Finance domain payment ID (finance_payments.id). */
  @IsUUID()
  financePaymentId!: string;

  /**
   * How this correlation was established.
   * webhook   — by an automated payment webhook with authoritative knowledge of both IDs.
   * api       — via explicit operator API call.
   * manual    — by a support operator outside the normal flow.
   * migration — during a one-time data migration with provable identity.
   */
  @IsEnum(CORRELATION_SOURCES)
  correlationSource!: typeof CORRELATION_SOURCES[number];

  /**
   * Optional opaque external reference for audit tracing
   * (e.g. Stripe webhook event ID evt_*, Razorpay payment.captured webhook ID).
   */
  @IsString() @IsOptional() @MaxLength(255)
  externalReference?: string;

  /** Optional metadata snapshot for audit purposes. */
  @IsObject() @IsOptional()
  metadata?: Record<string, unknown>;
}
