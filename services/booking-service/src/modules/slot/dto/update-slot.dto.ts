import {
  IsDateString, IsEnum, IsInt, IsOptional, IsString,
  Max, MaxLength, Min,
} from 'class-validator';

const UPDATABLE_STATUSES = ['available', 'unavailable', 'cancelled'] as const;

export class UpdateSlotDto {
  @IsEnum(UPDATABLE_STATUSES)
  @IsOptional()
  status?: typeof UPDATABLE_STATUSES[number];

  @IsInt()
  @Min(0)
  @IsOptional()
  priceOverrideMinor?: number | null;

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
