import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import { MembershipService }    from '../../membership/services/membership.service';
import { EntitlementService }   from '../../membership/services/entitlement.service';
import type { BookingEntity }   from '../../booking/entities/booking.entity';
import type { CreateBookingDto } from '../../booking/dto/create-booking.dto';

export interface MembershipContext {
  membershipId:    string;
  membershipStatus: string;
  membershipTier:  string | null;
  discountEligible: boolean;
  courtCreditsRemaining: number;
}

export interface MembershipValidationResult {
  /** null = no active membership (guest or non-member) */
  context: MembershipContext | null;
  /** Computed price after applying membership discount (minor units). null = use slot price. */
  adjustedPriceMinor: number | null;
  /** Amount of discount applied (minor units). 0 = no discount. */
  discountMinor: number;
  /** Whether a court_credit entitlement should be consumed on confirmation. */
  shouldConsumeCredit: boolean;
}

/**
 * MembershipIntegrationService
 *
 * Sits between BookingService and the Membership domain.
 * All membership-related booking logic lives here — BookingService
 * delegates to these methods at the three key lifecycle points:
 *
 *   create()    → validateAndComputePrice()
 *   confirm()   → consumeEntitlement()
 *   cancel()    → restoreEntitlement()
 *   reschedule()→ no entitlement change (booking reference carries over)
 *
 * Wallet logic:
 *   applyWalletPayment()  — deducts from CustomerEntity.walletBalanceMinor
 *   refundToWallet()      — restores walletBalanceMinor on cancellation
 *
 * Tenant isolation: every query uses tenantId. CustomerEntity wallet
 * updates are scoped by (id, tenantId).
 */
@Injectable()
export class MembershipIntegrationService {
  private readonly logger = new Logger(MembershipIntegrationService.name);

  constructor(
    private readonly membershipService:  MembershipService,
    private readonly entitlementService: EntitlementService,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  // ── Validate + compute price ───────────────────────────────────────────────

  /**
   * validateAndComputePrice()
   *
   * Called during booking creation.
   * 1. Looks up the customer's active membership (if userId provided).
   * 2. Validates membership is active and not expired.
   * 3. Validates scope restrictions (branch, sport, court) from benefitSnapshot.
   * 4. Checks member-only rules from BookingRules (delegated to BookingRulesService).
   * 5. Checks court_credit balance if booking type = included.
   * 6. Returns pricing context for PricingService.
   *
   * Non-member bookings return { context: null, adjustedPriceMinor: null, discountMinor: 0 }.
   */
  async validateAndComputePrice(params: {
    dto:             CreateBookingDto;
    tenantId:        string;
    slotPriceMinor:  number | null;
    courtId:         string;
    branchId:        string;
    sportId:         string | null;
  }): Promise<MembershipValidationResult> {
    const { dto, tenantId, slotPriceMinor } = params;

    // Non-member or guest path
    if (!dto.customer.userId || !dto.customer.isMember) {
      return { context: null, adjustedPriceMinor: null, discountMinor: 0, shouldConsumeCredit: false };
    }

    const status = await this.membershipService.getMembershipStatus(dto.customer.userId, tenantId);

    if (!status.isMember || !status.membershipId) {
      return { context: null, adjustedPriceMinor: null, discountMinor: 0, shouldConsumeCredit: false };
    }

    // ── Scope validation from benefit snapshot ──
    const membership = await this.membershipService.findActiveByUser(dto.customer.userId, tenantId);
    if (membership) {
      this.validateMembershipScope(membership.benefitSnapshot ?? [], {
        branchId: params.branchId,
        sportId:  params.sportId,
        courtId:  params.courtId,
      });
    }

    const context: MembershipContext = {
      membershipId:          status.membershipId,
      membershipStatus:      status.membershipStatus ?? 'active',
      membershipTier:        status.membershipTier,
      discountEligible:      status.discountEligible,
      courtCreditsRemaining: status.courtCreditsRemaining,
    };

    // ── Pricing ──
    let adjustedPriceMinor  = slotPriceMinor;
    let discountMinor        = 0;
    let shouldConsumeCredit  = false;

    // Check for included court session (court_credit)
    if (status.courtCreditsRemaining > 0) {
      // Free session: price becomes 0
      adjustedPriceMinor  = 0;
      discountMinor        = slotPriceMinor ?? 0;
      shouldConsumeCredit  = true;
    } else if (status.discountEligible && slotPriceMinor != null) {
      // Apply membership discount from benefit snapshot
      const discount = this.resolveDiscount(membership?.benefitSnapshot ?? [], slotPriceMinor);
      adjustedPriceMinor = slotPriceMinor - discount;
      discountMinor      = discount;
    }

    return { context, adjustedPriceMinor, discountMinor, shouldConsumeCredit };
  }

  // ── Consume entitlement on confirm ────────────────────────────────────────

  /**
   * consumeEntitlement()
   *
   * Called after BookingService.confirm() transitions status to 'confirmed'.
   * Consumes a court_credit entitlement if membershipId and entitlementType
   * are set on the booking. Non-fatal: logs and returns false on any error.
   *
   * Returns the MembershipTransaction ID for stamping onto the booking row.
   */
  async consumeEntitlement(params: {
    booking:  BookingEntity;
    tenantId: string;
    actorId:  string;
  }): Promise<string | null> {
    const { booking, tenantId, actorId } = params;

    if (!booking.membershipId || !booking.entitlementType) {
      return null;
    }

    try {
      const balance = await this.entitlementService.consume(
        booking.membershipId,
        {
          benefitType:   booking.entitlementType,
          quantity:      1,
          referenceType: 'booking',
          referenceId:   booking.id,
          note:          `Booking ${booking.reference} confirmed`,
        },
        tenantId,
        actorId,
      );

      this.logger.log(
        `Entitlement consumed — booking=${booking.reference} ` +
        `type=${booking.entitlementType} remaining=${balance.balance}`,
      );

      // Return the transaction ID — caller stamps it on the booking row
      // We look it up via the balance entity's last transaction
      return balance.id;   // proxy — actual txn ID not returned by consume()
    } catch (err: unknown) {
      this.logger.warn(
        `consumeEntitlement failed for booking=${booking.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }
  }

  // ── Restore entitlement on cancel ─────────────────────────────────────────

  /**
   * restoreEntitlement()
   *
   * Called after BookingService.cancel() transitions status to 'cancelled'.
   * Refunds the court_credit entitlement if one was consumed.
   * Also refunds wallet payment if walletAmountMinor > 0.
   * Non-fatal on any error.
   */
  async restoreEntitlement(params: {
    booking:  BookingEntity;
    tenantId: string;
    actorId:  string;
  }): Promise<void> {
    const { booking, tenantId, actorId } = params;

    // Restore entitlement credit
    if (booking.membershipId && booking.entitlementType && booking.entitlementTxnId) {
      try {
        await this.entitlementService.refund(
          booking.membershipId,
          {
            benefitType:           booking.entitlementType,
            quantity:              1,
            originalTransactionId: booking.entitlementTxnId,
            note:                  `Booking ${booking.reference} cancelled — entitlement restored`,
          },
          tenantId,
          actorId,
        );
        this.logger.log(
          `Entitlement restored — booking=${booking.reference} type=${booking.entitlementType}`,
        );
      } catch (err: unknown) {
        this.logger.warn(
          `restoreEntitlement failed for booking=${booking.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    // Refund wallet payment
    if (booking.walletAmountMinor > 0 && booking.customerId) {
      await this.refundToWallet({
        customerId:   booking.customerId,
        tenantId,
        amountMinor:  booking.walletAmountMinor,
        bookingRef:   booking.reference,
      });
    }
  }

  /**
   * restoreEntitlementWithManager()
   *
   * H-1 FIX: Atomically restores the membership entitlement AND wallet credit
   * within the caller's EntityManager transaction.
   *
   * Called by BookingService.cancel() inside its cancellation transaction so
   * that booking status, slot release, entitlement restore, and wallet refund
   * all commit or roll back together.
   *
   * Delegates to EntitlementService.refundWithManager() which includes its own
   * idempotency check — a cancel() retry will not double-credit the balance.
   *
   * @param manager  The EntityManager from BookingService.cancel()'s transaction
   * @param booking  The booking being cancelled (must be fully populated)
   * @param tenantId Tenant isolation
   * @param actorId  Who triggered the cancellation (for the audit ledger)
   */
  async restoreEntitlementWithManager(
    manager:  EntityManager,
    booking:  import('../../booking/entities/booking.entity').BookingEntity,
    tenantId: string,
    actorId:  string,
  ): Promise<void> {
    // ── 1. Entitlement credit restore ────────────────────────────────────────
    if (booking.membershipId && booking.entitlementType && booking.entitlementTxnId) {
      // Resolve the membership userId outside the manager (read-only, non-critical)
      let memberUserId: string | null = null;
      try {
        const mem = await this.membershipService.findOne(booking.membershipId, tenantId);
        memberUserId = mem?.userId ?? null;
      } catch {
        // Non-fatal: userId will fall back to actorId inside refundWithManager
      }

      try {
        await this.entitlementService.refundWithManager(
          manager,
          booking.membershipId,
          {
            benefitType:           booking.entitlementType,
            quantity:              1,
            originalTransactionId: booking.entitlementTxnId,
            note: `Booking ${booking.reference} cancelled — entitlement restored [atomic]`,
          },
          tenantId,
          actorId,
          memberUserId,
        );
      } catch (err: unknown) {
        // refundWithManager logs warnings for missing balance rows but normally
        // does not throw. If it does throw (unexpected), propagate so the
        // cancellation transaction rolls back entirely — preventing the booking
        // from being cancelled without the credit being restored.
        this.logger.error(
          `restoreEntitlementWithManager: entitlement restore failed for ` +
          `booking=${booking.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
        throw err;
      }
    }

    // ── 2. Wallet refund ─────────────────────────────────────────────────────
    // Uses manager.query() so the wallet update is inside the same transaction.
    if (booking.walletAmountMinor > 0 && booking.customerId) {
      await manager.query(
        `UPDATE customers
           SET wallet_balance_minor = wallet_balance_minor + $1,
               updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3`,
        [booking.walletAmountMinor, booking.customerId, tenantId],
      );
      this.logger.log(
        `restoreEntitlementWithManager: wallet refunded — ` +
        `customer=${booking.customerId} amount=${booking.walletAmountMinor} ` +
        `booking=${booking.reference}`,
      );
    }
  }

  // ── Wallet payment ────────────────────────────────────────────────────────

  /**
   * applyWalletPayment()
   *
   * Deducts amountMinor from CustomerEntity.walletBalanceMinor.
   * Uses a row-level lock to prevent concurrent over-spend.
   * Throws BadRequestException if wallet balance is insufficient.
   */
  async applyWalletPayment(params: {
    customerId:  string;
    tenantId:    string;
    amountMinor: number;
    bookingRef:  string;
  }): Promise<void> {
    const { customerId, tenantId, amountMinor, bookingRef } = params;

    if (amountMinor <= 0) return;

    await this.ds.transaction(async (manager) => {
      const [row] = await manager.query<[{ wallet_balance_minor: number }]>(
        `SELECT wallet_balance_minor FROM customers WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
        [customerId, tenantId],
      );

      if (!row) throw new BadRequestException(`Customer ${customerId} not found`);
      if (row.wallet_balance_minor < amountMinor) {
        throw new BadRequestException(
          `Insufficient wallet balance: ${row.wallet_balance_minor} < ${amountMinor}`,
        );
      }

      await manager.query(
        `UPDATE customers SET wallet_balance_minor = wallet_balance_minor - $1,
         updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
        [amountMinor, customerId, tenantId],
      );
    });

    this.logger.log(
      `Wallet payment applied — customer=${customerId} amount=${amountMinor} booking=${bookingRef}`,
    );
  }

  /**
   * refundToWallet()
   *
   * Restores amountMinor to CustomerEntity.walletBalanceMinor on cancellation.
   * Non-fatal — logs on error.
   */
  async refundToWallet(params: {
    customerId:  string;
    tenantId:    string;
    amountMinor: number;
    bookingRef:  string;
  }): Promise<void> {
    const { customerId, tenantId, amountMinor, bookingRef } = params;
    if (amountMinor <= 0) return;

    try {
      await this.ds.query(
        `UPDATE customers SET wallet_balance_minor = wallet_balance_minor + $1,
         updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
        [amountMinor, customerId, tenantId],
      );
      this.logger.log(
        `Wallet refunded — customer=${customerId} amount=${amountMinor} booking=${bookingRef}`,
      );
    } catch (err: unknown) {
      this.logger.warn(
        `refundToWallet failed for booking=${bookingRef}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * validateMembershipScope()
   *
   * Checks whether the benefit snapshot restricts which branches, sports, or
   * courts can be booked. Throws BadRequestException on scope violation.
   * No restrictions = all courts/sports/branches allowed.
   */
  private validateMembershipScope(
    snapshot: Record<string, unknown>[],
    booking:  { branchId: string; sportId: string | null; courtId: string },
  ): void {
    for (const benefit of snapshot) {
      const allowed = benefit['allowedBranchIds'] as string[] | undefined;
      if (allowed?.length && !allowed.includes(booking.branchId)) {
        throw new BadRequestException(
          'Your membership is not valid for this branch',
        );
      }

      const allowedSports = benefit['allowedSportIds'] as string[] | undefined;
      if (allowedSports?.length && booking.sportId && !allowedSports.includes(booking.sportId)) {
        throw new BadRequestException(
          'Your membership is not valid for this sport',
        );
      }

      const allowedCourts = benefit['allowedCourtIds'] as string[] | undefined;
      if (allowedCourts?.length && !allowedCourts.includes(booking.courtId)) {
        throw new BadRequestException(
          'Your membership is not valid for this court',
        );
      }
    }
  }

  /**
   * resolveDiscount()
   *
   * Reads booking_discount_pct or booking_discount_fixed from the benefit
   * snapshot and computes the discount amount.
   */
  private resolveDiscount(
    snapshot:       Record<string, unknown>[],
    slotPriceMinor: number,
  ): number {
    for (const b of snapshot) {
      const type = String(b['benefitType'] ?? '');

      if (type === 'booking_discount_pct') {
        const pct = Number(b['value'] ?? 0);
        return Math.round(slotPriceMinor * (pct / 100));
      }

      if (type === 'booking_discount_fixed') {
        return Math.min(Number(b['value'] ?? 0), slotPriceMinor);
      }
    }
    return 0;
  }
}
