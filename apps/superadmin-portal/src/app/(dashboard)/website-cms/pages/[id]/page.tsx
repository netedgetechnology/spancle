'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';
import { getPage, updatePage } from '@/lib/cms-page-editor.api';
import { cmsPageKeys } from '@/lib/cms-pages.api';
import { cn } from '@/lib/utils/cn';

const SLUG_RE  = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ROBOTS_OPTIONS = ['index,follow', 'noindex,nofollow', 'index,nofollow', 'noindex,follow'];

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

export default function CmsPageEditorPage(): React.ReactElement {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const qc       = useQueryClient();
  const { addToast } = useToast();

  const { data: page, isLoading, error } = useQuery({
    queryKey: ['cms-page', id],
    queryFn:  () => getPage(id),
    enabled:  !!id,
  });

  const [form, setForm] = useState({
    title:        '',
    slug:         '',
    status:       'draft' as 'draft' | 'published' | 'archived' | 'scheduled',
    metaTitle:    '',
    metaDesc:     '',
    robots:       'index,follow',
    canonicalUrl: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form once page loads
  useEffect(() => {
    if (!page) return;
    const seo = (page.seo ?? {}) as Record<string, string>;
    setForm({
      title:        page.title ?? '',
      slug:         page.slug  ?? '',
      status:       (page.status ?? 'draft') as typeof form.status,
      metaTitle:    seo['title']        ?? seo['metaTitle']       ?? '',
      metaDesc:     seo['description']  ?? seo['metaDescription'] ?? '',
      robots:       seo['robots']       ?? 'index,follow',
      canonicalUrl: seo['canonicalUrl'] ?? '',
    });
  }, [page]);

  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.title.trim())         e['title'] = 'Title is required.';
    if (!form.slug.trim())          e['slug']  = 'Slug is required.';
    else if (!SLUG_RE.test(form.slug)) e['slug'] = 'Lowercase letters, numbers and hyphens only.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: () => updatePage(id, {
      title:  form.title,
      slug:   form.slug,
      status: form.status,
      seo: {
        title:        form.metaTitle    || undefined,
        description:  form.metaDesc     || undefined,
        robots:       form.robots       || undefined,
        canonicalUrl: form.canonicalUrl || undefined,
      },
    }),
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: cmsPageKeys.all() });
      addToast(`"${saved.title}" saved successfully.`);
    },
    onError: () => {
      addToast('Failed to save page. Please try again.', 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-red-500">Page not found or failed to load.</p>
        <button type="button" onClick={() => router.back()} className="text-sm text-blue-600 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-3xl">
      {/* Breadcrumb */}
      <div>
        <nav className="flex items-center gap-1 text-xs text-gray-400 mb-1">
          <Link href="/website-cms" className="hover:text-gray-600 transition-colors">Website CMS</Link>
          <span>/</span>
          <Link href="/website-cms/pages" className="hover:text-gray-600 transition-colors">Pages</Link>
          <span>/</span>
          <span className="text-gray-600 font-medium">{page.title}</span>
        </nav>
        <h2 className="text-lg font-semibold text-gray-900">{page.title}</h2>
        <p className="mt-0.5 text-xs font-mono text-gray-400">/{page.slug}</p>
      </div>

      {/* Basic information */}
      <Section title="Basic information">
        <Field label="Title" required error={errors['title']}>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            className={inputCls(errors['title'])}
            placeholder="About Spancle"
          />
        </Field>

        <Field label="Slug" required error={errors['slug']}
          hint="URL path: spancle.com/{slug}">
          <div className="flex">
            <span className="flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-xs text-gray-500 select-none">
              /
            </span>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className={cn(inputCls(errors['slug']), 'rounded-l-none font-mono')}
              placeholder="about"
              disabled={page.isHomepage}
            />
          </div>
          {page.isHomepage && (
            <p className="mt-1 text-xs text-gray-400">Slug cannot be changed for the homepage.</p>
          )}
        </Field>

        <Field label="Status" required>
          <select
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
            className={inputCls()}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
      </Section>

      {/* SEO */}
      <Section title="SEO">
        <Field label="Meta title" hint="Recommended: 50–60 characters.">
          <input
            type="text"
            value={form.metaTitle}
            onChange={(e) => set('metaTitle', e.target.value)}
            className={inputCls()}
            placeholder="About Spancle Sports OS"
            maxLength={120}
          />
          <p className="mt-1 text-xs text-gray-400 text-right">{form.metaTitle.length}/120</p>
        </Field>

        <Field label="Meta description" hint="Recommended: 120–160 characters.">
          <textarea
            value={form.metaDesc}
            onChange={(e) => set('metaDesc', e.target.value)}
            rows={3}
            className={inputCls()}
            placeholder="Learn how Spancle helps sports clubs manage bookings, payments and members."
            maxLength={320}
          />
          <p className="mt-1 text-xs text-gray-400 text-right">{form.metaDesc.length}/320</p>
        </Field>

        <Field label="Robots">
          <select value={form.robots} onChange={(e) => set('robots', e.target.value)} className={inputCls()}>
            {ROBOTS_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>

        <Field label="Canonical URL" hint="Leave blank to use the default page URL.">
          <input
            type="url"
            value={form.canonicalUrl}
            onChange={(e) => set('canonicalUrl', e.target.value)}
            className={inputCls()}
            placeholder="https://www.spancle.com/about"
          />
        </Field>
      </Section>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pb-6">
        <Link
          href="/website-cms/pages"
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
