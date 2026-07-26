import {
  IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID,
  Max, Min, registerDecorator, ValidationOptions,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/** Every status a booking row can have — used for query filtering. */
const BOOKING_STATUSES = [
  'reserved',
  'pending_payment',
  'confirmed',
  'checked_in',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
  'refunded',
  'rescheduled',
  'expired',
] as const;

/**
 * Cross-field validator: when both from and to are supplied, from must be ≤ to,
 * and the range must not exceed 366 days (prevents full-history data dumps).
 */
function IsValidDateRange(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name:    'isValidDateRange',
      target:  object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(_: unknown, args) {
          const obj = args?.object as Record<string, string | undefined>;
          const from = obj['from'];
          const to   = obj['to'];
          if (!from || !to) return true;         // single-bound or no bound is fine
          const f = new Date(from).getTime();
          const t = new Date(to).getTime();
          if (f > t) return false;               // from after to
          const span = (t - f) / 86_400_000;
          return span <= 366;                    // max 366-day window
        },
        defaultMessage() {
          return '`from` must be ≤ `to` and the range must not exceed 366 days';
        },
      },
    });
  };
}

export class BookingQueryDto {
  @IsUUID()         @IsOptional() branchId?:  string;
  @IsUUID()         @IsOptional() courtId?:   string;
  @IsUUID()         @IsOptional() sportId?:   string;
  @IsUUID()         @IsOptional() userId?:    string;
  @IsString()       @IsOptional() reference?: string;

  @IsEnum(BOOKING_STATUSES) @IsOptional()
  status?: typeof BOOKING_STATUSES[number];

  @IsDateString() @IsOptional()
  @IsValidDateRange()
  from?: string;

  @IsDateString() @IsOptional()
  to?:   string;

  @IsInt() @Min(1)   @Max(200) @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  limit?: number;

  @IsInt() @Min(0) @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  offset?: number;
}

