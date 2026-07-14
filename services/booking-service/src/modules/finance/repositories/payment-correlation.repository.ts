import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource }                        from '@nestjs/typeorm';
import { DataSource }                              from 'typeorm';
import {
  BookingPaymentFinancePaymentMapEntity,
  type CorrelationSource,
} from '../entities/booking-payment-finance-payment-map.entity';

export interface CreateMappingInput {
  bookingPaymentId:  string;
  financePaymentId:  string;
  correlationSource: CorrelationSource;
  externalReference?: string;
  metadata?:         Record<string, unknown>;
}

@Injectable()
export class PaymentCorrelationRepository {
  private readonly logger = new Logger(PaymentCorrelationRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo() {
    return this.dataSource.getRepository(BookingPaymentFinancePaymentMapEntity);
  }

  // ── Reads ─────────────────────────────────────────────────────────────────

  /** Returns all Finance payment IDs mapped to a given Booking payment. */
  async findByBookingPaymentId(
    bookingPaymentId: string,
    tenantId:         string,
  ): Promise<BookingPaymentFinancePaymentMapEntity[]> {
    return this.repo.find({
      where: { tenantId, bookingPaymentId },
      order: { createdAt: 'ASC' },
    });
  }

  /** Returns all Booking payment IDs mapped to a given Finance payment. */
  async findByFinancePaymentId(
    financePaymentId: string,
    tenantId:         string,
  ): Promise<BookingPaymentFinancePaymentMapEntity[]> {
    return this.repo.find({
      where: { tenantId, financePaymentId },
      order: { createdAt: 'ASC' },
    });
  }

  /** Returns the exact mapping row for a (bookingPaymentId, financePaymentId) pair. */
  async findExactMapping(
    bookingPaymentId: string,
    financePaymentId: string,
    tenantId:         string,
  ): Promise<BookingPaymentFinancePaymentMapEntity | null> {
    return this.repo.findOne({
      where: { tenantId, bookingPaymentId, financePaymentId },
    });
  }

  // ── Create (idempotent) ───────────────────────────────────────────────────

  /**
   * Creates a new mapping or returns the existing one for the same triple.
   *
   * Idempotency: the UNIQUE constraint uq_bpfpm_triple on
   * (tenant_id, booking_payment_id, finance_payment_id) is the DB-level
   * backstop. Application-layer pre-check returns the existing row for the
   * normal idempotent-retry path.
   *
   * The mapping records an explicit assertion — no gateway-ID comparison,
   * no amount comparison, no timestamp comparison.
   */
  async createMapping(
    input:    CreateMappingInput,
    tenantId: string,
    actorId:  string | null,
  ): Promise<BookingPaymentFinancePaymentMapEntity> {
    // Idempotency pre-check
    const existing = await this.findExactMapping(
      input.bookingPaymentId,
      input.financePaymentId,
      tenantId,
    );
    if (existing) {
      this.logger.debug(
        `createMapping: exact mapping already exists (${existing.id}) — returning idempotent`,
      );
      return existing;
    }

    const row = this.repo.create({
      tenantId,
      bookingPaymentId:  input.bookingPaymentId,
      financePaymentId:  input.financePaymentId,
      correlationSource: input.correlationSource,
      externalReference: input.externalReference ?? null,
      metadata:          input.metadata ?? {},
      createdById:       actorId,
    });

    try {
      return await this.repo.save(row);
    } catch (err: unknown) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('uq_bpfpm_triple')) {
        // Concurrent race — load the winner
        const winner = await this.findExactMapping(
          input.bookingPaymentId,
          input.financePaymentId,
          tenantId,
        );
        if (winner) return winner;
        throw new ConflictException(
          `Concurrent mapping creation conflict — please retry`,
        );
      }
      throw err;
    }
  }
}
