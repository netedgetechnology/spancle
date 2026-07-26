"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WebhookHandlerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookHandlerService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const crypto = __importStar(require("node:crypto"));
const webhook_event_entity_1 = require("../entities/webhook-event.entity");
const payment_orchestrator_service_1 = require("./payment-orchestrator.service");
let WebhookHandlerService = WebhookHandlerService_1 = class WebhookHandlerService {
    constructor(config, orchestrator, ds) {
        this.config = config;
        this.orchestrator = orchestrator;
        this.ds = ds;
        this.logger = new common_1.Logger(WebhookHandlerService_1.name);
    }
    async handle(params) {
        const { provider, tenantId, rawBody, signature, payload, sourceIp } = params;
        this.verifySignature(provider, rawBody, signature);
        const { eventId, eventType } = this.extractEventMeta(provider, payload);
        let webhookEntity;
        try {
            const repo = this.ds.getRepository(webhook_event_entity_1.WebhookEventEntity);
            webhookEntity = repo.create({
                tenantId,
                provider,
                providerEventId: eventId,
                eventType,
                rawPayload: payload,
                signatureHeader: signature ?? null,
                status: 'processing',
                sourceIp: sourceIp ?? null,
            });
            await repo.save(webhookEntity);
        }
        catch (err) {
            const pgError = err;
            if (pgError.code === '23505') {
                this.logger.warn(`Duplicate webhook ignored — provider=${provider} eventId=${eventId}`);
                return { status: 'duplicate' };
            }
            throw err;
        }
        const actorId = this.config.get('WEBHOOK_SYSTEM_ACTOR_ID', 'system:webhook');
        let linkedPaymentId = null;
        try {
            const result = await this.route(provider, eventType, payload, tenantId, actorId);
            linkedPaymentId = result.financePaymentId ?? null;
            await this.ds.getRepository(webhook_event_entity_1.WebhookEventEntity).update(webhookEntity.id, {
                status: 'processed',
                linkedPaymentId,
                processedAt: new Date(),
            });
            return { status: 'processed' };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Webhook processing failed — ${provider} ${eventType}: ${msg}`);
            await this.ds.getRepository(webhook_event_entity_1.WebhookEventEntity).update(webhookEntity.id, {
                status: 'failed',
                errorMessage: msg.slice(0, 2000),
                processedAt: new Date(),
            });
            throw err;
        }
    }
    verifySignature(provider, rawBody, signature) {
        if (!signature) {
            throw new common_1.BadRequestException('Missing webhook signature header');
        }
        switch (provider) {
            case 'stripe':
                this.verifyStripeSignature(rawBody, signature);
                break;
            case 'razorpay':
                this.verifyRazorpaySignature(rawBody, signature);
                break;
            default:
                throw new common_1.BadRequestException(`Unknown webhook provider: ${provider}`);
        }
    }
    verifyStripeSignature(rawBody, signatureHeader) {
        const secret = this.config.get('STRIPE_WEBHOOK_SECRET');
        if (!secret) {
            this.logger.error('STRIPE_WEBHOOK_SECRET is not set — cannot verify webhooks');
            throw new common_1.BadRequestException('Webhook configuration error');
        }
        const parts = Object.fromEntries(signatureHeader.split(',').map((p) => p.split('=')));
        const timestamp = parseInt(parts['t'] ?? '0', 10);
        const v1sig = parts['v1'];
        if (!v1sig)
            throw new common_1.BadRequestException('Invalid Stripe signature format');
        const toleranceMs = this.config.get('WEBHOOK_TIMESTAMP_TOLERANCE_MS', 300_000);
        if (Math.abs(Date.now() - timestamp * 1000) > toleranceMs) {
            throw new common_1.BadRequestException('Stripe webhook timestamp too old');
        }
        const signed = `${timestamp}.${rawBody.toString('utf8')}`;
        const expected = crypto.createHmac('sha256', secret).update(signed).digest('hex');
        if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(v1sig, 'hex'))) {
            this.logger.warn('Stripe webhook signature mismatch');
            throw new common_1.BadRequestException('Invalid webhook signature');
        }
    }
    verifyRazorpaySignature(rawBody, signature) {
        const secret = this.config.get('RAZORPAY_WEBHOOK_SECRET');
        if (!secret) {
            this.logger.error('RAZORPAY_WEBHOOK_SECRET is not set');
            throw new common_1.BadRequestException('Webhook configuration error');
        }
        const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
        if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))) {
            this.logger.warn('Razorpay webhook signature mismatch');
            throw new common_1.BadRequestException('Invalid webhook signature');
        }
    }
    extractEventMeta(provider, payload) {
        switch (provider) {
            case 'stripe': {
                const id = payload['id'];
                const type = payload['type'];
                if (!id || !type)
                    throw new common_1.BadRequestException('Invalid Stripe event payload');
                return { eventId: id, eventType: type };
            }
            case 'razorpay': {
                const type = payload['event'];
                const rpPayload = payload['payload'];
                const entity = rpPayload?.['payment']?.['entity'];
                const id = entity?.['id'];
                if (!id || !type)
                    throw new common_1.BadRequestException('Invalid Razorpay event payload');
                return { eventId: id, eventType: type };
            }
            default:
                throw new common_1.BadRequestException(`Unknown provider: ${provider}`);
        }
    }
    async route(provider, eventType, payload, tenantId, actorId) {
        switch (provider) {
            case 'stripe':
                return this.routeStripe(eventType, payload, tenantId, actorId);
            case 'razorpay':
                return this.routeRazorpay(eventType, payload, tenantId, actorId);
            default:
                this.logger.warn(`Ignoring event from unknown provider: ${provider}`);
                return {};
        }
    }
    async routeStripe(eventType, payload, tenantId, actorId) {
        const data = payload['data'];
        const obj = data?.['object'];
        const piId = obj?.['id'];
        switch (eventType) {
            case 'payment_intent.succeeded': {
                if (!piId)
                    throw new common_1.BadRequestException('Missing payment_intent id');
                const financePaymentId = await this.resolveFinancePaymentId(piId, tenantId);
                if (!financePaymentId) {
                    this.logger.warn(`No finance payment found for gatewayPaymentId=${piId} — ignoring`);
                    return {};
                }
                await this.orchestrator.handlePaymentSuccess({
                    tenantId,
                    financePaymentId,
                    gatewayPaymentId: piId,
                    capturedMinor: obj?.['amount_received'] ?? 0,
                    actorId,
                });
                return { financePaymentId };
            }
            case 'payment_intent.payment_failed': {
                if (!piId)
                    throw new common_1.BadRequestException('Missing payment_intent id');
                const financePaymentId = await this.resolveFinancePaymentId(piId, tenantId);
                if (!financePaymentId)
                    return {};
                const reason = obj?.['last_payment_error']?.['message'] ?? 'Payment failed';
                await this.orchestrator.handlePaymentFailure({ tenantId, financePaymentId, reason, actorId });
                return { financePaymentId };
            }
            default:
                this.logger.debug(`Stripe event ${eventType} not handled — ignoring`);
                return {};
        }
    }
    async routeRazorpay(eventType, payload, tenantId, actorId) {
        const rpPayload = payload['payload'];
        const entity = rpPayload?.['payment']?.['entity'];
        const paymentId = entity?.['id'];
        switch (eventType) {
            case 'payment.captured': {
                if (!paymentId)
                    throw new common_1.BadRequestException('Missing razorpay payment id');
                const orderId = entity?.['order_id'] ?? paymentId;
                const financePaymentId = await this.resolveFinancePaymentId(orderId, tenantId);
                if (!financePaymentId)
                    return {};
                await this.orchestrator.handlePaymentSuccess({
                    tenantId,
                    financePaymentId,
                    gatewayPaymentId: orderId,
                    capturedMinor: entity?.['amount'] ?? 0,
                    actorId,
                });
                return { financePaymentId };
            }
            case 'payment.failed': {
                if (!paymentId)
                    throw new common_1.BadRequestException('Missing razorpay payment id');
                const orderId = entity?.['order_id'] ?? paymentId;
                const financePaymentId = await this.resolveFinancePaymentId(orderId, tenantId);
                if (!financePaymentId)
                    return {};
                const reason = entity?.['error_description'] ?? 'Payment failed';
                await this.orchestrator.handlePaymentFailure({ tenantId, financePaymentId, reason, actorId });
                return { financePaymentId };
            }
            default:
                this.logger.debug(`Razorpay event ${eventType} not handled — ignoring`);
                return {};
        }
    }
    async resolveFinancePaymentId(gatewayPaymentId, tenantId) {
        const rows = await this.ds.query(`SELECT id FROM finance_payments
       WHERE tenant_id = $1 AND gateway_payment_id = $2
       LIMIT 1`, [tenantId, gatewayPaymentId]);
        return rows[0]?.id;
    }
};
exports.WebhookHandlerService = WebhookHandlerService;
exports.WebhookHandlerService = WebhookHandlerService = WebhookHandlerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_2.InjectDataSource)()),
    __metadata("design:paramtypes", [config_1.ConfigService,
        payment_orchestrator_service_1.PaymentOrchestratorService,
        typeorm_1.DataSource])
], WebhookHandlerService);
//# sourceMappingURL=webhook-handler.service.js.map