import { notFound }              from 'next/navigation';
import type { Metadata }         from 'next';
import { headers }               from 'next/headers';
import { SectionRenderer }       from '@/components/sections/section-renderer';
import { fetchPublishedSections } from '@/lib/homepage.api';

/**
 * Dynamic catch-all route — [...slug]/page.tsx
 *
 * Handles all CMS-driven pages except the root (/) which is served by page.tsx.
 * Resolves the tenant from request headers (set by nginx from the subdomain or
 * x-tenant-id header), then fetches CMS sections for the requested page slug.
 *
 * Rendering strategy: ISR (revalidate: 60s)
 */

interface PageParams {
  params: { slug: string[] };
}

async function resolvePageId(
  slugParts: string[],
  tenantId:  string,
): Promise<string | null> {
  const apiBase = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3002';

  const slug = slugParts.join('/');
  const res = await fetch(
    `${apiBase}/api/v1/cms/pages/by-slug/${encodeURIComponent(slug)}`,
    {
      headers: { 'x-tenant-id': tenantId },
      next:    { revalidate: 300 },
    },
  );
  if (!res.ok) return null;
  const page = await res.json() as { id: string };
  return page.id;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  return {
    title: params.slug.join(' / '),
  };
}

export default async function DynamicCmsPage({ params }: PageParams): Promise<React.ReactElement> {
  const slugParts = params.slug;

  const headerList = headers();
  const tenantId   = headerList.get('x-tenant-id');

  if (!tenantId) {
    notFound();
  }

  const pageId = await resolvePageId(slugParts, tenantId);

  if (!pageId) {
    notFound();
  }

  const sections = await fetchPublishedSections(pageId, tenantId);

  if (sections.length === 0) {
    notFound();
  }

  return (
    <main id="main-content">
      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </main>
  );
}
