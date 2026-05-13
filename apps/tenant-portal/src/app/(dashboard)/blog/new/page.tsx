'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@spancle/ui-kit';
import { PostForm } from '@/components/blog/post-form';
import { PageLoader } from '@/components/ui/page-loader';
import { createPost, fetchCategories, blogKeys } from '@/lib/blog.api';
import type { CreatePostInput } from '@/types/blog.types';

/**
 * New post page — /dashboard/blog/new
 *
 * Renders PostForm in create mode.
 * On successful save: redirects to /blog/{id}/edit so the
 * admin can continue editing without re-submitting.
 */
export default function NewPostPage(): React.ReactElement {
  const router      = useRouter();
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: blogKeys.categories(),
    queryFn:  fetchCategories,
  });

  const createMutation = useMutation({
    mutationFn: createPost,
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: blogKeys.posts() });
      toast({
        title:       'Post created',
        description: post.status === 'draft' ? 'Saved as draft.' : 'Post published.',
        intent:      'success',
      });
      router.push(`/blog/${post.id}/edit`);
    },
    onError: (err: Error) => {
      toast({
        title:       'Failed to create post',
        description: err.message,
        intent:      'error',
      });
    },
  });

  if (catsLoading) return <PageLoader message="Loading…" />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <button
          type="button"
          onClick={() => router.push('/blog')}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to posts
        </button>
        <h1 className="text-xl font-semibold text-gray-900">New post</h1>
      </div>

      <PostForm
        categories={categories}
        onSave={(input) => { void createMutation.mutateAsync(input as CreatePostInput); }}
        onDiscard={() => router.push('/blog')}
        isSaving={createMutation.isPending}
      />
    </div>
  );
}
