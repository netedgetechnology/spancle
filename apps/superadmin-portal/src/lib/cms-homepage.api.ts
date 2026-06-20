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

/** Lists all sections (draft + published + archived) for the homepage editor. */
export async function fetchHomepageSections(pageId: string): Promise<HomepageSection[]> {
  const res = await apiClient.get<HomepageSection[]>(`/cms/homepage/pages/${pageId}/sections`);
  return res.data;
}

export async function getHomepageSection(id: string): Promise<HomepageSection> {
  const res = await apiClient.get<HomepageSection>(`/cms/homepage/sections/${id}`);
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
  const res = await apiClient.patch<HomepageSection>(`/cms/homepage/sections/${id}`, payload);
  return res.data;
}

export async function publishHomepageSection(id: string): Promise<HomepageSection> {
  return updateHomepageSection(id, { status: 'published' });
}

export async function unpublishHomepageSection(id: string): Promise<HomepageSection> {
  return updateHomepageSection(id, { status: 'draft' });
}
