import { type TenantContext } from '../../../common/decorators/tenant.decorator';
import { type BookingActorContext } from '../../../common/decorators/current-user.decorator';
import { QrGenerationService } from '../services/qr-generation.service';
import { QrValidationService } from '../services/qr-validation.service';
import { IssueQrTokenDto, ScanQrTokenDto, RevokeQrTokenDto, VerifyQrTokenDto } from '../dto/qr-token.dto';
import type { Request } from 'express';
/**
 * QrController — QR token lifecycle and booking verification APIs.
 *
 * Routes:
 *   POST  /qr/issue                      Issue token for a booking
 *   POST  /qr/scan                       Scan a QR token (authenticated — staff/admin)
 *   POST  /qr/verify                     Verify token (public — smart access devices)
 *   POST  /qr/:tokenId/revoke            Revoke a specific token
 *   GET   /qr/:tokenId                   Get token metadata (no rawToken)
 *   GET   /qr/booking/:bookingId         List all tokens for a booking
 *   GET   /qr/booking/:bookingId/logs    Scan logs for a booking
 *   GET   /qr/device/:deviceId/logs      Scan logs by device ID
 *
 * RBAC:
 *   issue   → TENANT_ADMIN, TENANT_MANAGER
 *   scan    → TENANT_ADMIN, TENANT_MANAGER, COACH
 *   verify  → @Public (rate-limited at gateway)
 *   revoke  → TENANT_ADMIN, TENANT_MANAGER
 *   read    → TENANT_ADMIN, TENANT_MANAGER
 */
export declare class QrController {
    private readonly generationService;
    private readonly validationService;
    constructor(generationService: QrGenerationService, validationService: QrValidationService);
    issue(dto: IssueQrTokenDto, tenant: TenantContext, actor: BookingActorContext): Promise<import("../services/qr-generation.service").IssuedQrToken>;
    scan(dto: ScanQrTokenDto, tenant: TenantContext, actor: BookingActorContext, req: Request): Promise<import("../services/qr-validation.service").ScanResult>;
    /**
     * Public verification endpoint — no session required.
     * Intended for smart door controllers and kiosk terminals.
     *
     * Returns: { valid, bookingId, courtId, purpose, expiresAt, denialReason }
     * Does NOT trigger check-in. Does NOT write to booking_logs.
     * Rate-limited at the API Gateway layer.
     */
    verify(dto: VerifyQrTokenDto, req: Request): Promise<import("../services/qr-validation.service").VerifyResult>;
    revoke(tokenId: string, dto: RevokeQrTokenDto, tenant: TenantContext, actor: BookingActorContext): Promise<void>;
    findOne(tokenId: string, tenant: TenantContext): Promise<import("../entities/qr-token.entity").QrTokenEntity>;
    findByBooking(bookingId: string, tenant: TenantContext): Promise<import("../entities/qr-token.entity").QrTokenEntity[]>;
    getScanLogs(bookingId: string, tenant: TenantContext): Promise<import("../entities/qr-scan-log.entity").QrScanLogEntity[]>;
    getDeviceScanLogs(deviceId: string, tenant: TenantContext, from?: string, to?: string): Promise<import("../entities/qr-scan-log.entity").QrScanLogEntity[]>;
}
//# sourceMappingURL=qr.controller.d.ts.map