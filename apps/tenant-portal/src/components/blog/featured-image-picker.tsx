'use client';

import { useState } from 'react';
import { Input, Button } from '@spancle/ui-kit';
import { cn } from '@/lib/utils/cn';

interface FeaturedImagePickerProps {
  value:      string | null | undefined;
  onChange:   (url: string | null) => void;
  className?: string;
}

/**
 * FeaturedImagePicker — allows admins to set a featured image by URL.
 *
 * Features:
 *   - URL text input with real-time preview
 *   - Image load error state with descriptive message
 *   - Clear button to remove the image
 *   - Accessible — image has alt text, error is announced via role="alert"
 *
 * Sprint 3: Replace URL input with MediaLibrary modal picker
 * that browses cms_media_assets for this tenant.
 */
export function FeaturedImagePicker({
  value,
  onChange,
  className,
}: FeaturedImagePickerProps): React.ReactElement {
  const [inputVal, setInputVal]   = useState(value ?? '');
  const [imgError, setImgError]   = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleBlur = (): void => {
    const trimmed = inputVal.trim();
    onChange(trimmed || null);
    setImgError(false);
    setImgLoaded(false);
  };

  const handleClear = (): void => {
    setInputVal('');
    onChange(null);
    setImgError(false);
    setImgLoaded(false);
  };

  const previewUrl = value?.trim() || null;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="Featured image URL"
            description="Paste a public image URL. Media library picker coming in Sprint 3."
            type="url"
            placeholder="https://example.com/image.jpg"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onBlur={handleBlur}
          />
        </div>
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 flex-shrink-0 mb-0.5"
            aria-label="Remove featured image"
          >
            Remove
          </Button>
        )}
      </div>

      {/* Preview */}
      {previewUrl && (
        <div className="rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
          {imgError ? (
            <div
              className="flex items-center justify-center h-40 text-center px-4"
              role="alert"
            >
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
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-primary-500" aria-hidden="true" />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
