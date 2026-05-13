import { Column } from 'typeorm';

/**
 * SeoFieldsEmbed — TypeORM embedded column group for SEO metadata.
 *
 * Embedded into any entity that needs SEO fields by declaring:
 *   @Column(() => SeoFieldsEmbed)
 *   seo!: SeoFieldsEmbed;
 *
 * Column names in the parent table are prefixed with 'seo_' by TypeORM
 * (e.g. seo_title, seo_description, seo_keywords).
 *
 * Open Graph and Twitter Card fields are included for social sharing.
 * Schema.org JSON-LD blob stored as JSONB for extensibility.
 */
export class SeoFieldsEmbed {
  /** <title> tag — max 60 chars for SERP display */
  @Column({ name: 'seo_title', type: 'varchar', length: 120, nullable: true })
  title!: string | null;

  /** <meta name="description"> — max 160 chars for SERP snippet */
  @Column({ name: 'seo_description', type: 'varchar', length: 320, nullable: true })
  description!: string | null;

  /** <meta name="keywords"> — comma-separated, largely ignored by modern search */
  @Column({ name: 'seo_keywords', type: 'varchar', length: 500, nullable: true })
  keywords!: string | null;

  /** Canonical URL — prevents duplicate content penalty */
  @Column({ name: 'seo_canonical_url', type: 'varchar', length: 2048, nullable: true })
  canonicalUrl!: string | null;

  /** robots meta tag: 'index,follow' | 'noindex,follow' | 'noindex,nofollow' */
  @Column({ name: 'seo_robots', type: 'varchar', length: 64, nullable: true, default: 'index,follow' })
  robots!: string | null;

  // ── Open Graph ──────────────────────────────────────────────────────────────

  @Column({ name: 'og_title', type: 'varchar', length: 120, nullable: true })
  ogTitle!: string | null;

  @Column({ name: 'og_description', type: 'varchar', length: 320, nullable: true })
  ogDescription!: string | null;

  @Column({ name: 'og_image_url', type: 'varchar', length: 2048, nullable: true })
  ogImageUrl!: string | null;

  /** og:type — article | website | profile */
  @Column({ name: 'og_type', type: 'varchar', length: 32, nullable: true, default: 'website' })
  ogType!: string | null;

  // ── Twitter Card ────────────────────────────────────────────────────────────

  /** summary | summary_large_image | player | app */
  @Column({ name: 'twitter_card', type: 'varchar', length: 32, nullable: true, default: 'summary_large_image' })
  twitterCard!: string | null;

  @Column({ name: 'twitter_title', type: 'varchar', length: 120, nullable: true })
  twitterTitle!: string | null;

  @Column({ name: 'twitter_description', type: 'varchar', length: 320, nullable: true })
  twitterDescription!: string | null;

  @Column({ name: 'twitter_image_url', type: 'varchar', length: 2048, nullable: true })
  twitterImageUrl!: string | null;

  // ── Schema.org ──────────────────────────────────────────────────────────────

  /** JSON-LD structured data blob — stored as JSONB, injected as <script type="application/ld+json"> */
  @Column({ name: 'schema_json_ld', type: 'jsonb', nullable: true })
  schemaJsonLd!: Record<string, unknown> | null;
}
