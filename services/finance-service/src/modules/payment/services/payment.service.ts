import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentRepository }       from '../repositories/payment.repository';
import { PaymentRefundRepository } from '../repositories/payment-refund.repository';
import { InvoiceRepository } from '../../invoice/repositories/invoice.repository';
import { PaymentEvents } from '../events/payment.events';
import type { PaymentEntity } from '../entities/payment.entity';
import type { PaymentRefundEntity } from '../entities/payment-refund.entity';
import type {
  CreatePaymentDto,
  CapturePaymentDto,
  SettlePaymentDto,
  FailPaymentDto,
  CreateRefundDto,
  ReconcilePaymentDto,
  PaymentQueryDto,
} from '../dto/create-payment.dto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly paymentRepository:  PaymentRepository,
    private readonly invoiceRepository:   InvoiceRepository,
    private readonly refundRepository:    PaymentRefundRepository,
    private readonly eventEmitter:        EventEmitter2,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────────

  async create(dto: CreatePaymentDto, tenantId: string): Promise<PaymentEntity> {
    // Idempotency check
    const existing = await this.paymentRepository.findByIdempotencyKey(dto.idempotencyKey, tenantId);
    if (existing) {
      this.logger.log(`Idempotent: returning existing payment ${existing.id}`);
      return existing;
    }

    const entity = await this.paymentRepository.create({
      ...dto,
      tenantId,
      currency:        dto.currency        ?? 'INR',
      netAmountMinor:  dto.amountMinor,
      status:          'initiated',
      initiatedAt:     new Date(),
    });

    await this.eventEmitter.emitAsync(PaymentEvents.CREATED, {
      tenantId, paymentId: entity.id, timestamp: new Date().toISOString(),
    });

    return entity;
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  async findAll(tenantId: string, query?: PaymentQueryDto): Promise<PaymentEntity[]> {
    return this.paymentRepository.findByQuery(tenantId, query ?? {});
  }

  async findOne(id: string, tenantId: string): Promise<PaymentEntity> {
    const entity = await this.paymentRepository.findByIdAndTenant(id, tenantId);
    if (!entity) throw new NotFoundException(`Payment ${id} not found`);
    return entity;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async capture(id: string, dto: CapturePaymentDto, tenantId: string): Promise<PaymentEntity> {
    const payment = await this.findOne(id, tenantId);

    if (!['initiated', 'pending'].includes(payment.status)) {
      throw new BadRequestException(`Cannot capture payment in status '${payment.status}'`);
    }

    const updated = await this.paymentRepository.update(id, tenantId, {
      status:           'captured',
      capturedAt:       new Date(),
      ...(dto.providerPaymentId && { providerPaymentId: dto.providerPaymentId }),
      ...(dto.settlementRef    && { settlementRef:     dto.settlementRef    }),
      ...(dto.providerMeta     && { providerMeta:      dto.providerMeta as any }),
    });

    await this.eventEmitter.emitAsync(PaymentEvents.STATUS_CHANGED, {
      tenantId, paymentId: id, previousStatus: payment.status, newStatus: 'captured',
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  async settle(id: string, dto: SettlePaymentDto, tenantId: string): Promise<PaymentEntity> {
    const payment = await this.findOne(id, tenantId);

    if (!['initiated', 'pending', 'captured'].includes(payment.status)) {
      throw new BadRequestException(`Cannot settle payment in status '${payment.status}'`);
    }

    const updated = await this.paymentRepository.update(id, tenantId, {
      status:              'settled',
      settledAt:           new Date(),
      ...(dto.settlementRef     && { settlementRef:     dto.settlementRef     }),
      ...(dto.settlementBatchId && { settlementBatchId: dto.settlementBatchId }),
      ...(dto.providerMeta      && { providerMeta:      dto.providerMeta as any }),
    });

    // Update invoice amountPaidMinor when a payment settles
    await this.syncInvoicePaid(payment.invoiceId, payment.tenantId);

    await this.eventEmitter.emitAsync(PaymentEvents.STATUS_CHANGED, {
      tenantId, paymentId: id, previousStatus: payment.status, newStatus: 'settled',
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  async fail(id: string, dto: FailPaymentDto, tenantId: string): Promise<PaymentEntity> {
    const payment = await this.findOne(id, tenantId);

    if (['settled', 'refunded', 'cancelled'].includes(payment.status)) {
      throw new BadRequestException(`Cannot fail payment in terminal status '${payment.status}'`);
    }

    const updated = await this.paymentRepository.update(id, tenantId, {
      status:        'failed',
      failedAt:      new Date(),
      failureReason: dto.failureReason,
    });

    await this.eventEmitter.emitAsync(PaymentEvents.STATUS_CHANGED, {
      tenantId, paymentId: id, previousStatus: payment.status, newStatus: 'failed',
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  async cancel(id: string, tenantId: string): Promise<PaymentEntity> {
    const payment = await this.findOne(id, tenantId);

    if (!['initiated', 'pending'].includes(payment.status)) {
      throw new BadRequestException(`Cannot cancel payment in status '${payment.status}'`);
    }

    return this.paymentRepository.update(id, tenantId, { status: 'cancelled' });
  }

  // ── Refund ────────────────────────────────────────────────────────────────

  async refund(id: string, dto: CreateRefundDto, tenantId: string): Promise<PaymentEntity> {
    const payment = await this.findOne(id, tenantId);

    if (!['settled', 'partial_refund'].includes(payment.status)) {
      throw new BadRequestException(`Can only refund settled payments (status: '${payment.status}')`);
    }

    const alreadyRefunded = await this.refundRepository.sumProcessedForPayment(id, tenantId);
    const maxRefundable   = payment.amountMinor - alreadyRefunded;

    if (dto.amountMinor > maxRefundable) {
      throw new UnprocessableEntityException(
        `Refund of ${dto.amountMinor} exceeds refundable amount ${maxRefundable} ` +
        `(already refunded: ${alreadyRefunded})`,
      );
    }

    const newRefunded  = alreadyRefunded + dto.amountMinor;
    const isFullRefund = newRefunded >= payment.amountMinor;
    const newStatus    = isFullRefund ? 'refunded' as const : 'partial_refund' as const;

    // 1. Create auditable refund record in payment_refunds
    await this.refundRepository.create({
      tenantId,
      branchId:             payment.branchId,
      paymentId:            id,
      invoiceId:            payment.invoiceId,
      bookingId:            payment.bookingId ?? null,
      amountMinor:          dto.amountMinor,
      currency:             payment.currency,
      status:               'initiated',
      reason:               dto.reason as import('../entities/payment-refund.entity').RefundReason,
      reasonNotes:          dto.reasonNotes ?? null,
      providerRefundId:     dto.providerRefundId ?? null,
      reconciliationStatus: payment.method === 'cash' ? 'not_applicable' : 'pending',
      createdById:          'system',
    });

    // 2. Update parent payment row
    const updated = await this.paymentRepository.update(id, tenantId, {
      amountRefundedMinor: newRefunded,
      netAmountMinor:      Math.max(0, payment.amountMinor - newRefunded),
      status:              newStatus,
    });

    // 3. Sync invoice balance
    await this.syncInvoicePaid(payment.invoiceId, tenantId);

    await this.eventEmitter.emitAsync(PaymentEvents.STATUS_CHANGED, {
      tenantId, paymentId: id,
      previousStatus: payment.status,
      newStatus,
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  // ── Reconciliation ────────────────────────────────────────────────────────

  async reconcile(id: string, dto: ReconcilePaymentDto, tenantId: string): Promise<PaymentEntity> {
    const payment = await this.findOne(id, tenantId);

    const delta = dto.bankAmountMinor - payment.amountMinor;
    const status = delta === 0 ? 'matched' : 'mismatch';

    return this.paymentRepository.update(id, tenantId, {
      settlementRef:         dto.bankReference,
      reconciliationStatus:  status,
      reconciledAt:          new Date(),
      reconciliationNote:    dto.note ?? null,
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async remove(id: string, tenantId: string): Promise<void> {
    const payment = await this.findOne(id, tenantId);
    if (!['initiated', 'failed', 'cancelled'].includes(payment.status)) {
      throw new ConflictException(`Cannot delete payment in status '${payment.status}'`);
    }
    await this.paymentRepository.softDelete(id, tenantId);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private async syncInvoicePaid(invoiceId: string, tenantId: string): Promise<void> {
    try {
      const settled = await this.paymentRepository.sumSettledForInvoice(invoiceId, tenantId);
      const invoice = await this.invoiceRepository.findById(invoiceId, tenantId);
      if (!invoice) return;

      const balanceDue = Math.max(0, invoice.grandTotalMinor - settled);

      // Derive the correct status from the payment state
      let newStatus = invoice.status;
      if (balanceDue === 0 && settled > 0) {
        // Fully paid
        newStatus = 'paid';
      } else if (settled > 0 && balanceDue > 0) {
        // Partially paid — set regardless of current status (handles refund → partially_paid)
        newStatus = 'partially_paid';
      } else if (settled === 0 && invoice.status === 'paid') {
        // All payments refunded — revert to issued
        newStatus = 'issued';
      }
      // Leave draft/issued/cancelled/voided unchanged unless payment activity warrants it

      await this.invoiceRepository.update(invoiceId, tenantId, {
        amountPaidMinor: settled,
        balanceDueMinor: balanceDue,
        status:          newStatus,
        ...(newStatus === 'paid' && !invoice.paidAt ? { paidAt: new Date() } : {}),
        updatedAt:       new Date(),
      });
    } catch (err) {
      this.logger.warn(`Failed to sync invoice paid amount for ${invoiceId}: ${err}`);
    }
  }

  // ── Legacy update (kept for backward compat) ───────────────────────────────
  async update(id: string, dto: any, tenantId: string): Promise<PaymentEntity> {
    await this.findOne(id, tenantId);
    return this.paymentRepository.update(id, tenantId, dto);
  }
}
