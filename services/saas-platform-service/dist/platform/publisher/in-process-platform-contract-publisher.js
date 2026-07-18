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
var InProcessPlatformContractPublisher_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InProcessPlatformContractPublisher = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const platform_contract_serializer_1 = require("../serialization/platform-contract-serializer");
const platform_event_types_1 = require("../events/platform-event-types");
let InProcessPlatformContractPublisher = InProcessPlatformContractPublisher_1 = class InProcessPlatformContractPublisher {
    constructor(eventEmitter) {
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(InProcessPlatformContractPublisher_1.name);
    }
    async publish(envelope) {
        const publishedAt = new Date().toISOString();
        const validation = this.validate(envelope);
        if (!validation.valid) {
            this.logger.error(`publish: invalid envelope ${envelope.contractId} — ${validation.errors.join('; ')}`);
            await this.eventEmitter.emitAsync(platform_event_types_1.PlatformEventTypes.COMMERCIAL_CONTRACT_FAILED, {
                contractId: envelope.contractId,
                errors: validation.errors,
                occurredAt: publishedAt,
            });
            return {
                success: false,
                contractId: envelope.contractId,
                publishedAt,
                error: validation.errors.join('; '),
            };
        }
        try {
            await this.eventEmitter.emitAsync(envelope.eventType, envelope);
            await this.eventEmitter.emitAsync(platform_event_types_1.PlatformEventTypes.COMMERCIAL_CONTRACT_PUBLISHED, {
                contractId: envelope.contractId,
                contractVersion: envelope.contractVersion,
                eventType: envelope.eventType,
                deduplicationKey: envelope.deduplicationKey,
                publishedAt,
            });
            this.logger.debug(`publish: ${envelope.eventType} contractId=${envelope.contractId} ` +
                `dedup=${envelope.deduplicationKey}`);
            return {
                success: true,
                contractId: envelope.contractId,
                publishedAt,
            };
        }
        catch (err) {
            const msg = err.message ?? 'unknown';
            this.logger.error(`publish: emitAsync failed for ${envelope.contractId} — ${msg}`);
            return {
                success: false,
                contractId: envelope.contractId,
                publishedAt,
                error: msg,
            };
        }
    }
    validate(envelope) {
        return platform_contract_serializer_1.PlatformContractSerializer.validate(envelope);
    }
    serialize(envelope) {
        return platform_contract_serializer_1.PlatformContractSerializer.serialize(envelope);
    }
};
exports.InProcessPlatformContractPublisher = InProcessPlatformContractPublisher;
exports.InProcessPlatformContractPublisher = InProcessPlatformContractPublisher = InProcessPlatformContractPublisher_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2])
], InProcessPlatformContractPublisher);
//# sourceMappingURL=in-process-platform-contract-publisher.js.map