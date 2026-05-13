'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@spancle/ui-kit';
import { useToast } from '@spancle/ui-kit';
import { CategoryManager } from '@/components/blog/category-manager';
import { PageLoader } from '@/components/ui/page-loader';
import { ErrorDisplay } from '@/components/ui/error-display';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  blogKeys,
} from '@/lib/blog.api';
import type { CreateCategoryInput, UpdateCategoryInput } from '@/types/blog.types';

/**
 * Categories management page — /dashboard/blog/categories
 *
 * Provides full CRUD for blog categories:
 *   - View all categories with post counts
 *   - Add new categories
 *   - Edit name/slug/description inline
 *   - Delete (guarded — cannot delete categories with posts)
 *
 * Navigation:
 *   Back to posts list via header button
 */
export default function CategoriesPage(): React.ReactElement {
  const router      = useRouter();
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  const {
    data:      categories = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: blogKeys.categories(),
    queryFn:  fetchCategories,
  });

  const invalidate = (): void => {
    queryClient.invalidateQueries({ queryKey: blogKeys.categories() });
  };

  const addMutation = useMutation({
    mutationFn: (input: CreateCategoryInput) => createCategory(input),
    onSuccess: (cat) => {
      invalidate();
      toast({ title: `Category "${cat.name}" created`, intent: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to create category', description: err.message, intent: 'error' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
      updateCategory(id, input),
    onSuccess: (cat) => {
      invalidate();
      toast({ title: `Category "${cat.name}" updated`, intent: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to update category', description: err.message, intent: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      invalidate();
      toast({ title: 'Category deleted', intent: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to delete category', description: err.message, intent: 'error' });
    },
  });

  const isBusy = addMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push('/blog')}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to posts
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Blog categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Organise your posts into categories. Post counts reflect published posts only.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isLoading || isBusy}
        >
          Refresh
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <PageLoader message="Loading categories…" />
      ) : error ? (
        <ErrorDisplay
          title="Failed to load categories"
          message={(error as Error).message}
          retry={() => void refetch()}
        />
      ) : (
        <CategoryManager
          categories={categories}
          onAdd={(input) => { void addMutation.mutateAsync(input); }}
          onUpdate={(id, input) => { void updateMutation.mutateAsync({ id, input }); }}
          onDelete={(id) => { void deleteMutation.mutateAsync(id); }}
          isLoading={isBusy}
        />
      )}
    </div>
  );
}
