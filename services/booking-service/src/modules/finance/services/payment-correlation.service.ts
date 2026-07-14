import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource }                        from '@nestjs/typeorm';
import { DataSource }                              from 'typeorm';
import { PaymentCorrelationRepository, type CreateMappingInput } from '../repositories/payment-correlation.repository';
import { PaymentRepository }                       from '../repositories/payment.repository';
import { BookingPaymentFinancePaymentMapEntity }   from '../entities/booking-payment-finance-payment-map.entity';
import type { CreatePaymentCorrelationDto }        from '../dto/payment-correlation.dto';

@Injectable()
export class PaymentCorrelationService {
  private readonly logger = new Logger(PaymentCorrelationService.name);

  constructor(
    private readonly correlationRepo: PaymentCorrelationRepository,
    private readonly paymentRepo:     PaymentRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Creates an explicit Booking Payment ↔ Finance Payment mapping.
   *
   * Validation (before any persistence):
   *   1. Finance PaymentEntity must exist for (financePaymentId, tenantId).
   *   2. BookingPaymentEntity must exist for (bookingPaymentId, tenantId, isDeleted=false).
   *   3. No gateway-ID comparison, no amount comparison, no timestamp comparison.
   *
   * The caller asserts the correlation because they have authoritative external
   * knowledge of both IDs (e.g. a payment webhook that knows the booking payment
   * record and the Finance payment record).
   */
  async createMapping(
    dto:      CreatePaymentCorrelationDto,
    tenantId: string,
    actorId:  string,
  ): Promise<BookingPaymentFinancePaymentMapEntity> {
    // ── 1. Verify Finance payment exists ─────────────────────────────────
    const financePayment = await this.paymentRepo.findById(dto.financePaymentId, tenantId);
    if (!financePayment) {
      throw new BadRequestException(
        `Finance payment ${dto.financePaymentId} not found for tenant ${tenantId}`,
      );
    }

    // ── 2. Verify Booking payment exists ─────────────────────────────────
    const bkPayRows = await this.dataSource.query<{ id: string }[]>(
      `SELECT id FROM booking_payments
       WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE
       LIMIT 1`,
      [dto.bookingPaymentId, tenantId],
    );
    if (!bkPayRows.length) {
      throw new BadRequestException(
        `Booking payment ${dto.bookingPaymentId} not found for tenant ${tenantId}`,
      );
    }

    // ── 3. Enforce one-to-one: check for existing mapping for this bookingPaymentId ─
    const existingMappings = await this.correlationRepo.findByBookingPaymentId(
      dto.bookingPaymentId, tenantId,
    );

    if (existingMappings.length > 0) {
      const exact = existingMappings.find(
        (m) => m.financePaymentId === dto.financePaymentId,
      );
      if (exact) {
        // Idempotent: same mapping already exists
        this.logger.debug(
          `createMapping: exact mapping ${exact.id} already exists — returning idempotent`,
        );
        return exact;
      }
      // Conflicting mapping: bookingPaymentId already mapped to a different financePaymentId
      throw new ConflictException(
        `Booking payment ${dto.bookingPaymentId} is already mapped to Finance payment ` +
        `${existingMappings[0]!.financePaymentId} (v1 invariant: one Booking payment → ` +
        `one Finance payment). Cannot add a second mapping.`,
      );
    }

    // ── 4. Create the mapping ─────────────────────────────────────────────
    const input: CreateMappingInput = {
      bookingPaymentId:  dto.bookingPaymentId,
      financePaymentId:  dto.financePaymentId,
      correlationSource: dto.correlationSource,
      externalReference: dto.externalReference,
      metadata:          dto.metadata ?? {},
    };

    try {
      const mapping = await this.correlationRepo.createMapping(input, tenantId, actorId);
      this.logger.log(
        `createMapping: ${mapping.id} ` +
        `bookingPayment=${dto.bookingPaymentId} ↔ financePayment=${dto.financePaymentId} ` +
        `source=${dto.correlationSource} — tenant ${tenantId}`,
      );
      return mapping;
    } catch (err: unknown) {
      const msg = (err as Error).message ?? '';
      // 23505 on uq_bpfpm_booking_payment (the new one-to-one index from migration 017)
      if (msg.includes('uq_bpfpm_booking_payment') ||
          ((err as any).code === '23505' && msg.includes('booking_payment_id'))) {
        const existing = await this.correlationRepo.findByBookingPaymentId(
          dto.bookingPaymentId, tenantId,
        );
        if (existing.length > 0 && existing[0]!.financePaymentId === dto.financePaymentId) {
          return existing[0]!;
        }
        throw new ConflictException(
          `Concurrent mapping conflict for Booking payment ${dto.bookingPaymentId}. ` +
          `It is already mapped to a different Finance payment.`,
        );
      }
      throw err;
    }
  }

  async findByBookingPaymentId(
    bookingPaymentId: string,
    tenantId:         string,
  ): Promise<BookingPaymentFinancePaymentMapEntity[]> {
    return this.correlationRepo.findByBookingPaymentId(bookingPaymentId, tenantId);
  }

  async findByFinancePaymentId(
    financePaymentId: string,
    tenantId:         string,
  ): Promise<BookingPaymentFinancePaymentMapEntity[]> {
    return this.correlationRepo.findByFinancePaymentId(financePaymentId, tenantId);
  }
}
