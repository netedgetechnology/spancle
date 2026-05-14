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
exports.QrTokenEntity = void 0;
const typeorm_1 = require("typeorm");
/**
 * QrTokenEntity — an issued, single-use (or limited-use) QR token.
 *
 * Design:
 *   - tokenHash: SHA-256 of the raw token string — never stored in plain text.
 *     The raw token is returned once at generation time and never persisted.
 *
 *   - payload: JSONB blob encrypted/signed at the application layer.
 *     Contains: bookingId, tenantId, courtId, purpose, issuedAt, expiresAt.
 *     Smart access devices decode this to authorise entry without a DB call.
 *
 *   - maxUses: supports single-use (1) and multi-use (e.g. recurring group sessions).
 *     Default 1 for booking check-in.
 *
 *   - deviceId: ID of the smart access device that last scanned this token.
 *     Null until first scan. Future: cross-reference against door_controllers table.
 *
 * Table: qr_tokens
 * Audit: INSERT only for used_at / scan history; no UPDATE on the main record after issue.
 */
let QrTokenEntity = class QrTokenEntity {
};
exports.QrTokenEntity = QrTokenEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], QrTokenEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], QrTokenEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'branch_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], QrTokenEntity.prototype, "branchId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'court_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], QrTokenEntity.prototype, "courtId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'booking_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], QrTokenEntity.prototype, "bookingId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], QrTokenEntity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'token_hash', type: 'varchar', length: 64, nullable: false }),
    __metadata("design:type", String)
], QrTokenEntity.prototype, "tokenHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'signed_payload', type: 'text', nullable: false }),
    __metadata("design:type", String)
], QrTokenEntity.prototype, "signedPayload", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['booking_checkin', 'access_gate', 'locker_unlock', 'equipment_room', 'visitor_pass'],
        default: 'booking_checkin',
    }),
    __metadata("design:type", String)
], QrTokenEntity.prototype, "purpose", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['active', 'used', 'expired', 'revoked'],
        default: 'active',
    }),
    __metadata("design:type", String)
], QrTokenEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_uses', type: 'int', default: 1 }),
    __metadata("design:type", Number)
], QrTokenEntity.prototype, "maxUses", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'use_count', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], QrTokenEntity.prototype, "useCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_at', type: 'timestamptz', nullable: false }),
    __metadata("design:type", Date)
], QrTokenEntity.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'first_used_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], QrTokenEntity.prototype, "firstUsedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_used_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], QrTokenEntity.prototype, "lastUsedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'device_id', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], QrTokenEntity.prototype, "deviceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'scan_ip', type: 'varchar', length: 45, nullable: true }),
    __metadata("design:type", Object)
], QrTokenEntity.prototype, "scanIp", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'revoked_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], QrTokenEntity.prototype, "revokedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'revoked_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], QrTokenEntity.prototype, "revokedById", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'revoke_reason', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], QrTokenEntity.prototype, "revokeReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'issued_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], QrTokenEntity.prototype, "issuedById", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], QrTokenEntity.prototype, "createdAt", void 0);
exports.QrTokenEntity = QrTokenEntity = __decorate([
    (0, typeorm_1.Entity)('qr_tokens'),
    (0, typeorm_1.Index)(['tenantId', 'bookingId']),
    (0, typeorm_1.Index)(['tenantId', 'status']),
    (0, typeorm_1.Index)(['tenantId', 'expiresAt']),
    (0, typeorm_1.Index)(['tokenHash'], { unique: true })
], QrTokenEntity);
//# sourceMappingURL=qr-token.entity.js.map