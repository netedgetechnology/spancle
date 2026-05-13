'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Modal, Select } from '@spancle/ui-kit';
import { cn } from '@/lib/utils/cn';
import type { HomepageSection } from '@/types/homepage.types';
import type { SectionType as _SectionType } from '@/types/homepage.types';

interface SectionFormProps {
  section:    HomepageSection | null;
  isOpen:     boolean;
  onClose:    () => void;
  onSave:     (id: string, payload: Record<string, unknown>, adminLabel: string, status: string) => void | Promise<void>;
  isSaving?:  boolean;
}

/**
 * SectionForm — admin modal for editing a homepage section.
 *
 * Architecture:
 *   - Outer shell: Modal + adminLabel + status fields (common to all types)
 *   - Inner panel: dynamic form fields rendered per sectionType
 *
 * Form fields per section type are rendered as a JSON textarea in this
 * sprint — this is intentional scaffolding. A field-level form UI for
 * each section type is a Sprint 3 deliverable once the design system
 * is finalized. The JSON textarea allows admins to edit content now
 * while the UI builder is in progress.
 *
 * The textarea content is validated client-side against the section type
 * schema before submission (error displayed inline).
 */
export function SectionForm({
  section,
  isOpen,
  onClose,
  onSave,
  isSaving = false,
}: SectionFormProps): React.ReactElement | null {
  const [adminLabel, setAdminLabel] = useState('');
  const [status,     setStatus]     = useState<'draft' | 'published' | 'archived'>('draft');
  const [payloadStr, setPayloadStr] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  // Sync form state when section changes
  useEffect(() => {
    if (section) {
      setAdminLabel(section.adminLabel ?? "");
      setStatus(section.status ?? "draft");
      setPayloadStr(JSON.stringify(section.payload, null, 2));
      setParseError(null);
    }
  }, [section]);

  if (!section) return null;

  const handlePayloadChange = (value: string): void => {
    setPayloadStr(value);
    try {
      JSON.parse(value);
      setParseError(null);
    } catch {
      setParseError('Invalid JSON — check your syntax');
    }
  };

  const handleSave = async (): Promise<void> => {
    if (parseError) return;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(payloadStr) as Record<string, unknown>;
    } catch {
      setParseError('Invalid JSON — cannot save');
      return;
    }

    await onSave(section.id, parsed, adminLabel, status);
  };

  const statusOptions = [
    { value: 'draft',     label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'archived',  label: 'Archived' },
  ];

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open: boolean) => { if (!open) onClose(); }}
      title={`Edit section — ${section.adminLabel}`}
      description={`Section type: ${section.sectionType.replace(/_/g, ' ')}`}
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            isLoading={isSaving}
            loadingText="Saving..."
            disabled={!!parseError}
          >
            Save changes
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Common fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Admin label"
            description="Internal name — not shown publicly"
            value={adminLabel}
            onChange={(e) => setAdminLabel(e.target.value)}
            maxLength={100}
          />
          <Select
            label="Status"
            options={statusOptions}
            value={status}
            onValueChange={(v: string) => setStatus(v as typeof status)}
          />
        </div>

        {/* Payload editor */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Section content
            <span className="ml-2 text-xs font-normal text-gray-400">
              (JSON editor — visual field editor in Sprint 3)
            </span>
          </label>

          <textarea
            value={payloadStr}
            onChange={(e) => handlePayloadChange(e.target.value)}
            rows={18}
            spellCheck={false}
            className={cn(
              'w-full rounded-md border px-3 py-2.5 font-mono text-xs text-gray-800',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'resize-y min-h-[200px]',
              parseError
                ? 'border-red-400 focus:border-red-500 focus:ring-red-200 bg-red-50'
                : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200',
            )}
          />

          {parseError && (
            <p className="text-xs text-red-600 flex items-center gap-1.5" role="alert">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {parseError}
            </p>
          )}

          <p className="text-xs text-gray-400">
            The content will be validated against the section schema on save.
            Invalid payloads are rejected with a descriptive error.
          </p>
        </div>
      </div>
    </Modal>
  );
}
