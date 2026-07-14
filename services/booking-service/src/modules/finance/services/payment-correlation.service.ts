import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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

    // ── 2. Verify Booking payment exists (cross-domain read via DataSource) ─
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

    // ── 3. Create the mapping (idempotent) ───────────────────────────────
    const input: CreateMappingInput = {
      bookingPaymentId:  dto.bookingPaymentId,
      financePaymentId:  dto.financePaymentId,
      correlationSource: dto.correlationSource,
      externalReference: dto.externalReference,
      metadata:          dto.metadata ?? {},
    };

    const mapping = await this.correlationRepo.createMapping(input, tenantId, actorId);

    this.logger.log(
      `createMapping: ${mapping.id} ` +
      `bookingPayment=${dto.bookingPaymentId} ↔ financePayment=${dto.financePaymentId} ` +
      `source=${dto.correlationSource} — tenant ${tenantId}`,
    );

    return mapping;
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
