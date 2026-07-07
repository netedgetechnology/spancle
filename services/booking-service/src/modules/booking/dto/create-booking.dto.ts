import {
  IsArray, IsBoolean, IsDateString, IsEmail, IsEnum,
  IsInt, IsNotEmpty, IsObject, IsOptional, IsString,
  IsUUID, Max, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

const CHANNELS = ['online', 'admin', 'walk_in', 'api'] as const;
const RECURRENCE_FREQS = ['daily', 'weekly', 'biweekly', 'monthly'] as const;

export class BookingCustomerDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  name!: string;

  @IsEmail() @MaxLength(254)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email!: string;

  @IsString() @IsOptional() @MaxLength(30)
  phone?: string;

  @IsBoolean() @IsOptional()
  isMember?: boolean;

  @IsUUID() @IsOptional()
  userId?: string;
}

export class RecurrenceDto {
  @IsEnum(RECURRENCE_FREQS, { message: `frequency must be one of: ${RECURRENCE_FREQS.join(', ')}` })
  frequency!: typeof RECURRENCE_FREQS[number];

  @IsInt() @Min(1) @Max(52)
  occurrences!: number;

  /** ISO date string — stop generating after this date (alternative to occurrences) */
  @IsDateString() @IsOptional()
  until?: string;
}

export class CreateBookingDto {
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each slotId must be a valid UUID' })
  @MinLength(1, { each: false, message: 'At least one slotId required' })
  slotIds!: string[];

  @IsUUID()
  branchId!: string;

  @IsUUID()
  courtId!: string;

  @IsUUID() @IsOptional()
  sportId?: string;

  @ValidateNested()
  @Type(() => BookingCustomerDto)
  customer!: BookingCustomerDto;

  @IsEnum(CHANNELS) @IsOptional()
  channel?: typeof CHANNELS[number];

  @IsInt() @Min(1) @Max(100) @IsOptional()
  participantCount?: number;

  @IsString() @IsOptional() @MaxLength(2000)
  customerNotes?: string;

  @IsString() @IsOptional() @MaxLength(2000)
  internalNotes?: string;

  @IsObject() @IsOptional()
  metadata?: Record<string, unknown>;

  /**
   * Optional coupon code to apply to this booking.
   * Validated and redeemed atomically during booking creation.
   */
  @IsString() @IsOptional() @MaxLength(50)
  couponCode?: string;

  /** When present, generates a recurring series from these slots */
  @ValidateNested() @Type(() => RecurrenceDto) @IsOptional()
  recurrence?: RecurrenceDto;
}
