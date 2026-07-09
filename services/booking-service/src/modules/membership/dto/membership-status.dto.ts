/**
 * MembershipStatusDto — the only data structure that crosses the
 * Membership ↔ Booking and Membership ↔ Pricing boundaries.
 *
 * All consuming engines (Booking, Pricing, POS, Academy) must rely on this
 * contract and must NOT query membership tables directly.
 *
 * Versioned here for future compatibility: if fields are added they will
 * always be optional to avoid breaking callers.
 */
export interface MembershipStatusDto {
  /** Whether the caller has an active (non-terminal, non-suspended) membership. */
  isMember:              boolean;

  /** Membership entity ID — for internal correlation only. */
  membershipId:          string | null;

  /**
   * Plan slug — used by Pricing to match membership-tier pricing rules.
   * e.g. 'gold' | 'platinum' | 'corporate-bronze'
   * null when isMember = false.
   */
  membershipTier:        string | null;

  /**
   * Membership type discriminator.
   * Values: individual | family | corporate | academy | vip | lifetime | trial
   * null when isMember = false.
   */
  membershipType:        string | null;

  /** Current lifecycle status. null when isMember = false. */
  membershipStatus:      string | null;

  /**
   * Hours before public release that this member can book.
   * 0 = no priority window.
   */
  priorityBookingHoursAhead: number;

  // ── Entitlement balances (effective = balance - reservedUnits) ────────────

  /** Remaining court booking credits. 0 if no such entitlement. */
  courtCreditsRemaining:   number;

  /** Remaining coaching session credits. */
  coachCreditsRemaining:   number;

  /** Remaining guest passes. */
  guestPassesRemaining:    number;

  /** Remaining tournament entry credits. */
  tournamentCreditsRemaining: number;

  /** Remaining café credits in minor currency units (pence/cents). */
  cafeCreditMinor:         number;

  /** Whether the member has active locker access. */
  lockerAccess:            boolean;

  /** Whether the member has active parking access. */
  parkingAccess:           boolean;

  /**
   * Whether the membership entitles the member to a booking discount.
   * true when benefitSnapshot contains booking_discount_pct or booking_discount_fixed.
   * Pricing Engine resolves the actual amount via its own rules.
   */
  discountEligible:        boolean;
}
