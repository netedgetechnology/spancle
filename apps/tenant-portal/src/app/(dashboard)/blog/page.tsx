'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Select } from '@spancle/ui-kit';
import { useToast } from '@spancle/ui-kit';
import { PostTable } from '@/components/blog/post-table';
import { PageLoader } from '@/components/ui/page-loader';
import { ErrorDisplay } from '@/components/ui/error-display';
import {
  fetchPosts,
  fetchCategories,
  deletePost,
  bulkUpdateStatus,
  blogKeys,
} from '@/lib/blog.api';
import type {
  BlogPostStatus,
  BlogPostStatusFilter,
  PostFilters,
} from '@/types/blog.types';

const STATUS_FILTER_OPTIONS = [
  { value: 'all',       label: 'All posts' },
  { value: 'draft',     label: 'Drafts' },
  { value: 'published', label: 'Published' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'archived',  label: 'Archived' },
];

/**
 * Blog post list page — /dashboard/blog
 *
 * Features:
 *   - Paginated post table with status/category/search filters
 *   - Quick status filter tabs
 *   - Bulk status update with confirmation
 *   - Per-post delete with confirmation
 *   - Navigation to create and edit pages
 */
export default function BlogListPage(): React.ReactElement {
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const { toast }    = useToast();

  const [filters, setFilters] = useState<PostFilters>({
    status:     'all',
    categoryId: '',
    search:     '',
    page:       1,
    limit:      20,
  });
  const [searchInput, setSearchInput] = useState('');

  const updateFilter = useCallback(<K extends keyof PostFilters>(key: K, val: PostFilters[K]): void => {
    setFilters((f) => ({ ...f, [key]: val, ...(key !== 'page' && { page: 1 }) }));
  }, []);

  const invalidatePosts = useCallback(
    () => queryClient.invalidateQueries({ queryKey: blogKeys.posts() }),
    [queryClient],
  );

  // ── Queries ────────────────────────────────────────────────────────────────

  const {
    data: postsData,
    isLoading: postsLoading,
    error: postsError,
    refetch,
  } = useQuery({
    queryKey: blogKeys.postList(filters),
    queryFn:  () => fetchPosts(filters),
  });

  const {
    data: categories = [],
    isLoading: catsLoading,
  } = useQuery({
    queryKey: blogKeys.categories(),
    queryFn:  fetchCategories,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      void invalidatePosts();
      toast({ title: 'Post deleted', intent: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Delete failed', description: err.message, intent: 'error' });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: bulkUpdateStatus,
    onSuccess: (data) => {
      void invalidatePosts();
      toast({ title: `${data.updated} post(s) updated`, intent: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Bulk update failed', description: err.message, intent: 'error' });
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault();
    updateFilter('search', searchInput);
  };

  const handleDelete = (id: string): void => {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    deleteMutation.mutate(id);
  };

  const handleBulkStatus = (ids: string[], status: BlogPostStatus): void => {
    bulkMutation.mutate({ ids, status });
  };

  const isBusy = deleteMutation.isPending || bulkMutation.isPending;

  return (
    <div className="flex flex-col gap-6">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Blog posts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {postsData ? `${postsData.total} post${postsData.total !== 1 ? 's' : ''} total` : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/blog/categories')}
          >
            Manage categories
          </Button>
          <Button
            size="sm"
            onClick={() => router.push('/blog/new')}
          >
            New post
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status filter tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateFilter('status', opt.value as BlogPostStatusFilter)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filters.status === opt.value
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Category filter */}
        {!catsLoading && categories.length > 0 && (
          <Select
            options={[
              { value: '', label: 'All categories' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
            value={filters.categoryId}
            onValueChange={(v) => updateFilter('categoryId', v)}
            className="w-full sm:w-48"
          />
        )}

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 sm:max-w-xs ml-auto">
          <input
            type="search"
            placeholder="Search posts…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
          <Button type="submit" size="sm" variant="outline">Search</Button>
        </form>
      </div>

      {/* Content */}
      {postsLoading ? (
        <PageLoader message="Loading posts…" />
      ) : postsError ? (
        <ErrorDisplay
          title="Failed to load posts"
          message={(postsError as Error).message}
          retry={() => void refetch()}
        />
      ) : (
        <PostTable
          posts={postsData?.data ?? []}
          categories={categories}
          total={postsData?.total ?? 0}
          page={filters.page}
          limit={filters.limit}
          onPageChange={(p) => updateFilter('page', p)}
          onEdit={(post) => router.push(`/blog/${post.id}/edit`)}
          onDelete={handleDelete}
          onBulkStatus={handleBulkStatus}
          isLoading={isBusy}
        />
      )}
    </div>
  );
}
