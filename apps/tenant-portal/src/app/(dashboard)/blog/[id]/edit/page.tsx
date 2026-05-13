'use client';

import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@spancle/ui-kit';
import { Badge } from '@spancle/ui-kit';
import { PostForm } from '@/components/blog/post-form';
import { PageLoader } from '@/components/ui/page-loader';
import { ErrorDisplay } from '@/components/ui/error-display';
import { fetchPost, fetchCategories, updatePost, blogKeys } from '@/lib/blog.api';
import type { UpdatePostInput } from '@/types/blog.types';

/**
 * Edit post page — /dashboard/blog/[id]/edit
 *
 * Loads the existing post by ID, then renders PostForm in edit mode.
 * Successful save re-fetches the post detail to show latest state.
 * Back navigation returns to the post list.
 */
export default function EditPostPage(): React.ReactElement {
  const params      = useParams<{ id: string }>();
  const router      = useRouter();
  const queryClient = useQueryClient();
  const { toast }   = useToast();
  const postId      = params.id;

  const {
    data:      post,
    isLoading: postLoading,
    error:     postError,
    refetch,
  } = useQuery({
    queryKey: blogKeys.postDetail(postId),
    queryFn:  () => fetchPost(postId),
    enabled:  !!postId,
  });

  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: blogKeys.categories(),
    queryFn:  fetchCategories,
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdatePostInput) => updatePost(postId, input),
    onSuccess: (updated) => {
      // Update cache with fresh data
      queryClient.setQueryData(blogKeys.postDetail(postId), updated);
      queryClient.invalidateQueries({ queryKey: blogKeys.posts() });
      toast({
        title:       'Post saved',
        description: updated.status === 'published' ? 'Post is live.' : `Saved as ${updated.status}.`,
        intent:      'success',
      });
    },
    onError: (err: Error) => {
      toast({
        title:       'Failed to save post',
        description: err.message,
        intent:      'error',
      });
    },
  });

  if (postLoading || catsLoading) return <PageLoader message="Loading post…" />;

  if (postError) {
    return (
      <ErrorDisplay
        title="Post not found"
        message={(postError as Error).message}
        retry={() => void refetch()}
      />
    );
  }

  if (!post) return <ErrorDisplay title="Post not found" />;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
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

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 line-clamp-1">{post.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono text-gray-400">/{post.slug}</span>
              <Badge
                intent={
                  post.status === 'published' ? 'success'
                    : post.status === 'scheduled' ? 'warning'
                      : post.status === 'archived' ? 'danger'
                        : 'default'
                }
                size="sm"
                dot
              >
                {post.status}
              </Badge>
              {post.isFeatured && <Badge intent="info" size="sm">Featured</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>
              {post.readingTimeMinutes
                ? `~${post.readingTimeMinutes} min read`
                : null
              }
            </span>
            <span>{post.viewCount} views</span>
          </div>
        </div>
      </div>

      {/* Form */}
      <PostForm
        post={post}
        categories={categories}
        onSave={(input) => { void updateMutation.mutateAsync(input as UpdatePostInput); }}
        onDiscard={() => void refetch()}
        isSaving={updateMutation.isPending}
      />
    </div>
  );
}
