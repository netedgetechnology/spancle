/**
 * media.api.ts
 *
 * Typed API client for the CMS Media Library.
 * Routes to: saas-platform-service /api/v1/cms/media
 *
 * Upload status:
 *   The backend multipart upload endpoint is deferred (Sprint 3).
 *   POST /cms/media/register accepts metadata for already-uploaded files only.
 *   The FEATURE_UPLOAD_ENABLED flag gates the upload UI — when false,
 *   the register form is shown as the only ingestion path.
 */

import { apiClient } from '@/lib/api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MediaAssetType = 'image' | 'video' | 'document' | 'audio' | 'other';
export type MediaDriver     = 'local' | 's3' | 'gcs';

export interface MediaAsset {
  id:             string;
  tenantId:       string;
  originalName:   string;
  storedName:     string;
  mimeType:       string;
  assetType:      MediaAssetType;
  sizeBytes:      number;
  url:            string;
  storagePath:    string;
  driver:         MediaDriver;
  altText:        string | null;
  caption:        string | null;
  widthPx:        number | null;
  heightPx:       number | null;
  blurHash:       string | null;
  referenceCount: number;
  uploadedBy:     string | null;
  isDeleted:      boolean;
  createdAt:      string;
  updatedAt:      string;
}

export interface MediaListResponse {
  data:  MediaAsset[];
  total: number;
}

export interface MediaFilters {
  page?:      number;
  limit?:     number;
  assetType?: MediaAssetType | '';
}

export interface RegisterMediaInput {
  originalName: string;
  storedName:   string;
  mimeType:     string;
  assetType?:   MediaAssetType;
  sizeBytes:    number;
  url:          string;
  storagePath:  string;
  driver?:      MediaDriver;
  altText?:     string;
  caption?:     string;
  widthPx?:     number;
  heightPx?:    number;
}

export interface UpdateMediaInput {
  altText?:  string | null;
  caption?:  string | null;
}

// ── Feature flag ──────────────────────────────────────────────────────────────

/**
 * FEATURE_UPLOAD_ENABLED
 *
 * When true: Show upload UI (Sprint 3 — multipart endpoint not yet implemented).
 * When false: Show metadata-registration form only, with a notice explaining
 *             that direct upload requires Sprint 3 backend work.
 *
 * Set NEXT_PUBLIC_MEDIA_UPLOAD_ENABLED=true in .env to enable upload UI
 * when the backend Sprint 3 upload endpoint ships.
 */
export const FEATURE_UPLOAD_ENABLED =
  process.env['NEXT_PUBLIC_MEDIA_UPLOAD_ENABLED'] === 'true';

// ── Query key factory ─────────────────────────────────────────────────────────

export const mediaKeys = {
  all:    () => ['cms-media'] as const,
  list:   (f: MediaFilters) => [...mediaKeys.all(), 'list', f] as const,
  detail: (id: string)      => [...mediaKeys.all(), id]    as const,
} as const;

// ── API functions ─────────────────────────────────────────────────────────────

export async function fetchMediaAssets(filters: MediaFilters = {}): Promise<MediaListResponse> {
  const params: Record<string, string | number> = {};
  if (filters.page)                 params['page']      = filters.page;
  if (filters.limit)                params['limit']     = filters.limit;
  if (filters.assetType)            params['assetType'] = filters.assetType;
  const res = await apiClient.get<MediaListResponse>('/api/v1/cms/media', { params });
  return res.data;
}

export async function fetchMediaAsset(id: string): Promise<MediaAsset> {
  const res = await apiClient.get<MediaAsset>(`/api/v1/cms/media/${id}`);
  return res.data;
}

export async function registerMediaAsset(input: RegisterMediaInput): Promise<MediaAsset> {
  const res = await apiClient.post<MediaAsset>('/api/v1/cms/media/register', input);
  return res.data;
}

export async function updateMediaAsset(id: string, input: UpdateMediaInput): Promise<MediaAsset> {
  const res = await apiClient.patch<MediaAsset>(`/api/v1/cms/media/${id}`, input);
  return res.data;
}

export async function deleteMediaAsset(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/cms/media/${id}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function assetTypeLabel(type: MediaAssetType): string {
  const labels: Record<MediaAssetType, string> = {
    image:    'Image',
    video:    'Video',
    document: 'Document',
    audio:    'Audio',
    other:    'Other',
  };
  return labels[type] ?? type;
}

export const ASSET_TYPE_OPTIONS: { value: MediaAssetType | ''; label: string }[] = [
  { value: '',         label: 'All types' },
  { value: 'image',   label: 'Images'    },
  { value: 'video',   label: 'Videos'    },
  { value: 'document',label: 'Documents' },
  { value: 'audio',   label: 'Audio'     },
  { value: 'other',   label: 'Other'     },
];
