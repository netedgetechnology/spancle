import { notFound }            from 'next/navigation';
import type { Metadata }        from 'next';
import { headers }              from 'next/headers';
import { SectionRenderer }      from '@/components/sections/section-renderer';
import { fetchPublishedSections } from '@/lib/homepage.api';

/**
 * Dynamic catch-all route — [[...slug]]/page.tsx
 *
 * Resolves the tenant from the incoming request headers (set by nginx
 * from the subdomain or x-tenant-id header), then fetches the CMS
 * sections for the requested page slug.
 *
 * Rendering strategy: ISR (revalidate: 60s)
 *   - Pages are statically generated on first request
 *   - Re-fetched in the background every 60 seconds
 *   - Admin publishes a new section → live within 60s
 *
 * Route resolution:
 *   / (root)         → slug = ''  → fetch homepage sections
 *   /about           → slug = 'about' → fetch page by slug → get its sections
 *   /features/pro    → slug = 'features/pro' → nested page
 *
 * Note: This catch-all has the lowest priority in Next.js routing.
 * Static routes (/blog, /contact) defined as explicit routes take precedence.
 */

interface PageParams {
  params: { slug?: string[] };
}

/**
 * Resolves the CMS page ID for a given slug.
 *
 * In Sprint 2 this will call the page API to resolve slug → pageId.
 * For now we use a placeholder approach: treat the slug as the pageId
 * when it looks like a UUID, otherwise use the tenant's default homepage.
 */
async function resolvePageId(
  slugParts: string[],
  tenantId:  string,
): Promise<string | null> {
  const apiBase = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3002';

  if (slugParts.length === 0) {
    // Root page — fetch the homepage page ID
    const res = await fetch(
      `${apiBase}/api/v1/cms/pages/homepage`,
      {
        headers: { 'x-tenant-id': tenantId },
        next:    { revalidate: 300 },
      },
    );
    if (!res.ok) return null;
    const page = await res.json() as { id: string };
    return page.id;
  }

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
    title: params.slug?.join(' / ') ?? 'Home',
  };
}

export default async function DynamicCmsPage({ params }: PageParams): Promise<React.ReactElement> {
  const slugParts = params.slug ?? [];

  // Resolve tenant from request headers (set by nginx → Next.js middleware)
  const headerList  = headers();
  const tenantId    = headerList.get('x-tenant-id');

  if (!tenantId) {
    notFound();
  }

  // Resolve page ID from slug
  const pageId = await resolvePageId(slugParts, tenantId);

  if (!pageId) {
    notFound();
  }

  // Fetch published sections (ISR — cached for 60s)
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
