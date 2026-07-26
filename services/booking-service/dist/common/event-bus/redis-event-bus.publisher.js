"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RedisEventBusPublisher_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisEventBusPublisher = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
const event_contracts_1 = require("@spancle/event-contracts");
let RedisEventBusPublisher = RedisEventBusPublisher_1 = class RedisEventBusPublisher {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(RedisEventBusPublisher_1.name);
    }
    onModuleInit() {
        const url = this.config.getOrThrow('REDIS_URL');
        this.client = new ioredis_1.default(url, {
            lazyConnect: true,
            enableReadyCheck: true,
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => Math.min(times * 200, 5_000),
        });
        this.client.on('error', (err) => this.logger.error(`RedisEventBusPublisher connection error: ${err.message}`));
        this.client.on('connect', () => this.logger.log('RedisEventBusPublisher connected'));
        void this.client.connect();
    }
    async onModuleDestroy() {
        await this.client.quit();
    }
    async publish(channel, tenantId, payload, correlationId) {
        const envelope = (0, event_contracts_1.createEnvelope)({
            channel,
            tenantId,
            producer: 'booking-service',
            payload,
            correlationId,
        });
        try {
            const serialised = JSON.stringify(envelope);
            await this.client.publish(channel, serialised);
            this.logger.debug(`Published — channel=${channel} tenant=${tenantId} id=${envelope.id}`);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Publish failed — channel=${channel} tenant=${tenantId}: ${msg}`);
        }
    }
    async publishBookingConfirmed(params) {
        const { correlationId, tenantId, ...rest } = params;
        await this.publish(event_contracts_1.EventRegistry.BOOKING_CONFIRMED, tenantId, rest, correlationId);
    }
    async publishPaymentSucceeded(params) {
        const { correlationId, tenantId, ...rest } = params;
        await this.publish(event_contracts_1.EventRegistry.PAYMENT_SUCCEEDED, tenantId, rest, correlationId);
    }
    async publishBookingCancelled(params) {
        const { correlationId, tenantId, ...rest } = params;
        await this.publish(event_contracts_1.EventRegistry.BOOKING_CANCELLED, tenantId, rest, correlationId);
    }
    async publishPaymentFailed(params) {
        const { correlationId, tenantId, ...rest } = params;
        await this.publish(event_contracts_1.EventRegistry.PAYMENT_FAILED, tenantId, rest, correlationId);
    }
};
exports.RedisEventBusPublisher = RedisEventBusPublisher;
exports.RedisEventBusPublisher = RedisEventBusPublisher = RedisEventBusPublisher_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RedisEventBusPublisher);
//# sourceMappingURL=redis-event-bus.publisher.js.map