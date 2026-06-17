'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';
import {
  fetchCmsPages, publishPage, unpublishPage, cmsPageKeys,
} from '@/lib/cms-pages.api';
import type { CmsPage, PageStatus } from '@/lib/cms-pages.api';
import { cn } from '@/lib/utils/cn';

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<PageStatus, string> = {
  published: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  draft:     'bg-gray-100  text-gray-600    ring-gray-500/20',
  archived:  'bg-amber-50  text-amber-700   ring-amber-600/20',
  scheduled: 'bg-blue-50   text-blue-700    ring-blue-600/20',
};

function StatusBadge({ status }: { status: PageStatus }): React.ReactElement {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset capitalize',
      STATUS_STYLES[status] ?? STATUS_STYLES['draft'],
    )}>
      {status}
    </span>
  );
}

// ── Row actions ───────────────────────────────────────────────────────────────

function RowActions({ page, onRefresh }: { page: CmsPage; onRefresh: () => void }): React.ReactElement {
  const { addToast } = useToast();
  const qc = useQueryClient();

  const invalidate = () => { void qc.invalidateQueries({ queryKey: cmsPageKeys.all() }); onRefresh(); };

  const publish = useMutation({
    mutationFn: () => publishPage(page.id),
    onSuccess:  () => { invalidate(); addToast(`"${page.title}" published.`); },
    onError:    () => { addToast('Failed to publish page.', 'error'); },
  });

  const unpublish = useMutation({
    mutationFn: () => unpublishPage(page.id),
    onSuccess:  () => { invalidate(); addToast(`"${page.title}" moved to draft.`, 'info'); },
    onError:    () => { addToast('Failed to unpublish page.', 'error'); },
  });

  const busy = publish.isPending || unpublish.isPending;

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/website-cms/pages/${page.id}`}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Edit
      </Link>

      {page.status !== 'published' ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => publish.mutate()}
          className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
        >
          {publish.isPending ? 'Publishing…' : 'Publish'}
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => unpublish.mutate()}
          className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-colors"
        >
          {unpublish.isPending ? 'Unpublishing…' : 'Unpublish'}
        </button>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { value: '',          label: 'All'       },
  { value: 'published', label: 'Published' },
  { value: 'draft',     label: 'Draft'     },
  { value: 'archived',  label: 'Archived'  },
] as const;

export default function CmsPagesPage(): React.ReactElement {
  const [status, setStatus] = useState<string>('');
  const [page, setPage]     = useState(1);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: cmsPageKeys.list({ page, status }),
    queryFn:  () => fetchCmsPages({ page, limit: 25, status: status || undefined }),
  });

  const pages = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 25);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <Link href="/website-cms" className="hover:text-gray-600 transition-colors">Website CMS</Link>
            <span>/</span>
            <span className="text-gray-600 font-medium">Pages</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Pages</h2>
          <p className="mt-0.5 text-xs text-gray-400">{total} page{total !== 1 ? 's' : ''} total</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => { setStatus(t.value); setPage(1); }}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              status === t.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              {['Title', 'Slug', 'Status', 'Updated', 'Actions'].map((h) => (
                <th key={h} scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && (
              <tr><td colSpan={5} className="py-12 text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading…
                </div>
              </td></tr>
            )}
            {error && (
              <tr><td colSpan={5} className="py-12 text-center text-sm text-red-500">
                Failed to load pages.
              </td></tr>
            )}
            {!isLoading && !error && pages.length === 0 && (
              <tr><td colSpan={5} className="py-12 text-center text-sm text-gray-400">
                No pages found.
              </td></tr>
            )}
            {pages.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{p.title}</span>
                    {p.isHomepage && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">Home</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-gray-500">/{p.slug}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                  {new Date(p.updatedAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3">
                  <RowActions page={p} onRefresh={() => void refetch()} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-gray-50">
              Previous
            </button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-gray-50">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
