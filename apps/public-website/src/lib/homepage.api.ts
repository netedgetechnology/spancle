/**
 * homepage.api.ts — typed fetch functions for homepage section data.
 *
 * Used by:
 *   - public-website: Next.js page.tsx (server-side fetch)
 *   - tenant-portal:  admin editor (client-side via apiClient)
 *
 * All functions accept a tenantId so the correct x-tenant-id header is set.
 */

import type {
  HeroBannerPayload,
  FeatureHighlightsPayload,
  TestimonialsPayload,
  PricingPreviewPayload,
  FaqPayload,
  CtaSectionPayload,
  SectionType,
} from '@/types/homepage.types';

// ── Shared response shape ─────────────────────────────────────────────────────

export interface HomepageSection {
  id:          string;
  pageId:      string;
  sectionType: SectionType;
  adminLabel:  string;
  payload:     SectionPayloadMap[SectionType];
  sortOrder:   number;
  status:      'draft' | 'published' | 'archived';
  isVisible:   boolean;
  abVariant:   string | null;
  createdAt:   string;
  updatedAt:   string;
}

/** Map section type → its payload type for discriminated union usage */
export type SectionPayloadMap = {
  hero_banner:        HeroBannerPayload;
  feature_highlights: FeatureHighlightsPayload;
  testimonials:       TestimonialsPayload;
  pricing_preview:    PricingPreviewPayload;
  faq:               FaqPayload;
  cta:               CtaSectionPayload;
};

// ── Typed helper to narrow section payload ────────────────────────────────────

export function getSectionPayload<T extends SectionType>(
  section: HomepageSection,
  type:    T,
): SectionPayloadMap[T] | null {
  if (section.sectionType !== type) return null;
  return section.payload as SectionPayloadMap[T];
}

// ── Server-side fetch (Next.js RSC / page.tsx) ────────────────────────────────

// Server-only env var — not NEXT_PUBLIC so it is read at request time, not baked in at build.
// Falls back to the internal saas-platform-service address.
const API_BASE = process.env['CMS_API_URL'] ?? 'http://127.0.0.1:4002';

/**
 * Fetches published sections for a page from the saas-platform-service.
 * Designed for use in Next.js Server Components and generateStaticParams.
 *
 * @param pageId   - The CMS page UUID
 * @param tenantId - The tenant UUID (from subdomain resolution or header)
 * @returns        - Sorted array of published, visible sections
 */
export async function fetchPublishedSections(
  pageId:   string,
  tenantId: string,
): Promise<HomepageSection[]> {
  const url = `${API_BASE}/api/v1/cms/homepage/pages/${pageId}/sections/published`;

  const response = await fetch(url, {
    headers: {
      'x-tenant-id':  tenantId,
      'Content-Type': 'application/json',
    },
    // ISR: revalidate every 60 seconds
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(
      `Failed to fetch homepage sections: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<HomepageSection[]>;
}

/**
 * Fetches all sections (draft + published) for the admin editor.
 * Requires an access token.
 */
export async function fetchAllSections(
  pageId:      string,
  tenantId:    string,
  accessToken: string,
): Promise<HomepageSection[]> {
  const url = `${API_BASE}/api/v1/cms/homepage/pages/${pageId}/sections`;

  const response = await fetch(url, {
    headers: {
      'x-tenant-id':   tenantId,
      Authorization:   `Bearer ${accessToken}`,
      'Content-Type':  'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch sections: ${response.status}`);
  }

  return response.json() as Promise<HomepageSection[]>;
}
