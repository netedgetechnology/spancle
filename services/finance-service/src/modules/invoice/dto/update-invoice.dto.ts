import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CreateInvoiceLineItemDto, BillingAddressDto } from './create-invoice.dto';

const INVOICE_STATUSES = [
  'draft', 'issued', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'voided',
] as const;

export class UpdateInvoiceDto {
  @IsString() @IsOptional() @MaxLength(255)
  customerName?: string;

  @IsEmail() @IsOptional() @MaxLength(254)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  customerEmail?: string;

  @IsString() @IsOptional() @MaxLength(30)
  customerPhone?: string;

  @IsString() @IsOptional() @MaxLength(15)
  customerGstin?: string;

  @ValidateNested() @Type(() => BillingAddressDto) @IsOptional()
  billingAddress?: BillingAddressDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineItemDto)
  @IsOptional()
  lineItems?: CreateInvoiceLineItemDto[];

  @IsInt() @Min(0) @IsOptional()
  discountMinor?: number;

  @IsDateString() @IsOptional()
  dueAt?: string;

  @IsString() @IsOptional() @MaxLength(5000)
  notes?: string;

  @IsString() @IsOptional() @MaxLength(5000)
  internalNotes?: string;
}

export class InvoiceQueryDto {
  @IsEnum(INVOICE_STATUSES) @IsOptional()
  status?: typeof INVOICE_STATUSES[number];

  @IsEnum(['booking', 'membership', 'academy', 'manual', 'credit_note']) @IsOptional()
  type?: string;

  @IsUUID() @IsOptional()
  branchId?: string;

  @IsUUID() @IsOptional()
  userId?: string;

  @IsUUID() @IsOptional()
  bookingId?: string;

  @IsDateString() @IsOptional()
  from?: string;

  @IsDateString() @IsOptional()
  to?: string;

  @IsString() @IsOptional()
  invoiceNumber?: string;

  @IsInt() @Min(1) @Max(200) @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  limit?: number;

  @IsInt() @Min(0) @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  offset?: number;
}

export class RecordPaymentDto {
  @IsInt() @Min(1)
  amountMinor!: number;

  @IsString() @IsOptional() @MaxLength(255)
  paymentReference?: string;

  @IsDateString() @IsOptional()
  paidAt?: string;

  @IsString() @IsOptional() @MaxLength(500)
  notes?: string;
}

export class VoidInvoiceDto {
  @IsString() @MaxLength(500)
  reason!: string;
}

export class SendInvoiceDto {
  @IsEmail() @IsOptional() @MaxLength(254)
  email?: string;

  @IsString() @IsOptional() @MaxLength(2000)
  message?: string;
}
