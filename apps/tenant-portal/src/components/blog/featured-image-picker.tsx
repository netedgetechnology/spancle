'use client';

import { useState }           from 'react';
import { Button }             from '@spancle/ui-kit';
import { cn }                 from '@/lib/utils/cn';
import { AssetPickerModal }   from '@/components/media/asset-picker-modal';
import type { MediaAsset }    from '@/lib/media.api';

interface FeaturedImagePickerProps {
  value:      string | null | undefined;
  onChange:   (url: string | null) => void;
  className?: string;
}

/**
 * FeaturedImagePicker — select a featured image from the Media Library
 * or paste a URL directly.
 *
 * Sprint 3: Direct-upload path is blocked behind the FEATURE_UPLOAD_ENABLED flag
 * (see media.api.ts). This component uses the Asset Picker modal to browse
 * cms_media_assets, and falls back to manual URL entry.
 */
export function FeaturedImagePicker({
  value,
  onChange,
  className,
}: FeaturedImagePickerProps): React.ReactElement {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [imgError,   setImgError]   = useState(false);
  const [imgLoaded,  setImgLoaded]  = useState(false);

  const handleSelect = (asset: MediaAsset) => {
    onChange(asset.url);
    setImgError(false);
    setImgLoaded(false);
  };

  const handleClear = () => {
    onChange(null);
    setImgError(false);
    setImgLoaded(false);
  };

  const previewUrl = value?.trim() || null;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPickerOpen(true)}
        >
          {value ? 'Change image' : 'Choose from library'}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            aria-label="Remove featured image"
          >
            Remove
          </Button>
        )}
      </div>

      {previewUrl && (
        <div className="rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
          {imgError ? (
            <div className="flex items-center justify-center h-40 text-center px-4" role="alert">
              <div>
                <p className="text-sm font-medium text-red-600">Image could not be loaded</p>
                <p className="text-xs text-gray-400 mt-1">Check the URL is publicly accessible</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Featured image preview"
                className={cn(
                  'w-full max-h-56 object-cover transition-opacity duration-200',
                  imgLoaded ? 'opacity-100' : 'opacity-0',
                )}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
              />
              {!imgLoaded && !imgError && (
                <div className="absolute inset-0 flex items-center justify-center h-40 bg-gray-100">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <AssetPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelect}
        imagesOnly
        title="Select featured image"
      />
    </div>
  );
}
