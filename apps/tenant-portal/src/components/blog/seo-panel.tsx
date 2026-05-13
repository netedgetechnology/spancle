'use client';

import { useState } from 'react';
import { Input } from '@spancle/ui-kit';
import { cn } from '@/lib/utils/cn';
import type { BlogPostSeo } from '@/types/blog.types';

type SeoPanelValue = Partial<BlogPostSeo>;

interface SeoPanelProps {
  value:    SeoPanelValue;
  onChange: (seo: SeoPanelValue) => void;
  /** Post title — used to populate SEO title placeholder */
  postTitle?: string;
  className?: string;
}

interface CharCountProps {
  current: number;
  max:     number;
  warn?:   number;
}

function CharCount({ current, max, warn = max - 20 }: CharCountProps): React.ReactElement {
  const isOver = current > max;
  const isWarn = !isOver && current >= warn;

  return (
    <span
      className={cn(
        'text-xs tabular-nums',
        isOver ? 'text-red-600 font-semibold' : isWarn ? 'text-amber-600' : 'text-gray-400',
      )}
    >
      {current}/{max}
    </span>
  );
}

/**
 * SeoPanel — collapsible panel for managing all SEO metadata on a blog post.
 *
 * Sections:
 *   1. Core SEO — title, description, keywords, canonical URL, robots directive
 *   2. Open Graph — og:title, og:description, og:image, og:type
 *   3. Twitter Card — card type, title, description, image
 *
 * Features:
 *   - Character count indicators with colour-coded warnings
 *   - Live snippet preview (Google SERP simulation)
 *   - Controlled component — parent manages the seo state object
 *   - All fields optional — blank fields are omitted from the API payload
 */
export function SeoPanel({
  value,
  onChange,
  postTitle = '',
  className,
}: SeoPanelProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  const set = <K extends keyof SeoPanelValue>(key: K, val: SeoPanelValue[K]): void => {
    onChange({ ...value, [key]: val || null });
  };

  const title       = value.title ?? '';
  const description = value.description ?? '';

  // Live snippet preview values
  const previewTitle = title || postTitle || 'Page title';
  const previewDesc  = description || 'Page description will appear here…';
  const previewUrl   = value.canonicalUrl || 'https://yoursite.com/blog/post-slug';

  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white', className)}>
      {/* Accordion trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <span className="text-sm font-semibold text-gray-800">SEO &amp; Social</span>
          {(title || description) && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Configured
            </span>
          )}
        </div>
        <svg
          className={cn('h-4 w-4 text-gray-400 transition-transform duration-200', isOpen && 'rotate-180')}
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Panel body */}
      {isOpen && (
        <div className="border-t border-gray-100 px-5 py-6 flex flex-col gap-8">

          {/* SERP snippet preview */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Google snippet preview
            </p>
            <div className="space-y-0.5">
              <p className="text-xs text-green-700 truncate">{previewUrl}</p>
              <p className="text-lg text-blue-700 font-normal leading-snug hover:underline cursor-pointer truncate">
                {previewTitle}
              </p>
              <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                {previewDesc}
              </p>
            </div>
          </div>

          {/* ── Core SEO ───────────────────────────────────────── */}
          <fieldset>
            <legend className="text-sm font-semibold text-gray-700 mb-4">Core SEO</legend>
            <div className="flex flex-col gap-4">

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">SEO title</label>
                  <CharCount current={title.length} max={60} warn={50} />
                </div>
                <input
                  type="text"
                  placeholder={postTitle || 'Enter SEO title…'}
                  value={title}
                  maxLength={120}
                  onChange={(e) => set('title', e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
                <p className="mt-1 text-xs text-gray-400">Recommended 50–60 characters</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Meta description</label>
                  <CharCount current={description.length} max={160} warn={140} />
                </div>
                <textarea
                  rows={3}
                  placeholder="Write a compelling description for search results…"
                  value={description}
                  maxLength={320}
                  onChange={(e) => set('description', e.target.value)}
                  className="block w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
                <p className="mt-1 text-xs text-gray-400">Recommended 120–160 characters</p>
              </div>

              <Input
                label="Keywords"
                description="Comma-separated keywords (low SEO value in 2024 — optional)"
                placeholder="sports, coaching, academy"
                value={value.keywords ?? ''}
                onChange={(e) => set('keywords', e.target.value)}
              />

              <Input
                label="Canonical URL"
                description="Set if this content is syndicated from another URL"
                type="url"
                placeholder="https://yoursite.com/blog/original-post"
                value={value.canonicalUrl ?? ''}
                onChange={(e) => set('canonicalUrl', e.target.value)}
              />

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Robots directive
                </label>
                <select
                  value={value.robots ?? 'index,follow'}
                  onChange={(e) => set('robots', e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                >
                  <option value="index,follow">index, follow (default)</option>
                  <option value="noindex,follow">noindex, follow</option>
                  <option value="index,nofollow">index, nofollow</option>
                  <option value="noindex,nofollow">noindex, nofollow</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* ── Open Graph ─────────────────────────────────────── */}
          <fieldset>
            <legend className="text-sm font-semibold text-gray-700 mb-4">Open Graph (Facebook / LinkedIn)</legend>
            <div className="flex flex-col gap-4">
              <Input
                label="OG title"
                placeholder="Defaults to SEO title if blank"
                value={value.ogTitle ?? ''}
                onChange={(e) => set('ogTitle', e.target.value)}
              />
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">OG description</label>
                <textarea
                  rows={2}
                  placeholder="Defaults to meta description if blank"
                  value={value.ogDescription ?? ''}
                  onChange={(e) => set('ogDescription', e.target.value)}
                  className="block w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>
              <Input
                label="OG image URL"
                description="Recommended 1200×630 px"
                type="url"
                placeholder="https://example.com/og-image.jpg"
                value={value.ogImageUrl ?? ''}
                onChange={(e) => set('ogImageUrl', e.target.value)}
              />
            </div>
          </fieldset>

          {/* ── Twitter Card ───────────────────────────────────── */}
          <fieldset>
            <legend className="text-sm font-semibold text-gray-700 mb-4">Twitter / X Card</legend>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Card type</label>
                <select
                  value={value.twitterCard ?? 'summary_large_image'}
                  onChange={(e) => set('twitterCard', e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                >
                  <option value="summary_large_image">Summary — large image</option>
                  <option value="summary">Summary — small image</option>
                </select>
              </div>
              <Input
                label="Twitter title"
                placeholder="Defaults to SEO title if blank"
                value={value.twitterTitle ?? ''}
                onChange={(e) => set('twitterTitle', e.target.value)}
              />
              <Input
                label="Twitter image URL"
                description="Recommended 1200×600 px"
                type="url"
                placeholder="https://example.com/twitter-image.jpg"
                value={value.twitterImageUrl ?? ''}
                onChange={(e) => set('twitterImageUrl', e.target.value)}
              />
            </div>
          </fieldset>

        </div>
      )}
    </div>
  );
}
