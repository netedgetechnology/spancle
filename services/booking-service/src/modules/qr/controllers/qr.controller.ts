import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { BookingActor, type BookingActorContext } from '../../../common/decorators/current-user.decorator';
import { Roles, Public }      from '../../../common/decorators/roles.decorator';
import { TenantGuard, RbacGuard } from '../../booking/guards/booking.guard';
import { AuditInterceptor }        from '../../../common/interceptors/audit.interceptor';
import { Reflector }               from '@nestjs/core';

import { QrGenerationService } from '../services/qr-generation.service';
import { QrValidationService } from '../services/qr-validation.service';
import { IssueQrTokenDto, ScanQrTokenDto, RevokeQrTokenDto, VerifyQrTokenDto } from '../dto/qr-token.dto';
import type { Request } from 'express';
import { Req } from '@nestjs/common';

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
@Controller('qr')
@UseInterceptors(AuditInterceptor)
export class QrController {
  constructor(
    private readonly generationService:  QrGenerationService,
    private readonly validationService:  QrValidationService,
  ) {}

  // ── Issue ──────────────────────────────────────────────────────────────────

  @Post('issue')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(TenantGuard, RbacGuard)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  issue(
    @Body() dto: IssueQrTokenDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ) {
    return this.generationService.issue(dto, tenant.tenantId, actor.actorId);
  }

  // ── Scan (authenticated staff / mobile app) ────────────────────────────────

  @Post('scan')
  @HttpCode(HttpStatus.OK)
  @UseGuards(TenantGuard, RbacGuard)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'COACH')
  scan(
    @Body() dto: ScanQrTokenDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
    @Req() req: Request,
  ) {
    const scanIp = (req.headers['x-forwarded-for'] as string | undefined)
      ?.split(',')[0]?.trim() ?? req.ip ?? null;

    return this.validationService.scan(dto, tenant.tenantId, actor.actorId, scanIp);
  }

  // ── Verify (public — smart access devices) ────────────────────────────────

  /**
   * Public verification endpoint — no session required.
   * Intended for smart door controllers and kiosk terminals.
   *
   * Returns: { valid, bookingId, courtId, purpose, expiresAt, denialReason }
   * Does NOT trigger check-in. Does NOT write to booking_logs.
   * Rate-limited at the API Gateway layer.
   */
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'COACH', 'RECEPTIONIST')
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @Public()
  verify(
    @Body() dto: VerifyQrTokenDto,
    @Req() req: Request,
  ) {
    const scanIp = (req.headers['x-forwarded-for'] as string | undefined)
      ?.split(',')[0]?.trim() ?? req.ip ?? null;

    return this.validationService.verify(dto, scanIp);
  }

  // ── Revoke ────────────────────────────────────────────────────────────────

  @Post(':tokenId/revoke')
  @HttpCode(HttpStatus.OK)
  @UseGuards(TenantGuard, RbacGuard)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  revoke(
    @Param('tokenId', ParseUUIDPipe) tokenId: string,
    @Body() dto: RevokeQrTokenDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ) {
    return this.generationService.revoke(tokenId, dto, tenant.tenantId, actor.actorId);
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  @Get(':tokenId')
  @UseGuards(TenantGuard, RbacGuard)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findOne(
    @Param('tokenId', ParseUUIDPipe) tokenId: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.generationService.findById(tokenId, tenant.tenantId);
  }

  @Get('booking/:bookingId')
  @UseGuards(TenantGuard, RbacGuard)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findByBooking(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.generationService.findByBooking(bookingId, tenant.tenantId);
  }

  @Get('booking/:bookingId/logs')
  @UseGuards(TenantGuard, RbacGuard)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  getScanLogs(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.validationService.getScanLogs(bookingId, tenant.tenantId);
  }

  @Get('device/:deviceId/logs')
  @UseGuards(TenantGuard, RbacGuard)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  getDeviceScanLogs(
    @Param('deviceId') deviceId: string,
    @TenantCtx() tenant: TenantContext,
    @Query('from') from?: string,
    @Query('to')   to?:   string,
  ) {
    return this.validationService.getDeviceScanLogs(
      deviceId,
      tenant.tenantId,
      from ? new Date(from) : undefined,
      to   ? new Date(to)   : undefined,
    );
  }
}
