import {
  IsEnum, IsInt, IsOptional, IsString,
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
  /** New slot IDs — must be available and non-overlapping */
  @IsUUID('4', { each: true })
  newSlotIds!: string[];

  @IsString() @IsOptional() @MaxLength(500)
  reason?: string;
}

export class CheckInDto {
  @IsUUID() @IsOptional()
  checkedInById?: string;
}

import { IsNotEmpty } from 'class-validator';
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

