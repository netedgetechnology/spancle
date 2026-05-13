// @ts-nocheck
import type { HomepageSection } from '@/lib/homepage.api';
import { HeroBannerSection }          from './hero-banner.section';
import { FeatureHighlightsSection }   from './feature-highlights.section';
import { TestimonialsSection }        from './testimonials.section';
import { PricingPreviewSection }      from './pricing-preview.section';
import { FaqSection }                 from './faq.section';
import { CtaSection }                 from './cta.section';
import type {
  HeroBannerPayload,
  FeatureHighlightsPayload,
  TestimonialsPayload,
  PricingPreviewPayload,
  FaqPayload,
  CtaSectionPayload,
} from '@/types/homepage.types';

interface SectionRendererProps {
  section: HomepageSection;
}

/**
 * SectionRenderer — the single entry point for all homepage section rendering.
 *
 * Receives a `HomepageSection` from the API and dispatches to the correct
 * React component based on `sectionType`.
 *
 * Design decisions:
 *   - Switch dispatch (not a map) — TypeScript narrows payload type per case
 *   - Unknown sectionType returns null — future types don't crash the renderer
 *   - Each section is wrapped in a keyed fragment for React reconciliation
 *   - `data-section-id` and `data-section-type` attributes for admin overlay (Sprint 3)
 */
export function SectionRenderer({ section }: SectionRendererProps): React.ReactElement | null {
  const { id, sectionType, payload } = section;

  const dataAttrs = {
    'data-section-id':   id,
    'data-section-type': sectionType,
  } as React.HTMLAttributes<HTMLElement>;

  switch (sectionType) {
    case 'hero_banner':
      return (
        <div key={id} {...dataAttrs}>
          <HeroBannerSection payload={payload as HeroBannerPayload} />
        </div>
      );

    case 'feature_highlights':
      return (
        <div key={id} {...dataAttrs}>
          <FeatureHighlightsSection payload={payload as FeatureHighlightsPayload} />
        </div>
      );

    case 'testimonials':
      return (
        <div key={id} {...dataAttrs}>
          <TestimonialsSection payload={payload as TestimonialsPayload} />
        </div>
      );

    case 'pricing_preview':
      return (
        <div key={id} {...dataAttrs}>
          <PricingPreviewSection payload={payload as PricingPreviewPayload} />
        </div>
      );

    case 'faq':
      return (
        <div key={id} {...dataAttrs}>
          <FaqSection payload={payload as FaqPayload} />
        </div>
      );

    case 'cta':
      return (
        <div key={id} {...dataAttrs}>
          <CtaSection payload={payload as CtaSectionPayload} />
        </div>
      );

    default:
      // Unknown section type — silently skip, log in dev
      if (process.env['NODE_ENV'] === 'development') {
        console.warn(`[SectionRenderer] Unknown sectionType: "${sectionType}" — skipping`);
      }
      return null;
  }
}
