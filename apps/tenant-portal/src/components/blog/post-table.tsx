'use client';

import { useState } from 'react';
import { Badge, Button } from '@spancle/ui-kit';
import { cn } from '@/lib/utils/cn';
import type { BlogPost, BlogPostStatus, BlogCategoryWithCount } from '@/types/blog.types';

interface PostTableProps {
  posts:         BlogPost[];
  categories:    BlogCategoryWithCount[];
  total:         number;
  page:          number;
  limit:         number;
  onPageChange:  (page: number) => void;
  onEdit:        (post: BlogPost) => void;
  onDelete:      (id: string) => void;
  onBulkStatus:  (ids: string[], status: BlogPostStatus) => void;
  isLoading?:    boolean;
}

const STATUS_INTENT = {
  published: 'success',
  draft:     'default',
  archived:  'danger',
  scheduled: 'warning',
} as const satisfies Record<BlogPostStatus, string>;

const STATUS_LABEL: Record<BlogPostStatus, string> = {
  published: 'Published',
  draft:     'Draft',
  archived:  'Archived',
  scheduled: 'Scheduled',
};

/**
 * PostTable — the main post list table for the blog admin.
 *
 * Features:
 *   - Checkbox bulk selection with select-all
 *   - Bulk status change (publish, archive, draft)
 *   - Per-row edit / delete actions
 *   - Category name resolution
 *   - Relative dates (createdAt, publishedAt)
 *   - Pagination controls
 *   - Empty state
 */
export function PostTable({
  posts,
  categories,
  total,
  page,
  limit,
  onPageChange,
  onEdit,
  onDelete,
  onBulkStatus,
  isLoading = false,
}: PostTableProps): React.ReactElement {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<BlogPostStatus>('archived');

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  const toggleAll = (): void => {
    if (selected.size === posts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(posts.map((p) => p.id)));
    }
  };

  const toggleOne = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkAction = (): void => {
    if (selected.size === 0) return;
    onBulkStatus([...selected], bulkStatus);
    setSelected(new Set());
  };

  const totalPages  = Math.ceil(total / limit);
  const allSelected = posts.length > 0 && selected.size === posts.length;
  const someSelected = selected.size > 0 && !allSelected;

  if (!isLoading && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-20 text-center">
        <svg className="h-10 w-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
        </svg>
        <p className="text-sm font-medium text-gray-500">No posts found</p>
        <p className="text-xs text-gray-400 mt-1">Try changing your filters or create a new post</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2.5">
          <span className="text-sm font-medium text-primary-800">
            {selected.size} post{selected.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as BlogPostStatus)}
              className="rounded-md border border-primary-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="published">Publish</option>
              <option value="draft">Move to draft</option>
              <option value="archived">Archive</option>
            </select>
            <Button size="sm" onClick={handleBulkAction} disabled={isLoading}>
              Apply
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
              className="text-gray-500"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200" aria-label="Blog posts">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={toggleAll}
                  aria-label="Select all posts"
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Title
              </th>
              <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Category
              </th>
              <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Date
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 w-4 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-48 rounded bg-gray-200" /></td>
                    <td className="hidden sm:table-cell px-4 py-3"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                    <td className="hidden md:table-cell px-4 py-3"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                    <td className="hidden lg:table-cell px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                    <td className="px-4 py-3" />
                  </tr>
                ))
              : posts.map((post) => (
                  <tr
                    key={post.id}
                    className={cn(
                      'hover:bg-gray-50 transition-colors',
                      selected.has(post.id) && 'bg-primary-50',
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(post.id)}
                        onChange={() => toggleOne(post.id)}
                        aria-label={`Select ${post.title}`}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>

                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-gray-900 line-clamp-1">
                          {post.title}
                        </span>
                        <span className="text-xs text-gray-400 font-mono truncate">
                          /{post.slug}
                        </span>
                        {post.isFeatured && (
                          <Badge intent="info" size="sm" className="w-fit mt-0.5">Featured</Badge>
                        )}
                      </div>
                    </td>

                    <td className="hidden sm:table-cell px-4 py-3">
                      <Badge
                        intent={STATUS_INTENT[post.status]}
                        size="sm"
                        dot
                      >
                        {STATUS_LABEL[post.status]}
                      </Badge>
                      {post.status === 'scheduled' && post.publishedAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(post.publishedAt).toLocaleDateString()}
                        </p>
                      )}
                    </td>

                    <td className="hidden md:table-cell px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {post.categoryId ? (categoryMap[post.categoryId] ?? '—') : '—'}
                      </span>
                    </td>

                    <td className="hidden lg:table-cell px-4 py-3">
                      <span className="text-xs text-gray-500">
                        {post.publishedAt
                          ? new Date(post.publishedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })
                          : new Date(post.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })
                        }
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => onEdit(post)}
                          disabled={isLoading}
                        >
                          Edit
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          className="text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => onDelete(post.id)}
                          disabled={isLoading}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1 pt-1">
          <p className="text-xs text-gray-500">
            Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total} posts
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              size="xs"
              variant="outline"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <span className="text-xs text-gray-600 tabular-nums px-1">
              {page} / {totalPages}
            </span>
            <Button
              size="xs"
              variant="outline"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
