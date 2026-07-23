import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule }     from '@nestjs/typeorm';
import { ConfigModule }      from '@nestjs/config';
import { WebhookEventEntity }           from './entities/webhook-event.entity';
import { GatewayRegistry }              from './services/gateway-registry.service';
import { PaymentOrchestratorService }   from './services/payment-orchestrator.service';
import { WebhookHandlerService }        from './services/webhook-handler.service';
import { PaymentController }            from './controllers/payment.controller';
import { WebhookController }            from './controllers/webhook.controller';
import { FinanceModule }                from '../finance/finance.module';
import { BookingModule }                from '../booking/booking.module';

/**
 * PaymentModule
 *
 * Owns the payment initiation and webhook processing pipeline.
 * Sits BETWEEN Booking and Finance — neither knows about the other directly.
 *
 * Imports:
 *   FinanceModule — provides PaymentService (initiate/capture/fail)
 *   BookingModule — provides BookingService, BookingAuthorizationService
 *
 * No circular dependencies: BookingModule does not import PaymentModule.
 * Communication from Booking to Payment is via events (EventEmitter2).
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([WebhookEventEntity]),
    FinanceModule,
    forwardRef(() => BookingModule),
  ],
  controllers: [
    PaymentController,
    WebhookController,
  ],
  providers: [
    GatewayRegistry,
    PaymentOrchestratorService,
    WebhookHandlerService,
  ],
  exports: [
    GatewayRegistry,
    PaymentOrchestratorService,
    WebhookHandlerService,
  ],
})
export class PaymentModule {}
