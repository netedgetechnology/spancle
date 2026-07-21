'use client';

/**
 * asset-details.tsx
 *
 * AssetDetails — sidebar/panel showing full metadata for one media asset.
 * Allows editing altText and caption. Shows referenceCount.
 */

import { useState }         from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn }               from '@/lib/utils/cn';
import {
  updateMediaAsset,
  deleteMediaAsset,
  formatBytes,
  mediaKeys,
  type MediaAsset,
} from '@/lib/media.api';

interface AssetDetailsProps {
  asset:     MediaAsset;
  onClose:   () => void;
  onDeleted: () => void;
  className?: string;
}

export function AssetDetails({ asset, onClose, onDeleted, className }: AssetDetailsProps): React.ReactElement {
  const qc = useQueryClient();

  const [altText,  setAltText]  = useState(asset.altText  ?? '');
  const [caption,  setCaption]  = useState(asset.caption  ?? '');
  const [saved,    setSaved]    = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => updateMediaAsset(asset.id, {
      altText:  altText.trim()  || null,
      caption:  caption.trim()  || null,
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: mediaKeys.all() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteMediaAsset(asset.id),
    onSuccess:  () => {
      void qc.invalidateQueries({ queryKey: mediaKeys.all() });
      onDeleted();
    },
  });

  const isImage = asset.assetType === 'image';

  return (
    <aside
      className={cn('flex flex-col h-full overflow-y-auto', className)}
      aria-label="Asset details"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-900 truncate">{asset.originalName}</h3>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 flex-shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Close details"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Preview */}
      <div className="flex-shrink-0 border-b border-gray-100">
        {isImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={asset.url}
            alt={asset.altText ?? asset.originalName}
            className="w-full max-h-56 object-contain bg-gray-50"
          />
        ) : (
          <div className="flex h-36 items-center justify-center bg-gray-50">
            <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Copy URL */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">URL</label>
          <div className="flex gap-1">
            <input
              readOnly
              value={asset.url}
              className="flex-1 min-w-0 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-mono text-gray-600 truncate"
            />
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(asset.url)}
              className="flex-shrink-0 rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              aria-label="Copy URL"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Stats */}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
          {[
            { label: 'Type',       value: asset.assetType   },
            { label: 'Size',       value: formatBytes(asset.sizeBytes) },
            { label: 'MIME type',  value: asset.mimeType    },
            { label: 'References', value: String(asset.referenceCount) },
            ...(isImage && asset.widthPx && asset.heightPx ? [
              { label: 'Dimensions', value: `${asset.widthPx} × ${asset.heightPx}` },
            ] : []),
            { label: 'Uploaded',   value: new Date(asset.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs text-gray-400">{label}</dt>
              <dd className="text-xs font-medium text-gray-700 truncate">{value}</dd>
            </div>
          ))}
        </dl>

        {/* Alt text (images only) */}
        {isImage && (
          <div>
            <label htmlFor={`alt-${asset.id}`} className="block text-xs font-medium text-gray-700 mb-1.5">
              Alt text
              <span className="ml-1 text-gray-400 font-normal">(accessibility)</span>
            </label>
            <input
              id={`alt-${asset.id}`}
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              maxLength={255}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Describe the image for screen readers"
            />
          </div>
        )}

        {/* Caption */}
        <div>
          <label htmlFor={`cap-${asset.id}`} className="block text-xs font-medium text-gray-700 mb-1.5">
            Caption
          </label>
          <textarea
            id={`cap-${asset.id}`}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={2}
            maxLength={500}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Optional caption shown below media"
          />
        </div>

        {/* Save button */}
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {saved ? '✓ Saved' : saveMutation.isPending ? 'Saving…' : 'Save changes'}
        </button>

        {/* Reference count warning */}
        {asset.referenceCount > 0 && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            This asset is referenced by {asset.referenceCount} content item{asset.referenceCount !== 1 ? 's' : ''}.
            Deleting it will break those references.
          </p>
        )}

        {/* Delete */}
        {!delConfirm ? (
          <button
            type="button"
            onClick={() => setDelConfirm(true)}
            className="flex w-full items-center justify-center rounded-lg border border-red-200 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            Delete asset
          </button>
        ) : (
          <div className="rounded-lg border border-red-200 p-3 space-y-2">
            <p className="text-xs text-red-700 font-medium">Delete this asset permanently?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-md bg-red-600 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button
                type="button"
                onClick={() => setDelConfirm(false)}
                className="flex-1 rounded-md border border-gray-200 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
