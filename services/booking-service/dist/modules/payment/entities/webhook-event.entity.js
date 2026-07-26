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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookEventEntity = void 0;
const typeorm_1 = require("typeorm");
let WebhookEventEntity = class WebhookEventEntity {
};
exports.WebhookEventEntity = WebhookEventEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], WebhookEventEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], WebhookEventEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'provider', type: 'varchar', length: 30, nullable: false }),
    __metadata("design:type", String)
], WebhookEventEntity.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'provider_event_id', type: 'varchar', length: 255, nullable: false }),
    __metadata("design:type", String)
], WebhookEventEntity.prototype, "providerEventId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'event_type', type: 'varchar', length: 100, nullable: false }),
    __metadata("design:type", String)
], WebhookEventEntity.prototype, "eventType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'raw_payload', type: 'jsonb', nullable: false }),
    __metadata("design:type", Object)
], WebhookEventEntity.prototype, "rawPayload", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'signature_header', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], WebhookEventEntity.prototype, "signatureHeader", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status', type: 'varchar', length: 20, nullable: false, default: 'processing' }),
    __metadata("design:type", String)
], WebhookEventEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_message', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], WebhookEventEntity.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'linked_payment_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], WebhookEventEntity.prototype, "linkedPaymentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'source_ip', type: 'varchar', length: 45, nullable: true }),
    __metadata("design:type", Object)
], WebhookEventEntity.prototype, "sourceIp", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], WebhookEventEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'processed_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], WebhookEventEntity.prototype, "processedAt", void 0);
exports.WebhookEventEntity = WebhookEventEntity = __decorate([
    (0, typeorm_1.Entity)('payment_webhook_events'),
    (0, typeorm_1.Index)(['tenantId', 'provider', 'providerEventId'], { unique: true }),
    (0, typeorm_1.Index)(['tenantId', 'provider', 'status']),
    (0, typeorm_1.Index)(['tenantId', 'createdAt'])
], WebhookEventEntity);
//# sourceMappingURL=webhook-event.entity.js.map