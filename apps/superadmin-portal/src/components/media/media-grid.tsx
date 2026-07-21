'use client';

/**
 * media-grid.tsx
 *
 * MediaGrid — browsable grid/list of tenant media assets.
 *
 * Features:
 *   - Toggle between grid (thumbnails) and list (table) views
 *   - Filter by asset type
 *   - Pagination (25 per page)
 *   - Click to select (Asset Picker mode) or click to open detail
 *   - Empty state with context-aware messaging
 *   - Loading skeleton matching grid shape
 */

import { useState }        from 'react';
import { useQuery }        from '@tanstack/react-query';
import { cn }              from '@/lib/utils/cn';
import {
  fetchMediaAssets,
  formatBytes,
  mediaKeys,
  ASSET_TYPE_OPTIONS,
  type MediaAsset,
  type MediaAssetType,
} from '@/lib/media.api';

// ── Props ─────────────────────────────────────────────────────────────────────

interface MediaGridProps {
  /** When provided, clicking an asset calls onSelect instead of onOpenDetail. */
  onSelect?:     (asset: MediaAsset) => void;
  /** When provided, called when user clicks a non-select action. */
  onOpenDetail?: (asset: MediaAsset) => void;
  /** Pre-filter to a specific asset type (e.g. only 'image' for blog posts). */
  defaultType?:  MediaAssetType | '';
  /** When true, shows only images and hides type filter. */
  imagesOnly?:   boolean;
  className?:    string;
}

const PAGE_SIZE = 25;

// ── Component ─────────────────────────────────────────────────────────────────

export function MediaGrid({
  onSelect,
  onOpenDetail,
  defaultType = '',
  imagesOnly  = false,
  className,
}: MediaGridProps): React.ReactElement {
  const [view,      setView]      = useState<'grid' | 'list'>('grid');
  const [assetType, setAssetType] = useState<MediaAssetType | ''>(
    imagesOnly ? 'image' : defaultType,
  );
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: mediaKeys.list({ page, limit: PAGE_SIZE, assetType: assetType || undefined }),
    queryFn:  () => fetchMediaAssets({ page, limit: PAGE_SIZE, assetType: assetType || undefined }),
    staleTime: 30_000,
  });

  const assets     = data?.data ?? [];
  const total      = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleAssetClick = (asset: MediaAsset) => {
    if (onSelect)     return onSelect(asset);
    if (onOpenDetail) onOpenDetail(asset);
  };

  const typeOptions = imagesOnly
    ? ASSET_TYPE_OPTIONS.filter((o) => o.value === 'image' || o.value === '')
    : ASSET_TYPE_OPTIONS;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Type filter */}
        {!imagesOnly && (
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
            {typeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setAssetType(opt.value); setPage(1); }}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
                  assetType === opt.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {/* Total count */}
          <span className="text-xs text-gray-400">{total} asset{total !== 1 ? 's' : ''}</span>

          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setView('grid')}
              className={cn('p-1.5 transition-colors focus:outline-none',
                view === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600')}
              aria-label="Grid view" aria-pressed={view === 'grid'}
            >
              <GridIcon />
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn('p-1.5 transition-colors focus:outline-none',
                view === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600')}
              aria-label="List view" aria-pressed={view === 'list'}
            >
              <ListIcon />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        view === 'grid' ? <GridSkeleton /> : <ListSkeleton />
      ) : error ? (
        <EmptyState message="Failed to load media assets." />
      ) : assets.length === 0 ? (
        <EmptyState message="No assets found." />
      ) : view === 'grid' ? (
        <GridView assets={assets} onClick={handleAssetClick} selectable={!!onSelect} />
      ) : (
        <ListView assets={assets} onClick={handleAssetClick} selectable={!!onSelect} />
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              type="button" disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <button
              type="button" disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Grid view ─────────────────────────────────────────────────────────────────

function GridView({ assets, onClick, selectable }: {
  assets: MediaAsset[]; onClick: (a: MediaAsset) => void; selectable: boolean;
}) {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
      role="list"
    >
      {assets.map((asset) => (
        <button
          key={asset.id}
          type="button"
          role="listitem"
          onClick={() => onClick(asset)}
          className={cn(
            'group relative aspect-square rounded-lg border border-gray-200 bg-gray-50 overflow-hidden',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
            'hover:border-blue-300 hover:shadow-md transition-all',
            selectable && 'cursor-pointer',
          )}
          aria-label={asset.originalName}
        >
          {asset.assetType === 'image' ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={asset.url}
              alt={asset.altText ?? asset.originalName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 p-2">
              <AssetTypeIcon type={asset.assetType} className="h-8 w-8 text-gray-400" />
              <span className="text-[10px] text-gray-500 text-center truncate w-full px-1">
                {asset.originalName}
              </span>
            </div>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
          {/* Type badge */}
          <span className="absolute top-1 left-1 rounded bg-black/40 px-1.5 py-0.5 text-[9px] font-medium text-white uppercase">
            {asset.assetType}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── List view ─────────────────────────────────────────────────────────────────

function ListView({ assets, onClick, selectable }: {
  assets: MediaAsset[]; onClick: (a: MediaAsset) => void; selectable: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-gray-50">
          <tr>
            {['Preview', 'Name', 'Type', 'Size', 'References', 'Updated', ''].map((h) => (
              <th key={h} scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {assets.map((asset) => (
            <tr
              key={asset.id}
              className={cn('hover:bg-gray-50 transition-colors', selectable && 'cursor-pointer')}
              onClick={selectable ? () => onClick(asset) : undefined}
            >
              <td className="px-4 py-3">
                {asset.assetType === 'image' ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={asset.url}
                    alt={asset.altText ?? asset.originalName}
                    className="h-10 w-10 rounded object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100">
                    <AssetTypeIcon type={asset.assetType} className="h-5 w-5 text-gray-400" />
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                {asset.originalName}
                {asset.altText && (
                  <p className="text-xs text-gray-400 truncate">{asset.altText}</p>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 uppercase">
                  {asset.assetType}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                {formatBytes(asset.sizeBytes)}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {asset.referenceCount}
              </td>
              <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                {new Date(asset.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </td>
              <td className="px-4 py-3">
                {!selectable && (
                  <button
                    type="button"
                    onClick={() => onClick(asset)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    View
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 animate-pulse">
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className="aspect-square rounded-lg bg-gray-200" />
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-14 rounded-lg bg-gray-200" />
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
        <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      </div>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function AssetTypeIcon({ type, className }: { type: MediaAssetType; className?: string }) {
  const paths: Record<MediaAssetType, string> = {
    image:    'M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
    video:    'M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z',
    document: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
    audio:    'M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z',
    other:    'M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13',
  };
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[type] ?? paths.other} />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}
