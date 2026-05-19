import { notFound }             from 'next/navigation';
import type { Metadata }        from 'next';
import { SectionRenderer }      from '@/components/sections/section-renderer';
import { fetchPublishedSections, fetchPageBySlug } from '@/lib/homepage.api';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { slug: string[] };
}

// Tenant for www.spancle.com public website — server-only env var, read at request time
const PUBLIC_TENANT_ID = process.env['NEXT_PUBLIC_DEFAULT_TENANT_ID'] ?? '';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug     = params.slug.join('/');
  const tenantId = PUBLIC_TENANT_ID;
  if (!tenantId) return { title: slug };

  try {
    const page = await fetchPageBySlug(slug, tenantId);
    if (!page) return { title: slug };
    const seo = (page.seo ?? {}) as Record<string, string>;
    return {
      title:       seo['metaTitle']       || page.title,
      description: seo['metaDescription'] || undefined,
      robots:      seo['robots']          || 'index,follow',
      alternates:  seo['canonicalUrl'] ? { canonical: seo['canonicalUrl'] } : undefined,
    };
  } catch {
    return { title: slug };
  }
}

export default async function CmsPage({ params }: PageProps): Promise<React.ReactElement> {
  const slug     = params.slug.join('/');
  const tenantId = PUBLIC_TENANT_ID;

  if (!tenantId) notFound();

  // Resolve page
  const page = await fetchPageBySlug(slug, tenantId);
  if (!page) notFound();

  // Fetch published sections for this page
  const sections = await fetchPublishedSections(page.id, tenantId);
  if (sections.length === 0) notFound();

  return (
    <main id="main-content">
      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </main>
  );
}
