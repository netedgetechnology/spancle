import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

const CURRENCIES = ['GBP', 'USD', 'EUR', 'AED', 'INR', 'AUD', 'CAD', 'SGD'] as const;
const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;

export class HourlySlotDto {
  @IsInt()
  @Min(0)
  @Max(23)
  hour!: number;

  @IsInt()
  @Min(0)
  priceMinor!: number;
}

export class DayPriceGridDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HourlySlotDto)
  hourlySlots!: HourlySlotDto[];
}

export class DateOverrideDto {
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @IsBoolean()
  allDay!: boolean;

  /** Required when allDay = true */
  @ValidateIf((o: DateOverrideDto) => o.allDay === true)
  @IsInt()
  @Min(0)
  priceMinor?: number;

  /** Required when allDay = false */
  @ValidateIf((o: DateOverrideDto) => o.allDay === false)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HourlySlotDto)
  hourlySlots?: HourlySlotDto[];
}

export class CreateRateCardDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsEnum(CURRENCIES)
  @IsOptional()
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  defaultPriceMinor?: number;

  /** Keys must be valid day names; values are DayPriceGridDto */
  @IsOptional()
  weeklyGrid?: Partial<Record<typeof DAYS[number], DayPriceGridDto>>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DateOverrideDto)
  dateOverrides?: DateOverrideDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateRateCardDto extends PartialType(CreateRateCardDto) {}
