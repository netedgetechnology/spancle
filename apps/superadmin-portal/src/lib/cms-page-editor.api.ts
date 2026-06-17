/**
 * cms-page-editor.api.ts — Single CMS page fetch + update.
 * Uses saas-platform-service PATCH /api/v1/cms/pages/:id.
 */

import { apiClient } from '@/lib/api/client';
import type { CmsPage } from '@/lib/cms-pages.api';

export interface CmsPageUpdatePayload {
  title?:  string;
  slug?:   string;
  status?: 'draft' | 'published' | 'archived' | 'scheduled';
  seo?: {
    title?:        string;
    description?:  string;
    robots?:       string;
    canonicalUrl?: string;
  };
}

export async function getPage(pageId: string): Promise<CmsPage> {
  const res = await apiClient.get<CmsPage>(`/api/v1/cms/pages/${pageId}`);
  return res.data;
}

export async function updatePage(
  pageId:  string,
  payload: CmsPageUpdatePayload,
): Promise<CmsPage> {
  const res = await apiClient.patch<CmsPage>(`/api/v1/cms/pages/${pageId}`, payload);
  return res.data;
}
