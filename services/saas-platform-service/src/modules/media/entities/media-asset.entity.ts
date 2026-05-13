import {
  Column, CreateDateColumn, DeleteDateColumn,
  Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';

export type MediaAssetType = 'image' | 'video' | 'document' | 'audio' | 'other';
export type MediaAssetDriver = 'local' | 's3' | 'gcs';

/**
 * MediaAssetEntity — a tenant-scoped file in the CMS media library.
 *
 * Storage is abstracted via a driver field — the same entity supports
 * local filesystem, S3, and GCS paths. The URL column always contains
 * the publicly accessible URL regardless of driver.
 *
 * Tenant isolation:
 *   - All assets are scoped to tenantId
 *   - URL paths include the tenantId prefix: /media/{tenantId}/{filename}
 *   - Direct file access must be validated against the asset's tenantId
 *
 * referenceCount:
 *   Incremented when a Page/Blog/Banner references this asset.
 *   Decremented when the reference is removed.
 *   Assets with referenceCount = 0 are candidates for GC cleanup.
 */
@Entity('cms_media_assets')
@Index(['tenantId', 'mimeType'])
@Index(['tenantId', 'assetType'])
@Index(['tenantId', 'isDeleted'])
export class MediaAssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /** Original filename as uploaded by the user */
  @Column({ name: 'original_name', type: 'varchar', length: 255, nullable: false })
  originalName!: string;

  /** Stored filename — deduplicated, slugified, unique within tenant */
  @Column({ name: 'stored_name', type: 'varchar', length: 255, nullable: false })
  storedName!: string;

  /** MIME type: image/jpeg, application/pdf, video/mp4, etc. */
  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: false })
  mimeType!: string;

  @Column({
    name: 'asset_type',
    type: 'enum',
    enum: ['image', 'video', 'document', 'audio', 'other'],
    default: 'other',
  })
  assetType!: MediaAssetType;

  /** File size in bytes */
  @Column({ name: 'size_bytes', type: 'bigint', nullable: false })
  sizeBytes!: number;

  /** Publicly accessible URL */
  @Column({ type: 'varchar', length: 2048, nullable: false })
  url!: string;

  /** Internal storage path (relative to storage root) */
  @Column({ name: 'storage_path', type: 'varchar', length: 2048, nullable: false })
  storagePath!: string;

  @Column({
    type: 'enum',
    enum: ['local', 's3', 'gcs'],
    default: 'local',
  })
  driver!: MediaAssetDriver;

  /** Alt text for accessibility */
  @Column({ name: 'alt_text', type: 'varchar', length: 255, nullable: true })
  altText!: string | null;

  /** Caption displayed below media in CMS */
  @Column({ type: 'varchar', length: 500, nullable: true })
  caption!: string | null;

  // ── Image-specific fields ───────────────────────────────────────────────────

  @Column({ name: 'width_px', type: 'int', nullable: true })
  widthPx!: number | null;

  @Column({ name: 'height_px', type: 'int', nullable: true })
  heightPx!: number | null;

  /** Base64 thumbnail for blur-up loading */
  @Column({ name: 'blur_hash', type: 'varchar', length: 100, nullable: true })
  blurHash!: string | null;

  // ── Reference tracking ──────────────────────────────────────────────────────

  /** How many CMS content items reference this asset */
  @Column({ name: 'reference_count', type: 'int', default: 0 })
  referenceCount!: number;

  /** User who uploaded the file */
  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedBy!: string | null;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
