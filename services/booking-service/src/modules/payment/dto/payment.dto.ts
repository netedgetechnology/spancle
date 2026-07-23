import {
  IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min,
} from 'class-validator';

/**
 * InitiateBookingPaymentDto — body for POST /api/v1/payments/initiate
 *
 * The frontend calls this after booking creation to get a clientSecret
 * for Stripe Elements or a Razorpay order ID for the SDK checkout.
 */
export class InitiateBookingPaymentDto {
  @IsUUID()
  bookingId!: string;

  @IsUUID()
  branchId!: string;

  @IsInt() @Min(1)
  amountMinor!: number;

  @IsString() @IsNotEmpty() @MaxLength(3)
  currency!: string;

  @IsEmail() @IsOptional()
  customerEmail?: string;

  @IsUUID() @IsOptional()
  customerId?: string;
}
