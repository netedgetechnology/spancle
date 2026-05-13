import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

const BOOKING_STATUSES = [
  'pending_payment', 'confirmed', 'completed', 'cancelled', 'no_show', 'refunded',
] as const;

export class BookingQueryDto {
  @IsUUID()         @IsOptional() branchId?:  string;
  @IsUUID()         @IsOptional() courtId?:   string;
  @IsUUID()         @IsOptional() sportId?:   string;
  @IsUUID()         @IsOptional() userId?:    string;
  @IsString()       @IsOptional() reference?: string;

  @IsEnum(BOOKING_STATUSES) @IsOptional()
  status?: typeof BOOKING_STATUSES[number];

  @IsDateString() @IsOptional() from?: string;
  @IsDateString() @IsOptional() to?:   string;

  @IsInt() @Min(1)   @Max(200) @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  limit?: number;

  @IsInt() @Min(0) @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  offset?: number;
}
