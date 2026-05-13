import {
  IsDateString, IsEnum, IsInt, IsOptional, IsString,
  IsUUID, Max, MaxLength, Min,
} from 'class-validator';

const SLOT_STATUSES = ['available', 'unavailable'] as const;

export class CreateSlotDto {
  @IsUUID()
  courtId!: string;

  @IsUUID()
  branchId!: string;

  @IsUUID()
  @IsOptional()
  sportId?: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsInt()
  @Min(15)
  @Max(480)
  durationMins!: number;

  @IsEnum(SLOT_STATUSES)
  @IsOptional()
  status?: typeof SLOT_STATUSES[number];

  @IsInt()
  @Min(0)
  @IsOptional()
  priceOverrideMinor?: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  label?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxBookings?: number;
}
