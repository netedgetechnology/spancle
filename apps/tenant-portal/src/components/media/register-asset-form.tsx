'use client';

/**
 * register-asset-form.tsx
 *
 * RegisterAssetForm — metadata registration for an already-uploaded file.
 *
 * Upload status:
 *   The saas-platform-service multipart upload endpoint is deferred (Sprint 3).
 *   This form allows admins to register a file's metadata once it has been
 *   uploaded externally (e.g. to S3 via console or CLI).
 *
 *   When FEATURE_UPLOAD_ENABLED=true (Sprint 3), this form will be replaced
 *   or supplemented with a multipart drag-and-drop upload interface.
 *
 * Fields map 1:1 to CreateMediaAssetDto.
 */

import { useState }                   from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn }                          from '@/lib/utils/cn';
import {
  registerMediaAsset,
  mediaKeys,
  FEATURE_UPLOAD_ENABLED,
  type MediaAssetType,
} from '@/lib/media.api';

interface RegisterAssetFormProps {
  onSuccess: () => void;
  onCancel:  () => void;
}

type FormState = {
  originalName: string;
  storedName:   string;
  mimeType:     string;
  assetType:    MediaAssetType;
  sizeBytes:    string;
  url:          string;
  storagePath:  string;
  altText:      string;
  caption:      string;
};

const DEFAULTS: FormState = {
  originalName: '',
  storedName:   '',
  mimeType:     'image/jpeg',
  assetType:    'image',
  sizeBytes:    '',
  url:          '',
  storagePath:  '',
  altText:      '',
  caption:      '',
};

const inp = (err?: string) => cn(
  'block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 transition-colors',
  err ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
);

export function RegisterAssetForm({ onSuccess, onCancel }: RegisterAssetFormProps): React.ReactElement {
  const qc           = useQueryClient();
  const [form, set]  = useState<FormState>(DEFAULTS);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const field = <K extends keyof FormState>(k: K) => (
    (v: string) => set((f) => ({ ...f, [k]: v }))
  );

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.originalName.trim()) e.originalName = 'Original filename is required';
    if (!form.storedName.trim())   e.storedName   = 'Stored filename is required';
    if (!form.mimeType.trim())     e.mimeType     = 'MIME type is required';
    if (!form.url.trim())          e.url          = 'URL is required';
    if (!form.storagePath.trim())  e.storagePath  = 'Storage path is required';
    const size = Number(form.sizeBytes);
    if (!form.sizeBytes || isNaN(size) || size <= 0) e.sizeBytes = 'File size must be a positive number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const mutation = useMutation({
    mutationFn: () => registerMediaAsset({
      originalName: form.originalName.trim(),
      storedName:   form.storedName.trim(),
      mimeType:     form.mimeType.trim(),
      assetType:    form.assetType,
      sizeBytes:    Number(form.sizeBytes),
      url:          form.url.trim(),
      storagePath:  form.storagePath.trim(),
      altText:      form.altText.trim() || undefined,
      caption:      form.caption.trim() || undefined,
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: mediaKeys.all() });
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Upload gate notice */}
      {!FEATURE_UPLOAD_ENABLED && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Direct file upload is not yet available</p>
          <p className="mt-1 text-xs text-amber-700">
            The multipart upload endpoint is scheduled for Sprint 3.
            Use this form to register a file that has already been uploaded
            externally (e.g. via S3 Console, AWS CLI, or GCS). Enter the
            public URL and storage path below.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Original filename" required error={errors.originalName}>
          <input
            type="text" placeholder="hero-image.jpg"
            value={form.originalName} onChange={(e) => field('originalName')(e.target.value)}
            className={inp(errors.originalName)}
          />
        </Field>

        <Field label="Stored filename" required error={errors.storedName}
          hint="Deduplicated name in storage">
          <input
            type="text" placeholder="hero-image-a1b2c3.jpg"
            value={form.storedName} onChange={(e) => field('storedName')(e.target.value)}
            className={inp(errors.storedName)}
          />
        </Field>

        <Field label="MIME type" required error={errors.mimeType}>
          <input
            type="text" placeholder="image/jpeg"
            value={form.mimeType} onChange={(e) => field('mimeType')(e.target.value)}
            className={inp(errors.mimeType)}
          />
        </Field>

        <Field label="Asset type" required>
          <select value={form.assetType} onChange={(e) => field('assetType')(e.target.value)} className={inp()}>
            {(['image', 'video', 'document', 'audio', 'other'] as MediaAssetType[]).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>

        <Field label="File size (bytes)" required error={errors.sizeBytes}>
          <input
            type="number" min={1} placeholder="204800"
            value={form.sizeBytes} onChange={(e) => field('sizeBytes')(e.target.value)}
            className={inp(errors.sizeBytes)}
          />
        </Field>

        <Field label="Public URL" required error={errors.url}>
          <input
            type="url" placeholder="https://cdn.example.com/hero-image.jpg"
            value={form.url} onChange={(e) => field('url')(e.target.value)}
            className={inp(errors.url)}
          />
        </Field>

        <Field label="Storage path" required error={errors.storagePath}
          hint="Relative path in storage bucket" className="sm:col-span-2">
          <input
            type="text" placeholder="media/tenant-abc/hero-image-a1b2c3.jpg"
            value={form.storagePath} onChange={(e) => field('storagePath')(e.target.value)}
            className={inp(errors.storagePath)}
          />
        </Field>

        <Field label="Alt text" hint="For image accessibility" className="sm:col-span-2">
          <input
            type="text" maxLength={255} placeholder="Describe the image"
            value={form.altText} onChange={(e) => field('altText')(e.target.value)}
            className={inp()}
          />
        </Field>

        <Field label="Caption" className="sm:col-span-2">
          <input
            type="text" maxLength={500} placeholder="Optional caption"
            value={form.caption} onChange={(e) => field('caption')(e.target.value)}
            className={inp()}
          />
        </Field>
      </div>

      {mutation.isError && (
        <p role="alert" className="text-sm text-red-600">
          Failed to register asset. Please check your inputs and try again.
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={mutation.isPending}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
          {mutation.isPending ? 'Registering…' : 'Register asset'}
        </button>
      </div>
    </form>
  );
}

function Field({ label, hint, required, error, children, className }: {
  label: string; hint?: string; required?: boolean; error?: string;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {!error && hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
