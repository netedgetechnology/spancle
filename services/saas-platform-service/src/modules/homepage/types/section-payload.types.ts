import { z } from 'zod';

/**
 * section-payload.types.ts
 *
 * Typed payload schemas for each of the 6 homepage section types.
 * Every section is stored as a single row in cms_homepage_sections.
 * The `payload` column is JSONB — these schemas govern its shape.
 *
 * Validation happens in HomepageService before every insert/update.
 * The frontend renderer maps `sectionType` → the correct component.
 */

// ── Section type registry ──────────────────────────────────────────────────────

export const SECTION_TYPES = [
  'hero_banner',
  'feature_highlights',
  'testimonials',
  'pricing_preview',
  'faq',
  'cta',
] as const;

export type SectionType = typeof SECTION_TYPES[number];

// ── Shared sub-schemas ─────────────────────────────────────────────────────────

const CtaButtonSchema = z.object({
  label:        z.string().min(1).max(100),
  href:         z.string().max(2048),
  variant:      z.enum(['primary', 'secondary', 'outline', 'ghost']).default('primary'),
  targetBlank:  z.boolean().default(false),
});

export type CtaButton = z.infer<typeof CtaButtonSchema>;

// ── 1. Hero Banner ─────────────────────────────────────────────────────────────

export const HeroBannerPayloadSchema = z.object({
  /** Main headline — displayed as H1 */
  headline:         z.string().min(1).max(200),
  /** Supporting subheading */
  subheadline:      z.string().max(400).optional(),
  /** Short paragraph body copy */
  body:             z.string().max(1000).optional(),
  /** Primary CTA button */
  primaryCta:       CtaButtonSchema.optional(),
  /** Secondary CTA button */
  secondaryCta:     CtaButtonSchema.optional(),
  /** Background image URL */
  backgroundImageUrl: z.string().url().optional(),
  /** Overlay opacity 0–1 for text readability over image */
  overlayOpacity:   z.number().min(0).max(1).default(0.4),
  /** Background colour hex (fallback when no image) */
  bgColor:          z.string().max(20).default('#0ea5e9'),
  /** Text colour scheme */
  textScheme:       z.enum(['light', 'dark']).default('light'),
  /** Optional media asset ID for CMS linking */
  mediaAssetId:     z.string().uuid().optional(),
  /** Badge/eyebrow text shown above headline */
  eyebrowText:      z.string().max(80).optional(),
  /** Layout variant */
  layout:           z.enum(['centered', 'left-aligned', 'split']).default('centered'),
});

export type HeroBannerPayload = z.infer<typeof HeroBannerPayloadSchema>;

// ── 2. Feature Highlights ──────────────────────────────────────────────────────

const FeatureItemSchema = z.object({
  /** Icon name from lucide-react */
  iconName:    z.string().max(50).optional(),
  /** Feature title */
  title:       z.string().min(1).max(100),
  /** Feature description */
  description: z.string().max(500),
  /** Optional CTA link */
  linkHref:    z.string().max(2048).optional(),
  linkLabel:   z.string().max(80).optional(),
  /** Image or illustration URL */
  imageUrl:    z.string().url().optional(),
  /** Highlight colour — applied to icon/accent */
  accentColor: z.string().max(20).optional(),
});

export type FeatureItem = z.infer<typeof FeatureItemSchema>;

export const FeatureHighlightsPayloadSchema = z.object({
  /** Section heading */
  heading:      z.string().min(1).max(200),
  subheading:   z.string().max(400).optional(),
  /** Feature items — min 2, max 8 */
  items:        z.array(FeatureItemSchema).min(1).max(8),
  /** Grid columns layout */
  columns:      z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  /** Display style */
  displayStyle: z.enum(['card', 'icon-list', 'numbered']).default('card'),
});

export type FeatureHighlightsPayload = z.infer<typeof FeatureHighlightsPayloadSchema>;

// ── 3. Testimonials ────────────────────────────────────────────────────────────

const TestimonialItemSchema = z.object({
  /** Quote text */
  quote:       z.string().min(10).max(1000),
  /** Author full name */
  authorName:  z.string().min(1).max(100),
  /** Author role / title */
  authorRole:  z.string().max(100).optional(),
  /** Author organisation */
  authorOrg:   z.string().max(100).optional(),
  /** Author avatar URL */
  avatarUrl:   z.string().url().optional(),
  /** Star rating 1–5 */
  rating:      z.number().int().min(1).max(5).optional(),
});

export type TestimonialItem = z.infer<typeof TestimonialItemSchema>;

export const TestimonialsPayloadSchema = z.object({
  heading:      z.string().min(1).max(200),
  subheading:   z.string().max(400).optional(),
  items:        z.array(TestimonialItemSchema).min(1).max(12),
  /** Display mode */
  displayStyle: z.enum(['grid', 'carousel', 'masonry']).default('grid'),
  columns:      z.union([z.literal(1), z.literal(2), z.literal(3)]).default(3),
  /** Show star ratings */
  showRatings:  z.boolean().default(true),
  /** Background style */
  bgStyle:      z.enum(['white', 'light', 'dark', 'brand']).default('light'),
});

export type TestimonialsPayload = z.infer<typeof TestimonialsPayloadSchema>;

// ── 4. Pricing Preview ─────────────────────────────────────────────────────────

const PricingTierSchema = z.object({
  /** Internal tier key — maps to plan tier in TENANT_TIERS */
  tierKey:       z.string().max(32),
  name:          z.string().min(1).max(80),
  description:   z.string().max(300).optional(),
  /** Display price (rendered as-is — can be "Free", "$29/mo", etc.) */
  priceDisplay:  z.string().max(30),
  /** Billing period label — "per month", "per year", etc. */
  billingPeriod: z.string().max(30).optional(),
  /** Array of feature bullet points */
  features:      z.array(z.string().max(150)).min(1).max(12),
  /** CTA button for this tier */
  cta:           CtaButtonSchema,
  /** Whether to visually highlight this tier as "popular" */
  isHighlighted: z.boolean().default(false),
  /** Badge text on highlighted tier — "Most Popular", "Best Value" */
  badgeText:     z.string().max(30).optional(),
});

export type PricingTier = z.infer<typeof PricingTierSchema>;

export const PricingPreviewPayloadSchema = z.object({
  heading:        z.string().min(1).max(200),
  subheading:     z.string().max(400).optional(),
  tiers:          z.array(PricingTierSchema).min(1).max(5),
  /** Toggle for monthly/annual billing switch */
  showBillingToggle: z.boolean().default(false),
  /** Annual discount label — "Save 20%" */
  annualSavingText: z.string().max(50).optional(),
  /** Footer note below pricing grid */
  footerNote:     z.string().max(300).optional(),
});

export type PricingPreviewPayload = z.infer<typeof PricingPreviewPayloadSchema>;

// ── 5. FAQ ─────────────────────────────────────────────────────────────────────

const FaqItemSchema = z.object({
  question: z.string().min(5).max(300),
  answer:   z.string().min(10).max(2000),
  /** Optional category for grouped FAQs */
  category: z.string().max(80).optional(),
});

export type FaqItem = z.infer<typeof FaqItemSchema>;

export const FaqPayloadSchema = z.object({
  heading:        z.string().min(1).max(200),
  subheading:     z.string().max(400).optional(),
  items:          z.array(FaqItemSchema).min(1).max(20),
  /** Display as accordion (default) or listed */
  displayStyle:   z.enum(['accordion', 'list', 'two-column']).default('accordion'),
  /** Whether multiple accordion items can be open simultaneously */
  allowMultiOpen: z.boolean().default(false),
  /** Optional CTA at the bottom */
  cta:            CtaButtonSchema.optional(),
});

export type FaqPayload = z.infer<typeof FaqPayloadSchema>;

// ── 6. CTA Section ─────────────────────────────────────────────────────────────

export const CtaSectionPayloadSchema = z.object({
  heading:         z.string().min(1).max(200),
  subheading:      z.string().max(400).optional(),
  body:            z.string().max(1000).optional(),
  primaryCta:      CtaButtonSchema,
  secondaryCta:    CtaButtonSchema.optional(),
  /** Background style */
  bgStyle:         z.enum(['brand', 'dark', 'light', 'image']).default('brand'),
  backgroundImageUrl: z.string().url().optional(),
  overlayOpacity:  z.number().min(0).max(1).default(0.6),
  /** Layout: centred text block or split with image */
  layout:          z.enum(['centered', 'split-left', 'split-right']).default('centered'),
  /** Optional badge/eyebrow */
  eyebrowText:     z.string().max(80).optional(),
});

export type CtaSectionPayload = z.infer<typeof CtaSectionPayloadSchema>;

// ── Discriminated union — full typed payload per section type ──────────────────

export type SectionPayload =
  | { sectionType: 'hero_banner';        payload: HeroBannerPayload }
  | { sectionType: 'feature_highlights'; payload: FeatureHighlightsPayload }
  | { sectionType: 'testimonials';       payload: TestimonialsPayload }
  | { sectionType: 'pricing_preview';    payload: PricingPreviewPayload }
  | { sectionType: 'faq';               payload: FaqPayload }
  | { sectionType: 'cta';               payload: CtaSectionPayload };

/**
 * SECTION_SCHEMAS — maps each section type to its Zod schema.
 * Used by HomepageService to validate payload before persisting.
 */
export const SECTION_SCHEMAS: Record<SectionType, z.ZodTypeAny> = {
  hero_banner:        HeroBannerPayloadSchema,
  feature_highlights: FeatureHighlightsPayloadSchema,
  testimonials:       TestimonialsPayloadSchema,
  pricing_preview:    PricingPreviewPayloadSchema,
  faq:               FaqPayloadSchema,
  cta:               CtaSectionPayloadSchema,
};
