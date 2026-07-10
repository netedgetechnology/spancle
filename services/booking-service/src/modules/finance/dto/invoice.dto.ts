import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { InvoiceSourceType } from '../entities/invoice.entity';

const SOURCE_TYPES: InvoiceSourceType[] = [
  'booking', 'membership', 'academy', 'tournament', 'pos', 'marketplace', 'manual',
];

export class InvoiceLineDraftDto {
  @IsString() @IsNotEmpty() @MaxLength(500)
  description!: string;

  @IsString() @IsNotEmpty() @MaxLength(40)
  lineType!: string;

  @IsInt() @Min(1)
  quantity!: number;

  @IsInt() @Min(0)
  unitPriceMinor!: number;

  /** Optional: override auto-computed subtotal (quantity × unitPriceMinor). */
  @IsInt() @Min(0) @IsOptional()
  subtotalMinor?: number;

  @IsInt() @Min(0) @IsOptional()
  discountMinor?: number;

  @IsArray() @IsString({ each: true }) @IsOptional()
  appliedRuleIds?: string[];

  @IsString() @IsOptional() @MaxLength(50)
  couponCode?: string;

  @IsUUID() @IsOptional()
  couponRuleId?: string;

  @IsString() @IsOptional() @MaxLength(30)
  discountSource?: string;

  @IsUUID() @IsOptional()
  lineSourceId?: string;

  /** Optional explicit tax code. If omitted, TaxResolver uses jurisdiction lookup. */
  @IsString() @IsOptional() @MaxLength(30)
  taxCode?: string;
}

export class CreateInvoiceDto {
  @IsEnum(SOURCE_TYPES)
  sourceType!: InvoiceSourceType;

  @IsUUID() @IsOptional()
  sourceId?: string;

  @IsUUID() @IsOptional()
  customerId?: string;

  @IsString() @IsNotEmpty() @MaxLength(200)
  customerName!: string;

  @IsString() @IsOptional() @MaxLength(250)
  customerEmail?: string;

  @IsString() @IsNotEmpty() @MaxLength(3)
  currency!: string;

  @IsDateString() @IsOptional()
  dueAt?: string;

  @IsDateString() @IsOptional()
  periodStart?: string;

  @IsDateString() @IsOptional()
  periodEnd?: string;

  @IsString() @IsOptional() @MaxLength(50)
  couponCode?: string;

  /** Tax jurisdiction code for TaxResolver lookup. e.g. 'IN-MH', 'GB'. */
  @IsString() @IsOptional() @MaxLength(10)
  jurisdiction?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDraftDto)
  lines!: InvoiceLineDraftDto[];
}

export class FinaliseInvoiceDto {
  @IsDateString() @IsOptional()
  issuedAt?: string;

  @IsDateString() @IsOptional()
  dueAt?: string;
}

export class VoidInvoiceDto {
  @IsString() @IsNotEmpty() @MaxLength(500)
  reason!: string;
}
