import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const QR_PURPOSES = [
  'booking_checkin', 'access_gate', 'locker_unlock', 'equipment_room', 'visitor_pass',
] as const;

// ── Issue ─────────────────────────────────────────────────────────────────────

export class IssueQrTokenDto {
  /** Target booking — validated to belong to tenant in service layer */
  @IsUUID()
  bookingId!: string;

  @IsEnum(QR_PURPOSES, { message: `purpose must be one of: ${QR_PURPOSES.join(', ')}` })
  @IsOptional()
  purpose?: typeof QR_PURPOSES[number];

  /**
   * Token validity window in minutes from now.
   * Default: 1440 (24 hours).
   * Max:    10080 (7 days — for recurring series multi-day passes).
   */
  @IsInt()
  @Min(5)
  @Max(10_080)
  @IsOptional()
  ttlMinutes?: number;

  /**
   * How many times the token may be successfully scanned.
   * Default: 1 (single check-in).
   * Use > 1 for group sessions or recurring slot passes.
   */
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  maxUses?: number;
}

// ── Scan (from device / mobile app) ──────────────────────────────────────────

export class ScanQrTokenDto {
  /** The raw token string returned at issuance (NOT the hash) */
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  token!: string;

  /**
   * Physical device ID of the scanner.
   * Required for smart-access devices; optional for mobile app scans.
   * Future: cross-referenced against registered_devices table.
   */
  @IsString()
  @IsOptional()
  @MaxLength(100)
  deviceId?: string;

  /**
   * Device firmware version — used to detect outdated scanners.
   * Future: devices below minimum firmware version trigger a soft warning.
   */
  @IsString()
  @IsOptional()
  @MaxLength(50)
  deviceFirmware?: string;

  /**
   * Court the device claims to be installed at.
   * Validated against the token's courtId to prevent cross-court access.
   * Required for access_gate purpose.
   */
  @IsUUID()
  @IsOptional()
  claimedCourtId?: string;

  @IsUUID()
  @IsOptional()
  claimedBranchId?: string;
}

// ── Revoke ────────────────────────────────────────────────────────────────────

export class RevokeQrTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

// ── Verify (public endpoint — no auth; for smart access device integration) ──

export class VerifyQrTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  token!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  deviceId?: string;

  @IsUUID()
  @IsOptional()
  claimedCourtId?: string;
}
