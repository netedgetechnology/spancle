import React from 'react';
'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Select, Badge } from '@spancle/ui-kit';
import { cn } from '@/lib/utils/cn';
import { SeoPanel } from './seo-panel';
import { FeaturedImagePicker } from './featured-image-picker';
import { SchedulePicker } from './schedule-picker';
import { generateSlug } from '@/lib/blog.api';
import type {
  BlogPost,
  BlogCategoryWithCount,
  CreatePostInput,
  UpdatePostInput,
  BlogPostStatus,
  BlogPostSeo,
} from '@/types/blog.types';

// ── Form state ────────────────────────────────────────────────────────────────

interface PostFormState {
  title:           string;
  slug:            string;
  excerpt:         string;
  contentRaw:      string;          // JSON string of the content block
  status:          BlogPostStatus;
  publishedAt:     string | null;   // ISO-8601 UTC
  categoryId:      string;
  tags:            string;          // comma-separated
  featuredImageUrl: string | null;
  isFeatured:      boolean;
  seo:             Partial<BlogPostSeo>;
}

const EMPTY_FORM: PostFormState = {
  title:           '',
  slug:            '',
  excerpt:         '',
  contentRaw:      '{}',
  status:          'draft',
  publishedAt:     null,
  categoryId:      '',
  tags:            '',
  featuredImageUrl: null,
  isFeatured:      false,
  seo:             {},
};

function postToFormState(post: BlogPost): PostFormState {
  return {
    title:           post.title,
    slug:            post.slug,
    excerpt:         post.excerpt ?? '',
    contentRaw:      JSON.stringify(post.content ?? {}, null, 2),
    status:          post.status,
    publishedAt:     post.publishedAt,
    categoryId:      post.categoryId ?? '',
    tags:            post.tags ?? '',
    featuredImageUrl: post.featuredImageUrl,
    isFeatured:      post.isFeatured,
    seo:             post.seo ?? {},
  };
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface PostFormProps {
  /** Existing post for edit mode; undefined for create mode */
  post?:       BlogPost;
  categories:  BlogCategoryWithCount[];
  onSave:      (input: CreatePostInput | UpdatePostInput) => void | Promise<void>;
  onDiscard?:  () => void;
  isSaving?:   boolean;
  className?:  string;
}

const STATUS_OPTIONS = [
  { value: 'draft',     label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived',  label: 'Archived' },
  { value: 'scheduled', label: 'Scheduled' },
];

/**
 * PostForm — the main create/edit form for blog posts.
 *
 * Layout:
 *   Left column (2/3):  Title, Slug, Excerpt, Content (JSON/rich body)
 *   Right column (1/3): Status, Category, Tags, Featured image, isFeatured, Scheduling
 *   Full-width bottom:  SEO panel
 *
 * Content field:
 *   Sprint 1: JSON textarea (allows full content editing for power users)
 *   Sprint 3: Replace with block editor (Lexical / TipTap)
 *
 * All fields validate before calling onSave.
 * Slug is auto-generated from title on create; editable after first save.
 */
export function PostForm({
  post,
  categories,
  onSave,
  onDiscard,
  isSaving = false,
  className,
}: PostFormProps): React.ReactElement {
  const isEditMode = !!post;

  const [form, setForm]         = useState<PostFormState>(
    post ? postToFormState(post) : EMPTY_FORM,
  );
  const [errors, setErrors]     = useState<Partial<Record<keyof PostFormState, string>>>({});
  const [slugDirty, setSlugDirty] = useState(isEditMode);
  const [contentError, setContentError] = useState<string | null>(null);

  // Auto-generate slug from title (create mode only)
  useEffect(() => {
    if (!slugDirty && form.title) {
      setForm((f) => ({ ...f, slug: generateSlug(f.title) }));
    }
  }, [form.title, slugDirty]);

  const set = <K extends keyof PostFormState>(key: K, value: PostFormState[K]): void => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errs: typeof errors = {};

    if (!form.title.trim())        errs.title = 'Title is required';
    if (!form.slug.trim())         errs.slug  = 'Slug is required';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug))
      errs.slug = 'Slug must be lowercase alphanumeric with hyphens only';

    if (form.status === 'scheduled' && !form.publishedAt)
      errs.publishedAt = 'A publish date is required for scheduled posts';

    if (form.status === 'scheduled' && form.publishedAt) {
      if (new Date(form.publishedAt) <= new Date())
        errs.publishedAt = 'Scheduled time must be in the future';
    }

    // Validate content JSON
    try {
      JSON.parse(form.contentRaw);
      setContentError(null);
    } catch {
      setContentError('Content is not valid JSON');
      errs.contentRaw = 'Content is not valid JSON';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (): Promise<void> => {
    if (!validate()) return;

    let parsedContent: Record<string, unknown> | undefined;
    try {
      parsedContent = JSON.parse(form.contentRaw) as Record<string, unknown>;
    } catch {
      return;
    }

    const input: CreatePostInput = {
      title:           form.title.trim(),
      slug:            form.slug.trim(),
      excerpt:         form.excerpt.trim() || undefined,
      content:         parsedContent,
      status:          form.status,
      publishedAt:     form.publishedAt ?? undefined,
      categoryId:      form.categoryId || undefined,
      tags:            form.tags.trim() || undefined,
      featuredImageUrl: form.featuredImageUrl ?? undefined,
      isFeatured:      form.isFeatured,
      seo:             Object.keys(form.seo).length ? form.seo : undefined,
    };

    await onSave(input);
  };

  // ── Category options ────────────────────────────────────────────────────────

  const categoryOptions = [
    { value: '', label: 'No category' },
    ...categories.map((c) => ({
      value: c.id,
      label: `${c.name} (${c.postCount})`,
    })),
  ];

  return (
    <div className={cn('flex flex-col gap-8', className)}>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Left: Content fields ─────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Title */}
          <div>
            <Input
              label="Title"
              required
              placeholder="Write a compelling title…"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              error={errors.title}
            />
          </div>

          {/* Slug */}
          <div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="Slug"
                  required
                  description="URL-safe identifier — lowercase letters, numbers and hyphens only"
                  placeholder="my-post-title"
                  value={form.slug}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
                    setSlugDirty(true);
                    set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                  }}
                  error={errors.slug}
                  className="font-mono text-sm"
                />
              </div>
              {!isEditMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mb-0.5 flex-shrink-0 text-gray-500"
                  onClick={() => {
                    setSlugDirty(false);
                    set('slug', generateSlug(form.title));
                  }}
                >
                  Auto-generate
                </Button>
              )}
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Excerpt
              <span className="ml-1.5 text-xs font-normal text-gray-400">(optional — shown in listings)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Brief summary of the post…"
              maxLength={500}
              value={form.excerpt}
              onChange={(e) => set('excerpt', e.target.value)}
              className="block w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">
                Content
                <span className="ml-2 text-xs font-normal text-gray-400">
                  JSON block format — block editor in Sprint 3
                </span>
              </label>
              {contentError && (
                <span className="text-xs text-red-600" role="alert">{contentError}</span>
              )}
            </div>
            <textarea
              rows={16}
              spellCheck={false}
              placeholder='{"type":"doc","content":[]}'
              value={form.contentRaw}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
                set('contentRaw', e.target.value);
                try { JSON.parse(e.target.value); setContentError(null); }
                catch { setContentError('Invalid JSON'); }
              }}
              className={cn(
                'block w-full resize-y rounded-md border px-3 py-2.5 font-mono text-xs text-gray-800',
                'focus:outline-none focus:ring-2 focus:ring-offset-0 min-h-[200px]',
                contentError
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-200 bg-red-50'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200',
              )}
            />
          </div>
        </div>

        {/* ── Right: Post settings ──────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Status */}
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={form.status}
            onValueChange={(v: string | null) => set('status', v as BlogPostStatus)}
          />

          {/* Scheduling (show only when status = scheduled) */}
          {form.status === 'scheduled' && (
            <div>
              <SchedulePicker
                value={form.publishedAt}
                onChange={(v: string | null) => set('publishedAt', v)}
              />
              {errors.publishedAt && (
                <p className="mt-1 text-xs text-red-600">{errors.publishedAt}</p>
              )}
            </div>
          )}

          {/* Category */}
          <Select
            label="Category"
            options={categoryOptions}
            value={form.categoryId}
            onValueChange={(v: string | null) => set('categoryId', v ?? '')}
          />

          {/* Tags */}
          <div>
            <Input
              label="Tags"
              description="Comma-separated — e.g. coaching, academy, tournament"
              placeholder="tag1, tag2, tag3"
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
            />
          </div>

          {/* Featured toggle */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-800">Featured post</p>
              <p className="text-xs text-gray-500 mt-0.5">Shown in featured post widgets</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.isFeatured}
              onClick={() => set('isFeatured', !form.isFeatured)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
                form.isFeatured ? 'bg-primary-600' : 'bg-gray-200',
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                  form.isFeatured ? 'translate-x-6' : 'translate-x-1',
                )}
              />
            </button>
          </div>

          {/* Featured image */}
          <FeaturedImagePicker
            value={form.featuredImageUrl}
            onChange={(v: string | null) => set('featuredImageUrl', v)}
          />

        </div>
      </div>

      {/* SEO panel — full width */}
      <SeoPanel
        value={form.seo}
        onChange={(seo) => set('seo', seo)}
        postTitle={form.title}
      />

      {/* Action bar */}
      <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-6">
        <div className="flex items-center gap-2">
          <Badge
            intent={
              form.status === 'published' ? 'success'
                : form.status === 'scheduled' ? 'warning'
                  : form.status === 'archived' ? 'danger'
                    : 'default'
            }
            dot
          >
            {form.status}
          </Badge>
          {form.status === 'scheduled' && form.publishedAt && (
            <span className="text-xs text-gray-500">
              {new Date(form.publishedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {onDiscard && (
            <Button variant="ghost" onClick={onDiscard} disabled={isSaving}>
              Discard changes
            </Button>
          )}
          <Button
            onClick={() => void handleSubmit()}
            isLoading={isSaving}
            loadingText="Saving…"
            disabled={!!contentError}
          >
            {form.status === 'published' ? 'Publish' : 'Save post'}
          </Button>
        </div>
      </div>
    </div>
  );
}
