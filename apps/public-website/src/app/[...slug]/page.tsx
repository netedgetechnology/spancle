import { notFound }             from 'next/navigation';
import { unstable_noStore }     from 'next/cache';
import type { Metadata }        from 'next';
import { SectionRenderer }      from '@/components/sections/section-renderer';
import { PublicHeader }         from '@/components/layout/public-header';
import { PublicFooter }         from '@/components/layout/public-footer';
import { fetchPublishedSections, fetchPageBySlug } from '@/lib/homepage.api';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { slug: string[] };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  unstable_noStore();
  const tenantId = process.env['NEXT_PUBLIC_DEFAULT_TENANT_ID'] ?? '';
  const slug     = params.slug.join('/');
  if (!tenantId) return { title: 'Page not found', robots: 'noindex,nofollow' };

  try {
    const page = await fetchPageBySlug(slug, tenantId);
    if (!page) return { title: 'Page not found', robots: 'noindex,nofollow' };
    const seo = (page.seo ?? {}) as Record<string, string>;
    return {
      title:       seo['metaTitle']       || page.title,
      description: seo['metaDescription'] || undefined,
      robots:      seo['robots']          || 'index,follow',
      alternates:  seo['canonicalUrl'] ? { canonical: seo['canonicalUrl'] } : undefined,
    };
  } catch {
    return { title: 'Page not found', robots: 'noindex,nofollow' };
  }
}

export default async function CmsPage({ params }: PageProps): Promise<React.ReactElement> {
  // Opt out of ALL caching — required for notFound() to return HTTP 404 in standalone
  unstable_noStore();

  const tenantId = process.env['NEXT_PUBLIC_DEFAULT_TENANT_ID'] ?? '';
  const slug     = params.slug.join('/');

  if (!tenantId) notFound();

  const page = await fetchPageBySlug(slug, tenantId);
  if (!page) notFound();

  const sections = await fetchPublishedSections(page.id, tenantId);
  if (sections.length === 0) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicHeader />
      <main id="main-content" className="flex-1">
        {sections.map((section) => (
          <SectionRenderer key={section.id} section={section} />
        ))}
      </main>
      <PublicFooter />
    </div>
  );
}
