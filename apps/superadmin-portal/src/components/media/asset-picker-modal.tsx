'use client';

/**
 * asset-picker-modal.tsx
 *
 * AssetPickerModal — modal that renders MediaGrid for selecting a media asset.
 *
 * Consumed by:
 *   - FeaturedImagePicker (blog, pages, banners)
 *   - Homepage section form (backgroundImageUrl fields)
 *   - Any future media field
 *
 * Props:
 *   onSelect(asset)  — called when user picks an asset. Modal closes automatically.
 *   onClose()        — called when user dismisses modal.
 *   imagesOnly       — restricts grid to image assets (default: false)
 *   title            — modal heading
 */

import { useEffect }  from 'react';
import { MediaGrid }  from './media-grid';
import { cn }         from '@/lib/utils/cn';
import type { MediaAsset } from '@/lib/media.api';

interface AssetPickerModalProps {
  isOpen:      boolean;
  onClose:     () => void;
  onSelect:    (asset: MediaAsset) => void;
  imagesOnly?: boolean;
  title?:      string;
}

export function AssetPickerModal({
  isOpen,
  onClose,
  onSelect,
  imagesOnly = false,
  title      = 'Select media asset',
}: AssetPickerModalProps): React.ReactElement | null {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className={cn(
        'relative z-10 flex flex-col w-full max-w-5xl rounded-2xl bg-white shadow-2xl',
        'max-h-[90vh]',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-xs text-gray-500 mb-4">
            Click an asset to select it.
            {imagesOnly ? ' Showing images only.' : ''}
          </p>
          <MediaGrid
            onSelect={(asset) => { onSelect(asset); onClose(); }}
            imagesOnly={imagesOnly}
          />
        </div>
      </div>
    </div>
  );
}
