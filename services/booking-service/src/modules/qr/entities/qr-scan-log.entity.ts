import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type ScanOutcome =
  | 'granted'          // token valid, booking confirmed — access permitted
  | 'denied_expired'   // token past expiresAt
  | 'denied_revoked'   // token explicitly revoked
  | 'denied_used'      // maxUses exceeded
  | 'denied_mismatch'  // court/branch mismatch with device claim
  | 'denied_not_found' // tokenHash not in DB
  | 'denied_status'    // booking not in a state that allows check-in
  | 'denied_too_early' // booking startAt not yet within check-in window
  | 'error';           // unexpected service error

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
@Entity('qr_scan_logs')
@Index(['tenantId', 'bookingId'])
@Index(['tenantId', 'tokenId'])
@Index(['tenantId', 'outcome'])
@Index(['tenantId', 'createdAt'])
@Index(['deviceId'])
export class QrScanLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /** The token record that was scanned — null if tokenHash not found */
  @Column({ name: 'token_id', type: 'uuid', nullable: true })
  tokenId!: string | null;

  /** Raw hash presented by scanner — always stored for denied_not_found cases */
  @Column({ name: 'token_hash_presented', type: 'varchar', length: 64, nullable: false })
  tokenHashPresented!: string;

  @Column({ name: 'booking_id', type: 'uuid', nullable: true })
  bookingId!: string | null;

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId!: string | null;

  @Column({ name: 'court_id', type: 'uuid', nullable: true })
  courtId!: string | null;

  @Column({
    type: 'enum',
    enum: [
      'granted', 'denied_expired', 'denied_revoked', 'denied_used',
      'denied_mismatch', 'denied_not_found', 'denied_status',
      'denied_too_early', 'error',
    ],
  })
  outcome!: ScanOutcome;

  /** Human-readable denial reason for device display */
  @Column({ name: 'denial_reason', type: 'varchar', length: 500, nullable: true })
  denialReason!: string | null;

  /** ID of the physical device/controller that performed the scan */
  @Column({ name: 'device_id', type: 'varchar', length: 100, nullable: true })
  deviceId!: string | null;

  /** Device-reported firmware version — for smart-access compatibility tracking */
  @Column({ name: 'device_firmware', type: 'varchar', length: 50, nullable: true })
  deviceFirmware!: string | null;

  @Column({ name: 'scan_ip', type: 'varchar', length: 45, nullable: true })
  scanIp!: string | null;

  /** Duration of the verification in milliseconds */
  @Column({ name: 'verification_ms', type: 'int', nullable: true })
  verificationMs!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
