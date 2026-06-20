/**
 * cms-pages.api.ts — CMS page management API calls.
 * Routes to saas-platform-service via /api/v1/cms/pages.
 */

import { apiClient } from '@/lib/api/client';

export type PageStatus = 'draft' | 'published' | 'archived' | 'scheduled';

export interface CmsPage {
  id:          string;
  title:       string;
  slug:        string;
  status:      PageStatus;
  isHomepage:  boolean;
  updatedAt:   string;
  seo:         Record<string, unknown> | null;
}

export interface CmsPagesResponse {
  data:  CmsPage[];
  total: number;
}

export const cmsPageKeys = {
  all:  () => ['cms-pages'] as const,
  list: (p: { page?: number; status?: string }) => [...cmsPageKeys.all(), 'list', p] as const,
};

export async function fetchCmsPages(params: { page?: number; limit?: number; status?: string } = {}): Promise<CmsPagesResponse> {
  const query = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));
  const res = await apiClient.get<CmsPagesResponse>('/cms/pages', { params: query });
  return res.data;
}

export async function publishPage(id: string): Promise<CmsPage> {
  const res = await apiClient.patch<CmsPage>(`/cms/pages/${id}`, { status: 'published' });
  return res.data;
}

export async function unpublishPage(id: string): Promise<CmsPage> {
  const res = await apiClient.patch<CmsPage>(`/cms/pages/${id}`, { status: 'draft' });
  return res.data;
}
