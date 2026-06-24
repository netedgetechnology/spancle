/**
 * cms-homepage.api.ts — Homepage section management API calls.
 * Routes to saas-platform-service via /cms/homepage.
 * apiClient.baseURL already includes /api/v1 — never prefix paths here.
 */

import { apiClient } from '@/lib/api/client';

export type SectionStatus = 'draft' | 'published' | 'archived';
export type SectionType =
  | 'hero_banner'
  | 'feature_highlights'
  | 'testimonials'
  | 'pricing_preview'
  | 'faq'
  | 'cta';

export interface HomepageSection {
  id:          string;
  pageId:      string;
  sectionType: SectionType;
  adminLabel:  string;
  payload:     Record<string, unknown>;
  sortOrder:   number;
  status:      SectionStatus;
  isVisible:   boolean;
  updatedAt:   string;
}

export const homepageSectionKeys = {
  all:  () => ['cms-homepage-sections'] as const,
  list: (pageId: string) => [...homepageSectionKeys.all(), 'list', pageId] as const,
};

// The CMS pages and sections live under the platform's saas-platform tenant,
// which may differ from the identity-service platform tenant stored in the
// superadmin session. Override x-tenant-id for all CMS homepage calls.
const CMS_TENANT_ID = process.env['NEXT_PUBLIC_DEFAULT_TENANT_ID'] ?? '';

function cmsHeaders() {
  return CMS_TENANT_ID ? { 'x-tenant-id': CMS_TENANT_ID } : {};
}

/** Lists all sections (draft + published + archived) for the homepage editor. */
export async function fetchHomepageSections(pageId: string): Promise<HomepageSection[]> {
  // eslint-disable-next-line no-console
  console.log('[homepage-debug] fetchHomepageSections pageId', pageId);

  const res = await apiClient.get(`/cms/homepage/pages/${pageId}/sections`, {
    headers: cmsHeaders(),
  });

  // eslint-disable-next-line no-console
  console.log('[homepage-debug] sections response', res.data);

  return res.data;
}

export async function getHomepageSection(id: string): Promise<HomepageSection> {
  const res = await apiClient.get<HomepageSection>(`/cms/homepage/sections/${id}`, {
    headers: cmsHeaders(),
  });
  return res.data;
}

export interface HomepageSectionUpdatePayload {
  adminLabel?: string;
  payload?:    Record<string, unknown>;
  status?:     SectionStatus;
  isVisible?:  boolean;
}

export async function updateHomepageSection(
  id:      string,
  payload: HomepageSectionUpdatePayload,
): Promise<HomepageSection> {
  const res = await apiClient.patch<HomepageSection>(`/cms/homepage/sections/${id}`, payload, {
    headers: cmsHeaders(),
  });
  return res.data;
}

export async function publishHomepageSection(id: string): Promise<HomepageSection> {
  return updateHomepageSection(id, { status: 'published' });
}

export async function unpublishHomepageSection(id: string): Promise<HomepageSection> {
  return updateHomepageSection(id, { status: 'draft' });
}
