import {
  IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional,
  IsString, IsUUID, Max, MaxLength, Min,
} from 'class-validator';

const METHODS = ['cash', 'upi', 'card_debit', 'card_credit', 'bank_transfer', 'cheque', 'voucher'] as const;
const PROVIDERS = ['razorpay', 'paytm', 'cashfree', 'stripe', 'manual', 'internal'] as const;

export class CreatePaymentDto {
  @IsUUID()
  invoiceId!: string;

  @IsUUID()
  branchId!: string;

  @IsUUID() @IsOptional()
  bookingId?: string;

  @IsUUID() @IsOptional()
  userId?: string;

  /** Amount for this payment leg in minor currency units (paise) */
  @IsInt() @Min(1)
  amountMinor!: number;

  @IsString() @IsOptional() @MaxLength(3)
  currency?: string;

  @IsEnum(METHODS, { message: `method must be one of: ${METHODS.join(', ')}` })
  method!: typeof METHODS[number];

  /**
   * Client idempotency key — prevents duplicate payment creation on retries.
   * Generate as UUID or hash of (invoiceId + method + amount + timestamp).
   */
  @IsString() @IsNotEmpty() @MaxLength(255)
  idempotencyKey!: string;

  @IsEnum(PROVIDERS) @IsOptional()
  provider?: typeof PROVIDERS[number];

  /** Provider payment ID (set after gateway response) */
  @IsString() @IsOptional() @MaxLength(255)
  providerPaymentId?: string;

  @IsString() @IsOptional() @MaxLength(255)
  providerOrderId?: string;

  @IsString() @IsOptional() @MaxLength(500)
  providerSignature?: string;

  /**
   * Method-specific metadata.
   * UPI:  { upiId, vpa, txnRef }
   * Card: { lastFour, network, cardType, authCode }
   * Cash: { receivedByUserId, denomination }
   * Never include card numbers or CVV.
   */
  @IsObject() @IsOptional()
  providerMeta?: Record<string, unknown>;

  @IsString() @IsOptional() @MaxLength(1000)
  notes?: string;
}

// ── Capture / settle ──────────────────────────────────────────────────────────

export class CapturePaymentDto {
  @IsString() @IsOptional() @MaxLength(255)
  providerPaymentId?: string;

  @IsString() @IsOptional() @MaxLength(50)
  settlementRef?: string;

  @IsObject() @IsOptional()
  providerMeta?: Record<string, unknown>;
}

export class SettlePaymentDto {
  @IsString() @IsOptional() @MaxLength(50)
  settlementRef?: string;

  @IsString() @IsOptional() @MaxLength(100)
  settlementBatchId?: string;

  @IsObject() @IsOptional()
  providerMeta?: Record<string, unknown>;
}

export class FailPaymentDto {
  @IsString() @MaxLength(500)
  failureReason!: string;
}

// ── Refund ────────────────────────────────────────────────────────────────────

const REFUND_REASONS = [
  'customer_request', 'booking_cancelled', 'booking_rescheduled',
  'duplicate_payment', 'overcharge', 'service_not_rendered',
  'goodwill', 'system_error', 'other',
] as const;

export class CreateRefundDto {
  @IsUUID()
  paymentId!: string;

  @IsInt() @Min(1)
  amountMinor!: number;

  @IsEnum(REFUND_REASONS)
  reason!: typeof REFUND_REASONS[number];

  @IsString() @IsOptional() @MaxLength(1000)
  reasonNotes?: string;

  @IsString() @IsOptional() @MaxLength(255)
  providerRefundId?: string;
}

// ── Reconciliation ────────────────────────────────────────────────────────────

export class ReconcilePaymentDto {
  /** Bank statement reference (UTR / RRN / ARN) */
  @IsString() @IsNotEmpty() @MaxLength(100)
  bankReference!: string;

  /** Amount that appeared in the bank statement (minor units) */
  @IsInt() @Min(0)
  bankAmountMinor!: number;

  @IsString() @IsOptional() @MaxLength(10)
  bankSettlementDate?: string;  // YYYY-MM-DD

  @IsString() @IsOptional() @MaxLength(1000)
  note?: string;
}

// ── Query ─────────────────────────────────────────────────────────────────────

import { IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

const PAYMENT_STATUSES = [
  'initiated', 'pending', 'captured', 'settled', 'failed', 'cancelled', 'refunded', 'partial_refund',
] as const;

const RECON_STATUSES = ['pending', 'matched', 'mismatch', 'manual_review', 'not_applicable'] as const;

export class PaymentQueryDto {
  @IsUUID() @IsOptional()  invoiceId?:           string;
  @IsUUID() @IsOptional()  bookingId?:            string;
  @IsUUID() @IsOptional()  branchId?:             string;
  @IsUUID() @IsOptional()  userId?:               string;

  @IsEnum(METHODS)         @IsOptional()  method?: typeof METHODS[number];
  @IsEnum(PAYMENT_STATUSES) @IsOptional() status?: typeof PAYMENT_STATUSES[number];
  @IsEnum(RECON_STATUSES)  @IsOptional()  reconciliationStatus?: typeof RECON_STATUSES[number];

  @IsDateString() @IsOptional()  from?: string;
  @IsDateString() @IsOptional()  to?:   string;

  @IsInt() @Min(1) @Max(200) @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  limit?: number;

  @IsInt() @Min(0) @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  offset?: number;
}
