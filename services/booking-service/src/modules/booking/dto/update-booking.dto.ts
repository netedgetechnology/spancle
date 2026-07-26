import {
  ArrayMaxSize, ArrayMinSize,
  IsEnum, IsInt, IsNotEmpty, IsOptional, IsString,
  IsUUID, Max, MaxLength, Min,
} from 'class-validator';

const UPDATABLE_STATUSES = [
  'confirmed', 'completed', 'cancelled', 'no_show', 'refunded',
] as const;

export class UpdateBookingDto {
  @IsEnum(UPDATABLE_STATUSES) @IsOptional()
  status?: typeof UPDATABLE_STATUSES[number];

  @IsString() @IsOptional() @MaxLength(2000)
  customerNotes?: string;

  @IsString() @IsOptional() @MaxLength(2000)
  internalNotes?: string;

  @IsInt() @Min(1) @Max(100) @IsOptional()
  participantCount?: number;

  @IsUUID() @IsOptional()
  updatedById?: string;
}

export class CancelBookingDto {
  @IsString() @IsNotEmpty() @MaxLength(500)
  reason!: string;

  @IsUUID() @IsOptional()
  cancelledById?: string;
}

export class RescheduleBookingDto {
  /** New slot IDs — must be available and non-overlapping. Min 1, max 8 slots. */
  @IsUUID('4', { each: true })
  @ArrayMinSize(1, { message: 'At least one new slot ID is required' })
  @ArrayMaxSize(8, { message: 'Cannot reschedule to more than 8 slots at once' })
  newSlotIds!: string[];

  @IsString() @IsOptional() @MaxLength(500)
  reason?: string;
}

export class CheckInDto {
  @IsUUID() @IsOptional()
  checkedInById?: string;
}

export class MarkNoShowDto {
  @IsString() @IsOptional() @MaxLength(500)
  notes?: string;

  @IsUUID() @IsOptional()
  actorId?: string;
}

export class WaiveNoShowDto {
  @IsString() @IsNotEmpty() @MaxLength(500)
  reason!: string;

  @IsUUID() @IsOptional()
  actorId?: string;
}

export class PaymentFailedDto {
  @IsString() @IsOptional() @MaxLength(500)
  reason?: string;

  @IsString() @IsOptional() @MaxLength(255)
  providerErrorCode?: string;

  @IsString() @IsOptional() @MaxLength(255)
  providerErrorMessage?: string;
}


// ── Booking Refund ─────────────────────────────────────────────────────────

const REFUND_REASONS = [
  'customer_cancellation', 'admin_cancellation', 'no_show_waiver',
  'reschedule', 'system_error', 'other',
] as const;

export class ProcessBookingRefundDto {
  /** Amount to refund in minor currency units. Must be > 0. */
  @IsInt() @Min(1)
  amountMinor!: number;

  @IsEnum(REFUND_REASONS)
  reason!: typeof REFUND_REASONS[number];

  @IsString() @IsOptional() @MaxLength(1000)
  reasonNotes?: string;

  /**
   * Caller-supplied idempotency key. Duplicate requests with the same key
   * return the existing BookingRefundEntity without creating a new row.
   * Recommended format: <client-uuid-v4>.
   */
  @IsString() @IsNotEmpty() @MaxLength(255)
  idempotencyKey!: string;
}
