'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';
import { getHomepageSection, updateHomepageSection, homepageSectionKeys } from '@/lib/cms-homepage.api';
import { cn } from '@/lib/utils/cn';

const inputCls = (err?: string) => cn(
  'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 transition-colors',
  err
    ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50'
    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
);

function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string;
  error?: string; children: React.ReactNode;
}): React.ReactElement {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error  && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {!error && hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="flex flex-col gap-5 p-6">{children}</div>
    </div>
  );
}

export default function HomepageSectionEditorPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc     = useQueryClient();
  const { addToast } = useToast();

  const { data: section, isLoading, error } = useQuery({
    queryKey: ['cms-homepage-section', id],
    queryFn:  () => getHomepageSection(id),
    enabled:  !!id,
  });

  const [form, setForm] = useState({
    adminLabel: '',
    status:     'draft' as 'draft' | 'published' | 'archived',
    isVisible:  true,
    payloadJson: '{}',
  });
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (!section) return;
    setForm({
      adminLabel:  section.adminLabel,
      status:      section.status,
      isVisible:   section.isVisible,
      payloadJson: JSON.stringify(section.payload, null, 2),
    });
  }, [section]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (k === 'payloadJson') setJsonError(null);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      let parsedPayload: Record<string, unknown>;
      try {
        parsedPayload = JSON.parse(form.payloadJson) as Record<string, unknown>;
      } catch {
        throw new Error('INVALID_JSON');
      }
      return updateHomepageSection(id, {
        adminLabel: form.adminLabel,
        status:     form.status,
        isVisible:  form.isVisible,
        payload:    parsedPayload,
      });
    },
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: homepageSectionKeys.all() });
      addToast(`"${saved.adminLabel}" saved successfully.`);
    },
    onError: (err: unknown) => {
      if (err instanceof Error && err.message === 'INVALID_JSON') {
        setJsonError('Payload must be valid JSON.');
        addToast('Payload is not valid JSON — fix it and try again.', 'error');
      } else {
        addToast('Failed to save section. Please try again.', 'error');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.adminLabel.trim()) return;
    try {
      JSON.parse(form.payloadJson);
      setJsonError(null);
    } catch {
      setJsonError('Payload must be valid JSON.');
      return;
    }
    saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !section) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-red-500">Section not found or failed to load.</p>
        <button type="button" onClick={() => router.back()} className="text-sm text-blue-600 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-3xl">
      <div>
        <nav className="flex items-center gap-1 text-xs text-gray-400 mb-1">
          <Link href="/website-cms" className="hover:text-gray-600 transition-colors">Website CMS</Link>
          <span>/</span>
          <Link href="/website-cms/homepage" className="hover:text-gray-600 transition-colors">Homepage</Link>
          <span>/</span>
          <span className="text-gray-600 font-medium">{section.adminLabel}</span>
        </nav>
        <h2 className="text-lg font-semibold text-gray-900">{section.adminLabel}</h2>
        <p className="mt-0.5 text-xs font-mono text-gray-400">{section.sectionType}</p>
      </div>

      <Section title="Section settings">
        <Field label="Admin label" required>
          <input
            type="text"
            value={form.adminLabel}
            onChange={(e) => set('adminLabel', e.target.value)}
            className={inputCls()}
            placeholder="Hero — Homepage"
          />
        </Field>

        <Field label="Status" required>
          <select value={form.status} onChange={(e) => set('status', e.target.value as typeof form.status)} className={inputCls()}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </Field>

        <Field label="Visible" hint="Hidden sections are skipped by the public renderer even if published.">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.isVisible}
              onChange={(e) => set('isVisible', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Show this section on the live page
          </label>
        </Field>
      </Section>

      <Section title="Payload (JSON)">
        <Field
          label="Section content"
          error={jsonError ?? undefined}
          hint="Raw JSON matching this section type's expected fields. Edit carefully — invalid JSON cannot be saved."
        >
          <textarea
            value={form.payloadJson}
            onChange={(e) => set('payloadJson', e.target.value)}
            rows={16}
            spellCheck={false}
            className={cn(inputCls(jsonError ?? undefined), 'font-mono text-xs leading-relaxed')}
          />
        </Field>
      </Section>

      <div className="flex items-center justify-end gap-3 pb-6">
        <Link
          href="/website-cms/homepage"
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saveMutation.isPending}
          aria-busy={saveMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {saveMutation.isPending && (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {saveMutation.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
