import {
  IsDateString, IsEnum, IsOptional, IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';

const SLOT_STATUSES = ['available', 'reserved', 'booked', 'cancelled', 'completed'] as const;

export class QuerySlotsDto {
  @IsUUID()
  @IsOptional()
  courtId?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsUUID()
  @IsOptional()
  sportId?: string;

  /** ISO date string — filter slots starting on or after this date */
  @IsDateString()
  @IsOptional()
  from?: string;

  /** ISO date string — filter slots starting before this date */
  @IsDateString()
  @IsOptional()
  to?: string;

  @IsEnum(SLOT_STATUSES)
  @IsOptional()
  status?: typeof SLOT_STATUSES[number];
}
