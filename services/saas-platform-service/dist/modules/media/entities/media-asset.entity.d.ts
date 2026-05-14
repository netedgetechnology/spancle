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
export declare class MediaAssetEntity {
    id: string;
    tenantId: string;
    /** Original filename as uploaded by the user */
    originalName: string;
    /** Stored filename — deduplicated, slugified, unique within tenant */
    storedName: string;
    /** MIME type: image/jpeg, application/pdf, video/mp4, etc. */
    mimeType: string;
    assetType: MediaAssetType;
    /** File size in bytes */
    sizeBytes: number;
    /** Publicly accessible URL */
    url: string;
    /** Internal storage path (relative to storage root) */
    storagePath: string;
    driver: MediaAssetDriver;
    /** Alt text for accessibility */
    altText: string | null;
    /** Caption displayed below media in CMS */
    caption: string | null;
    widthPx: number | null;
    heightPx: number | null;
    /** Base64 thumbnail for blur-up loading */
    blurHash: string | null;
    /** How many CMS content items reference this asset */
    referenceCount: number;
    /** User who uploaded the file */
    uploadedBy: string | null;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=media-asset.entity.d.ts.map