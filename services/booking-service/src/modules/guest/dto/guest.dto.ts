import {
  IsArray, IsEmail, IsNotEmpty, IsObject, IsOptional,
  IsString, IsUUID, Max, MaxLength, Min, IsInt,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * GuestSessionDto — body for POST /guest/session
 * Intentionally minimal — the session is issued based on tenant context from
 * the x-tenant-id header, not on any user-supplied identity.
 */
export class GuestSessionDto {
  // No fields required — tenant context comes from x-tenant-id header.
  // Optional: accept a `purpose` field in the future for analytics.
}

/**
 * GuestCustomerDto — customer information for a guest booking.
 * No userId — guests are unregistered. isMember is always false.
 */
export class GuestCustomerDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  name!: string;

  @IsEmail() @MaxLength(254)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email!: string;

  @IsString() @IsOptional() @MaxLength(30)
  phone?: string;
}

/**
 * GuestCreateBookingDto — request body for POST /guest/bookings.
 *
 * Differences from CreateBookingDto:
 *   - guestSession: required (X-Guest-Session equivalent as body field)
 *   - customer: GuestCustomerDto (no userId, no isMember)
 *   - No couponCode (guests cannot redeem member coupons)
 *   - No recurrence (guest recurring bookings not supported in MVP)
 */
export class GuestCreateBookingDto {
  /**
   * Signed guest session token obtained from POST /guest/session.
   * Validates that the request comes through the anti-spam gate.
   */
  @IsString() @IsNotEmpty()
  guestSession!: string;

  @IsArray()
  @IsUUID('4', { each: true })
  slotIds!: string[];

  @IsUUID()
  branchId!: string;

  @IsUUID()
  courtId!: string;

  @IsUUID() @IsOptional()
  sportId?: string;

  @ValidateNested()
  @Type(() => GuestCustomerDto)
  customer!: GuestCustomerDto;

  @IsInt() @Min(1) @Max(100) @IsOptional()
  participantCount?: number;

  @IsString() @IsOptional() @MaxLength(2000)
  customerNotes?: string;

  @IsObject() @IsOptional()
  metadata?: Record<string, unknown>;
}

/**
 * GuestLookupDto — not a body DTO; token comes from URL param.
 * Included for completeness and future validation if moved to body.
 */
export class GuestLookupDto {
  @IsString() @IsNotEmpty()
  token!: string;
}

/**
 * LinkGuestBookingsDto — body for POST /guest/link-bookings (authenticated).
 * The email is used as the link filter; userId comes from the verified JWT.
 */
export class LinkGuestBookingsDto {
  @IsEmail() @MaxLength(254)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  customerEmail!: string;
}
