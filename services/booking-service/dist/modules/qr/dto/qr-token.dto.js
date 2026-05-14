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
exports.VerifyQrTokenDto = exports.RevokeQrTokenDto = exports.ScanQrTokenDto = exports.IssueQrTokenDto = void 0;
const class_validator_1 = require("class-validator");
const QR_PURPOSES = [
    'booking_checkin', 'access_gate', 'locker_unlock', 'equipment_room', 'visitor_pass',
];
// ── Issue ─────────────────────────────────────────────────────────────────────
class IssueQrTokenDto {
}
exports.IssueQrTokenDto = IssueQrTokenDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], IssueQrTokenDto.prototype, "bookingId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(QR_PURPOSES, { message: `purpose must be one of: ${QR_PURPOSES.join(', ')}` }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], IssueQrTokenDto.prototype, "purpose", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(5),
    (0, class_validator_1.Max)(10_080),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], IssueQrTokenDto.prototype, "ttlMinutes", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(20),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], IssueQrTokenDto.prototype, "maxUses", void 0);
// ── Scan (from device / mobile app) ──────────────────────────────────────────
class ScanQrTokenDto {
}
exports.ScanQrTokenDto = ScanQrTokenDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", String)
], ScanQrTokenDto.prototype, "token", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], ScanQrTokenDto.prototype, "deviceId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], ScanQrTokenDto.prototype, "deviceFirmware", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ScanQrTokenDto.prototype, "claimedCourtId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ScanQrTokenDto.prototype, "claimedBranchId", void 0);
// ── Revoke ────────────────────────────────────────────────────────────────────
class RevokeQrTokenDto {
}
exports.RevokeQrTokenDto = RevokeQrTokenDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], RevokeQrTokenDto.prototype, "reason", void 0);
// ── Verify (public endpoint — no auth; for smart access device integration) ──
class VerifyQrTokenDto {
}
exports.VerifyQrTokenDto = VerifyQrTokenDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", String)
], VerifyQrTokenDto.prototype, "token", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], VerifyQrTokenDto.prototype, "deviceId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], VerifyQrTokenDto.prototype, "claimedCourtId", void 0);
//# sourceMappingURL=qr-token.dto.js.map