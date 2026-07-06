import {
  IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

const SLOT_STATUSES = ['available', 'reserved', 'booked', 'cancelled', 'completed'] as const;

export class QuerySlotsDto {
  @IsUUID()
  @IsOptional()
  courtId?: string;

  @IsUUID()
  @IsOptional()
  venueId?: string;

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

  /** ISO date string — filter slots ending on or before this date */
  @IsDateString()
  @IsOptional()
  to?: string;

  @IsEnum(SLOT_STATUSES)
  @IsOptional()
  status?: typeof SLOT_STATUSES[number];

  /** Maximum results to return — future pagination support */
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  /** Offset for pagination */
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  offset?: number;
}
