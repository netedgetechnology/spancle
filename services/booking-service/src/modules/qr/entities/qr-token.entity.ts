import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * QrTokenPurpose — what this token is used for.
 * Extensible: future purposes include access_gate, locker, equipment_room.
 */
export type QrTokenPurpose =
  | 'booking_checkin'
  | 'access_gate'
  | 'locker_unlock'
  | 'equipment_room'
  | 'visitor_pass';

export type QrTokenStatus =
  | 'active'
  | 'used'
  | 'expired'
  | 'revoked';

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
@Entity('qr_tokens')
@Index(['tenantId', 'bookingId'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'expiresAt'])
@Index(['tokenHash'], { unique: true })
export class QrTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  @Column({ name: 'branch_id', type: 'uuid', nullable: false })
  branchId!: string;

  @Column({ name: 'court_id', type: 'uuid', nullable: false })
  courtId!: string;

  /** FK → bookings.id — the booking this token grants access for */
  @Column({ name: 'booking_id', type: 'uuid', nullable: false })
  bookingId!: string;

  /** FK → users.id (identity-service). Null = guest / walk-in */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  // ── Token ────────────────────────────────────────────────────────────────

  /**
   * SHA-256 hex digest of the raw token.
   * Raw token = base64url(tenantId:bookingId:nonce:issuedAt) + HMAC signature.
   * Unique index — used for O(1) lookup on scan.
   */
  @Column({ name: 'token_hash', type: 'varchar', length: 64, nullable: false })
  tokenHash!: string;

  /**
   * HMAC-SHA256 signed payload for offline verification by smart devices.
   * JSON: { tenantId, bookingId, courtId, branchId, purpose, issuedAt, expiresAt }
   * Signed with QR_TOKEN_SECRET env var. Devices hold the public verification key.
   */
  @Column({ name: 'signed_payload', type: 'text', nullable: false })
  signedPayload!: string;

  // ── Purpose + metadata ────────────────────────────────────────────────────

  @Column({
    type: 'enum',
    enum: ['booking_checkin', 'access_gate', 'locker_unlock', 'equipment_room', 'visitor_pass'],
    default: 'booking_checkin',
  })
  purpose!: QrTokenPurpose;

  @Column({
    type: 'enum',
    enum: ['active', 'used', 'expired', 'revoked'],
    default: 'active',
  })
  status!: QrTokenStatus;

  // ── Usage controls ────────────────────────────────────────────────────────

  @Column({ name: 'max_uses', type: 'int', default: 1 })
  maxUses!: number;

  @Column({ name: 'use_count', type: 'int', default: 0 })
  useCount!: number;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: false })
  expiresAt!: Date;

  @Column({ name: 'first_used_at', type: 'timestamptz', nullable: true })
  firstUsedAt!: Date | null;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt!: Date | null;

  // ── Access device metadata (future smart-access integration) ──────────────

  /**
   * ID of the physical access device (door controller, gate, locker unit).
   * Set on first scan. Future: validated against registered_devices table.
   */
  @Column({ name: 'device_id', type: 'varchar', length: 100, nullable: true })
  deviceId!: string | null;

  /**
   * IP of the scanning device / terminal.
   * Supports audit trails when a token is scanned remotely (via mobile app).
   */
  @Column({ name: 'scan_ip', type: 'varchar', length: 45, nullable: true })
  scanIp!: string | null;

  // ── Revocation ────────────────────────────────────────────────────────────

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({ name: 'revoked_by_id', type: 'uuid', nullable: true })
  revokedById!: string | null;

  @Column({ name: 'revoke_reason', type: 'varchar', length: 500, nullable: true })
  revokeReason!: string | null;

  // ── Audit ─────────────────────────────────────────────────────────────────

  @Column({ name: 'issued_by_id', type: 'uuid', nullable: true })
  issuedById!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
