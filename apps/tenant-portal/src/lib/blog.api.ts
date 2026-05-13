/**
 * blog.api.ts — typed API call functions for the blog management module.
 *
 * Every function maps 1:1 to a BlogController endpoint.
 * TanStack Query keys are exported as constants alongside each function
 * so query invalidation is co-located with the call definition.
 *
 * The apiClient is session-aware — it injects Authorization and x-tenant-id
 * headers from the NextAuth session automatically.
 */
import { apiClient } from '@/lib/api/client';
import type {
  BlogPost,
  BlogCategory,
  BlogCategoryWithCount,
  PaginatedPosts,
  CreatePostInput,
  UpdatePostInput,
  BulkStatusInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  PostFilters,
} from '@/types/blog.types';

const BASE = '/api/v1/cms/blog';

// ─────────────────────────────────────────────────────────────────────────────
// Query key factory — strongly typed, co-located
// ─────────────────────────────────────────────────────────────────────────────

export const blogKeys = {
  all:          () => ['blog'] as const,
  posts:        () => [...blogKeys.all(), 'posts'] as const,
  postList:     (f: Partial<PostFilters>) => [...blogKeys.posts(), f] as const,
  postDetail:   (id: string) => [...blogKeys.posts(), id] as const,
  postFeatured: () => [...blogKeys.posts(), 'featured'] as const,
  categories:   () => [...blogKeys.all(), 'categories'] as const,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Posts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lists posts with optional filters.
 * Used by the post list page with pagination and status/category/search filters.
 */
export async function fetchPosts(filters: Partial<PostFilters> = {}): Promise<PaginatedPosts> {
  const params: Record<string, string> = {};

  if (filters.page)                      params['page']       = String(filters.page);
  if (filters.limit)                     params['limit']      = String(filters.limit);
  if (filters.status && filters.status !== 'all') params['status']     = filters.status;
  if (filters.categoryId)                params['categoryId'] = filters.categoryId;
  if (filters.search?.trim())            params['search']     = filters.search.trim();

  const res = await apiClient.get<PaginatedPosts>(`${BASE}/posts`, { params });
  return res.data;
}

export async function fetchPost(id: string): Promise<BlogPost> {
  const res = await apiClient.get<BlogPost>(`${BASE}/posts/${id}`);
  return res.data;
}

export async function fetchPostBySlug(slug: string): Promise<BlogPost> {
  const res = await apiClient.get<BlogPost>(`${BASE}/posts/by-slug/${encodeURIComponent(slug)}`);
  return res.data;
}

export async function fetchFeaturedPosts(limit = 5): Promise<BlogPost[]> {
  const res = await apiClient.get<BlogPost[]>(`${BASE}/posts/featured`, { params: { limit } });
  return res.data;
}

export async function fetchRelatedPosts(postId: string, limit = 4): Promise<BlogPost[]> {
  const res = await apiClient.get<BlogPost[]>(`${BASE}/posts/${postId}/related`, { params: { limit } });
  return res.data;
}

export async function createPost(input: CreatePostInput): Promise<BlogPost> {
  const res = await apiClient.post<BlogPost>(`${BASE}/posts`, input);
  return res.data;
}

export async function updatePost(id: string, input: UpdatePostInput): Promise<BlogPost> {
  const res = await apiClient.patch<BlogPost>(`${BASE}/posts/${id}`, input);
  return res.data;
}

export async function deletePost(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/posts/${id}`);
}

export async function bulkUpdateStatus(input: BulkStatusInput): Promise<{ updated: number }> {
  const res = await apiClient.post<{ updated: number }>(`${BASE}/posts/bulk-status`, input);
  return res.data;
}

export async function triggerPublishScheduled(): Promise<{ published: number }> {
  const res = await apiClient.post<{ published: number }>(`${BASE}/posts/publish-scheduled`, {});
  return res.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchCategories(): Promise<BlogCategoryWithCount[]> {
  const res = await apiClient.get<BlogCategoryWithCount[]>(`${BASE}/categories`);
  return res.data;
}

export async function fetchCategory(id: string): Promise<BlogCategory> {
  const res = await apiClient.get<BlogCategory>(`${BASE}/categories/${id}`);
  return res.data;
}

export async function createCategory(input: CreateCategoryInput): Promise<BlogCategory> {
  const res = await apiClient.post<BlogCategory>(`${BASE}/categories`, input);
  return res.data;
}

export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<BlogCategory> {
  const res = await apiClient.patch<BlogCategory>(`${BASE}/categories/${id}`, input);
  return res.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/categories/${id}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Slug generation helper (client-side only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a post title into a URL-safe slug.
 * Mirrors the backend Matches() validator rule.
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 255);
}
