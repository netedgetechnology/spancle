import { IsDateString, IsOptional, IsUUID } from 'class-validator';

/**
 * AvailabilityQueryDto — query parameters for GET /api/v1/slots/availability
 * courtId and branchId are required (court-scoped availability lookup).
 */
export class AvailabilityQueryDto {
  @IsUUID()
  courtId!: string;

  @IsUUID()
  branchId!: string;

  @IsUUID()
  @IsOptional()
  sportId?: string;

  /** ISO date string — start of range (default: today) */
  @IsDateString()
  @IsOptional()
  from?: string;

  /** ISO date string — end of range (default: 7 days from today) */
  @IsDateString()
  @IsOptional()
  to?: string;
}
