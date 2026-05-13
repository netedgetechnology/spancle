import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

// ── Shared constants ──────────────────────────────────────────────────────────

export const INVOICE_TYPES  = ['booking', 'membership', 'academy', 'manual', 'credit_note'] as const;
export const GST_TYPES      = ['intra_state', 'inter_state', 'exempt', 'zero_rated', 'composite'] as const;

// ── Line item ─────────────────────────────────────────────────────────────────

export class CreateInvoiceLineItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  @IsString()
  @IsOptional()
  @MaxLength(8)
  hsnSacCode?: string;

  /** Quantity — supports fractional (e.g. 1.5 hours). Stored × 1000 internally. */
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(9999.999)
  quantity!: number;

  /** Price per unit in minor currency units (paise) */
  @IsInt()
  @Min(0)
  unitPriceMinor!: number;

  /** Discount on this line in minor currency units */
  @IsInt()
  @Min(0)
  @IsOptional()
  discountMinor?: number;

  /**
   * Total GST rate for this line in basis points.
   * e.g. 1800 = 18%, 1200 = 12%, 500 = 5%, 0 = exempt
   * The split into CGST/SGST or IGST is determined by gstType on the invoice.
   */
  @IsInt()
  @Min(0)
  @Max(2800)     // 28% is the max GST rate in India
  gstRateBps!: number;
}

// ── Billing address ───────────────────────────────────────────────────────────

export class BillingAddressDto {
  @IsString() @IsNotEmpty() @MaxLength(255) line1!:   string;
  @IsString() @IsOptional() @MaxLength(255) line2?:   string;
  @IsString() @IsNotEmpty() @MaxLength(100) city!:    string;
  @IsString() @IsNotEmpty() @MaxLength(100) state!:   string;
  @IsString() @IsNotEmpty() @MaxLength(6)   pincode!: string;
  @IsString() @IsOptional() @MaxLength(2)   country?: string;
}

// ── Create invoice ────────────────────────────────────────────────────────────

export class CreateInvoiceDto {
  @IsEnum(INVOICE_TYPES)
  @IsOptional()
  type?: typeof INVOICE_TYPES[number];

  @IsUUID() @IsOptional()
  bookingId?: string;

  @IsUUID()
  branchId!: string;

  @IsUUID() @IsOptional()
  userId?: string;

  @IsUUID() @IsOptional()
  originalInvoiceId?: string;

  // ── Customer ───────────────────────────────────────────────────────────────

  @IsString() @IsNotEmpty() @MaxLength(255)
  customerName!: string;

  @IsEmail() @MaxLength(254)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  customerEmail!: string;

  @IsString() @IsOptional() @MaxLength(30)
  customerPhone?: string;

  /**
   * Customer GSTIN — 15-character alphanumeric.
   * Required when customerGstType is inter_state and customer is a business.
   */
  @IsString()
  @IsOptional()
  @MinLength(15)
  @MaxLength(15)
  customerGstin?: string;

  @ValidateNested() @Type(() => BillingAddressDto) @IsOptional()
  billingAddress?: BillingAddressDto;

  // ── Supplier GST ───────────────────────────────────────────────────────────

  @IsString() @IsOptional() @MaxLength(15)
  supplierGstin?: string;

  /** 2-digit state code of the supplier. e.g. '27' for Maharashtra */
  @IsString() @IsOptional() @MaxLength(2)
  supplierStateCode?: string;

  /** 2-digit state code of the recipient. Used to determine intra/inter-state. */
  @IsString() @IsOptional() @MaxLength(2)
  recipientStateCode?: string;

  @IsEnum(GST_TYPES)
  @IsOptional()
  gstType?: typeof GST_TYPES[number];

  /** HSN/SAC code for the primary service */
  @IsString() @IsOptional() @MaxLength(8)
  hsnSacCode?: string;

  // ── Line items ─────────────────────────────────────────────────────────────

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineItemDto)
  lineItems!: CreateInvoiceLineItemDto[];

  // ── Discount (invoice-level) ───────────────────────────────────────────────

  @IsInt() @Min(0) @IsOptional()
  discountMinor?: number;

  @IsString() @IsOptional() @MaxLength(3)
  currency?: string;

  // ── Dates ──────────────────────────────────────────────────────────────────

  @IsDateString() @IsOptional()
  issuedAt?: string;

  @IsDateString() @IsOptional()
  dueAt?: string;

  // ── Notes ─────────────────────────────────────────────────────────────────

  @IsString() @IsOptional() @MaxLength(5000)
  notes?: string;

  @IsString() @IsOptional() @MaxLength(5000)
  internalNotes?: string;

  /** Branch short code for invoice numbering — e.g. 'MUM'. Defaults to 'HO'. */
  @IsString() @IsOptional() @MaxLength(10)
  branchCode?: string;

  /** Invoice number prefix. Defaults to 'INV'. Credit notes use 'CRED'. */
  @IsString() @IsOptional() @MaxLength(10)
  numberPrefix?: string;
}
