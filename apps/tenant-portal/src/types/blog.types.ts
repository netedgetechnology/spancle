/**
 * blog.types.ts — Frontend type mirror for the blog API.
 *
 * These types mirror the backend entity shapes returned by the API.
 * They are NOT imported from the backend to preserve the frontend/backend
 * boundary. Any breaking API change must be reflected here.
 */

// ── Status & lifecycle ─────────────────────────────────────────────────────────

export type BlogPostStatus = 'draft' | 'published' | 'archived' | 'scheduled';
export type BlogPostStatusFilter = BlogPostStatus | 'all';

// ── SEO ───────────────────────────────────────────────────────────────────────

export interface BlogPostSeo {
  title:              string | null;
  description:        string | null;
  keywords:           string | null;
  canonicalUrl:       string | null;
  robots:             string | null;
  ogTitle:            string | null;
  ogDescription:      string | null;
  ogImageUrl:         string | null;
  ogType:             string | null;
  twitterCard:        string | null;
  twitterTitle:       string | null;
  twitterDescription: string | null;
  twitterImageUrl:    string | null;
  schemaJsonLd:       Record<string, unknown> | null;
}

// ── Category ──────────────────────────────────────────────────────────────────

export interface BlogCategory {
  id:          string;
  tenantId:    string;
  name:        string;
  slug:        string;
  description: string | null;
  sortOrder:   number;
  isDeleted:   boolean;
  createdAt:   string;
  updatedAt:   string;
}

export interface BlogCategoryWithCount extends BlogCategory {
  postCount: number;
}

// ── Post ──────────────────────────────────────────────────────────────────────

export interface BlogPost {
  id:                 string;
  tenantId:           string;
  title:              string;
  slug:               string;
  content:            Record<string, unknown> | null;
  excerpt:            string | null;
  status:             BlogPostStatus;
  publishedAt:        string | null;
  categoryId:         string | null;
  tags:               string | null;
  readingTimeMinutes: number | null;
  featuredImageId:    string | null;
  featuredImageUrl:   string | null;
  authorId:           string | null;
  lastEditedBy:       string | null;
  viewCount:          number;
  isFeatured:         boolean;
  isDeleted:          boolean;
  seo:                BlogPostSeo;
  createdAt:          string;
  updatedAt:          string;
}

// ── Paginated list response ───────────────────────────────────────────────────

export interface PaginatedPosts {
  data:  BlogPost[];
  total: number;
}

// ── Form / mutation inputs ────────────────────────────────────────────────────

export interface CreatePostInput {
  title:           string;
  slug:            string;
  content?:        Record<string, unknown>;
  excerpt?:        string;
  status?:         BlogPostStatus;
  publishedAt?:    string;        // ISO-8601 UTC
  categoryId?:     string;
  tags?:           string;        // comma-separated
  featuredImageId?: string;
  featuredImageUrl?: string;
  isFeatured?:     boolean;
  seo?:            Partial<BlogPostSeo>;
}

export type UpdatePostInput = Partial<CreatePostInput>;

export interface BulkStatusInput {
  ids:    string[];
  status: BlogPostStatus;
}

export interface CreateCategoryInput {
  name:        string;
  slug:        string;
  description?: string;
  sortOrder?:  number;
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

// ── Filter state (admin UI) ───────────────────────────────────────────────────

export interface PostFilters {
  status:     BlogPostStatusFilter;
  categoryId: string | '';
  search:     string;
  page:       number;
  limit:      number;
}

export const DEFAULT_POST_FILTERS: PostFilters = {
  status:     'all',
  categoryId: '',
  search:     '',
  page:       1,
  limit:      20,
};
