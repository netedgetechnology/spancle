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
exports.QrScanLogEntity = void 0;
const typeorm_1 = require("typeorm");
/**
 * QrScanLogEntity — immutable audit log of every QR scan event.
 * INSERT only — no UPDATE, no soft-delete.
 *
 * Used for:
 *   - Compliance audit of physical access events
 *   - Debugging scanner/device misconfigurations
 *   - Fraud detection (unusual scan patterns)
 *   - Smart access device performance monitoring
 *
 * Table: qr_scan_logs
 */
let QrScanLogEntity = class QrScanLogEntity {
};
exports.QrScanLogEntity = QrScanLogEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], QrScanLogEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], QrScanLogEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'token_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], QrScanLogEntity.prototype, "tokenId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'token_hash_presented', type: 'varchar', length: 64, nullable: false }),
    __metadata("design:type", String)
], QrScanLogEntity.prototype, "tokenHashPresented", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'booking_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], QrScanLogEntity.prototype, "bookingId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'branch_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], QrScanLogEntity.prototype, "branchId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'court_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], QrScanLogEntity.prototype, "courtId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: [
            'granted', 'denied_expired', 'denied_revoked', 'denied_used',
            'denied_mismatch', 'denied_not_found', 'denied_status',
            'denied_too_early', 'error',
        ],
    }),
    __metadata("design:type", String)
], QrScanLogEntity.prototype, "outcome", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'denial_reason', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], QrScanLogEntity.prototype, "denialReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'device_id', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], QrScanLogEntity.prototype, "deviceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'device_firmware', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], QrScanLogEntity.prototype, "deviceFirmware", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'scan_ip', type: 'varchar', length: 45, nullable: true }),
    __metadata("design:type", Object)
], QrScanLogEntity.prototype, "scanIp", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'verification_ms', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], QrScanLogEntity.prototype, "verificationMs", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], QrScanLogEntity.prototype, "createdAt", void 0);
exports.QrScanLogEntity = QrScanLogEntity = __decorate([
    (0, typeorm_1.Entity)('qr_scan_logs'),
    (0, typeorm_1.Index)(['tenantId', 'bookingId']),
    (0, typeorm_1.Index)(['tenantId', 'tokenId']),
    (0, typeorm_1.Index)(['tenantId', 'outcome']),
    (0, typeorm_1.Index)(['tenantId', 'createdAt']),
    (0, typeorm_1.Index)(['deviceId'])
], QrScanLogEntity);
//# sourceMappingURL=qr-scan-log.entity.js.map