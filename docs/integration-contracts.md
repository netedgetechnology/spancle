# Spancle Platform — Cross-Engine Integration Contracts
## Membership ↔ Pricing ↔ Booking

---

## 1. Membership → Pricing Contract

### Purpose
Pricing Engine applies member-specific discounts based on membership tier and type.

### Request (Pricing receives via `SlotPricingContext`)

```typescript
interface SlotPricingContext {
  // ... existing fields ...
  isMember:       boolean;      // true → enable 'member' and 'membership' rule types
  membershipTier: string | null; // Plan slug, e.g. 'gold' | 'platinum' | null
}
```

### Rule matching
- `ruleType = 'member'`     fires when `isMember = true` (any tier)
- `ruleType = 'membership'` fires when `isMember = true` AND
  `rule.membershipTier IS NULL OR rule.membershipTier = ctx.membershipTier`

### Ownership
- **Pricing** owns: rule priority, modifier calculation, final price
- **Membership** owns: whether a user is a member, what their tier is
- **Neither engine calls the other** at price-calculation time

### How caller assembles the context
```
1. Caller (Booking, POS, Academy) calls GET /memberships/me/status
2. Receives MembershipStatusDto { isMember, membershipTier, ... }
3. Passes isMember + membershipTier into SlotPricingContext
4. Calls PricingService.quote(ctx)
```

### Future compatibility
Adding new tier values: add a new MembershipPlan.slug, create PricingRule with
membership_tier = new slug. No code changes to Pricing or Booking required.

---

## 2. Membership → Booking Contract

### Purpose
Booking validates member status, priority window, and entitlement availability
before accepting a booking.

### Interface: `GET /api/v1/memberships/me/status`

**Request headers:** `Authorization: Bearer <JWT>`, `x-tenant-id: <UUID>`

**Response: `MembershipStatusDto`**

```typescript
{
  isMember:                   boolean;
  membershipId:               string | null;
  membershipTier:             string | null;  // Plan slug
  membershipType:             string | null;  // individual|family|corporate|...
  membershipStatus:           string | null;  // active|trial|frozen|...
  priorityBookingHoursAhead:  number;         // 0 = no priority
  courtCreditsRemaining:      number;
  coachCreditsRemaining:      number;
  guestPassesRemaining:       number;
  tournamentCreditsRemaining: number;
  cafeCreditMinor:            number;
  lockerAccess:               boolean;
  parkingAccess:              boolean;
  discountEligible:           boolean;
}
```

### Booking validation rules (caller's responsibility)

| Check | How |
|---|---|
| Member discount eligible | `discountEligible && isMember` |
| Priority booking window | `slot.releasedAt - priorityBookingHoursAhead * 3600s` |
| Guest passes | `guestPassesRemaining >= 1` |
| Court credits | `courtCreditsRemaining >= slotsCount` |
| Coach credits | `coachCreditsRemaining >= sessionCount` |

### Entitlement consumption (after booking CONFIRMED)

```
1. BookingService emits BOOKING_CONFIRMED event
2. Caller or event listener calls:
   POST /memberships/:id/entitlements/consume
   { benefitType: 'court_credit', quantity: 1, referenceType: 'booking', referenceId: bookingId }
```

Booking Engine does NOT directly query `membership_entitlement_balances`.
Consumption is always via `EntitlementService.consume()`.

### Ownership

| Concern | Owner |
|---|---|
| Is this user a member? | Membership Engine |
| How many credits remain? | Membership Engine |
| Is the slot available? | Booking Engine |
| Is the court bookable? | Booking Engine (CourtRepository) |
| What price applies? | Pricing Engine |
| When to consume entitlements? | Caller (or event listener) |

### Future compatibility
- New entitlement types: add to `MembershipStatusDto` as optional fields
- All existing fields remain stable; consumers check for field presence
- `membershipId` is provided so consumers can call consume/refund without
  a second lookup

---

## 3. Booking → Membership Contract (reverse)

Membership Engine does NOT call Booking Engine.
Membership listens to Booking events only when a listener is registered
(not yet implemented — Batch 6.5 concern).

The ONLY direction of synchronous coupling is:

```
Caller → GET /memberships/me/status → MembershipService.getMembershipStatus()
```

---

## 4. Responsibilities matrix

| Operation | Membership | Pricing | Booking |
|---|---|---|---|
| Determine member status | ✅ owns | reads via context | reads via API |
| Apply member discount | n/a | ✅ owns | n/a |
| Validate slot availability | n/a | n/a | ✅ owns |
| Consume entitlements | ✅ owns | n/a | n/a |
| Record payment | n/a | n/a (Finance) | n/a |
| Emit booking events | n/a | n/a | ✅ owns |

---

## 5. Error contracts

| Error | Owner | Response |
|---|---|---|
| User has no active membership | Membership | `isMember = false` (200, not 404) |
| Insufficient entitlement balance | Membership | `400 Bad Request` with reason |
| Slot already booked | Booking | `409 Conflict` |
| Price rule missing | Pricing | `resolvedPriceMinor = null` (not an error) |
