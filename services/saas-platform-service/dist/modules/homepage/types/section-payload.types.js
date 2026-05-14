"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SECTION_SCHEMAS = exports.CtaSectionPayloadSchema = exports.FaqPayloadSchema = exports.PricingPreviewPayloadSchema = exports.TestimonialsPayloadSchema = exports.FeatureHighlightsPayloadSchema = exports.HeroBannerPayloadSchema = exports.SECTION_TYPES = void 0;
const zod_1 = require("zod");
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
exports.SECTION_TYPES = [
    'hero_banner',
    'feature_highlights',
    'testimonials',
    'pricing_preview',
    'faq',
    'cta',
];
// ── Shared sub-schemas ─────────────────────────────────────────────────────────
const CtaButtonSchema = zod_1.z.object({
    label: zod_1.z.string().min(1).max(100),
    href: zod_1.z.string().max(2048),
    variant: zod_1.z.enum(['primary', 'secondary', 'outline', 'ghost']).default('primary'),
    targetBlank: zod_1.z.boolean().default(false),
});
// ── 1. Hero Banner ─────────────────────────────────────────────────────────────
exports.HeroBannerPayloadSchema = zod_1.z.object({
    /** Main headline — displayed as H1 */
    headline: zod_1.z.string().min(1).max(200),
    /** Supporting subheading */
    subheadline: zod_1.z.string().max(400).optional(),
    /** Short paragraph body copy */
    body: zod_1.z.string().max(1000).optional(),
    /** Primary CTA button */
    primaryCta: CtaButtonSchema.optional(),
    /** Secondary CTA button */
    secondaryCta: CtaButtonSchema.optional(),
    /** Background image URL */
    backgroundImageUrl: zod_1.z.string().url().optional(),
    /** Overlay opacity 0–1 for text readability over image */
    overlayOpacity: zod_1.z.number().min(0).max(1).default(0.4),
    /** Background colour hex (fallback when no image) */
    bgColor: zod_1.z.string().max(20).default('#0ea5e9'),
    /** Text colour scheme */
    textScheme: zod_1.z.enum(['light', 'dark']).default('light'),
    /** Optional media asset ID for CMS linking */
    mediaAssetId: zod_1.z.string().uuid().optional(),
    /** Badge/eyebrow text shown above headline */
    eyebrowText: zod_1.z.string().max(80).optional(),
    /** Layout variant */
    layout: zod_1.z.enum(['centered', 'left-aligned', 'split']).default('centered'),
});
// ── 2. Feature Highlights ──────────────────────────────────────────────────────
const FeatureItemSchema = zod_1.z.object({
    /** Icon name from lucide-react */
    iconName: zod_1.z.string().max(50).optional(),
    /** Feature title */
    title: zod_1.z.string().min(1).max(100),
    /** Feature description */
    description: zod_1.z.string().max(500),
    /** Optional CTA link */
    linkHref: zod_1.z.string().max(2048).optional(),
    linkLabel: zod_1.z.string().max(80).optional(),
    /** Image or illustration URL */
    imageUrl: zod_1.z.string().url().optional(),
    /** Highlight colour — applied to icon/accent */
    accentColor: zod_1.z.string().max(20).optional(),
});
exports.FeatureHighlightsPayloadSchema = zod_1.z.object({
    /** Section heading */
    heading: zod_1.z.string().min(1).max(200),
    subheading: zod_1.z.string().max(400).optional(),
    /** Feature items — min 2, max 8 */
    items: zod_1.z.array(FeatureItemSchema).min(1).max(8),
    /** Grid columns layout */
    columns: zod_1.z.union([zod_1.z.literal(2), zod_1.z.literal(3), zod_1.z.literal(4)]).default(3),
    /** Display style */
    displayStyle: zod_1.z.enum(['card', 'icon-list', 'numbered']).default('card'),
});
// ── 3. Testimonials ────────────────────────────────────────────────────────────
const TestimonialItemSchema = zod_1.z.object({
    /** Quote text */
    quote: zod_1.z.string().min(10).max(1000),
    /** Author full name */
    authorName: zod_1.z.string().min(1).max(100),
    /** Author role / title */
    authorRole: zod_1.z.string().max(100).optional(),
    /** Author organisation */
    authorOrg: zod_1.z.string().max(100).optional(),
    /** Author avatar URL */
    avatarUrl: zod_1.z.string().url().optional(),
    /** Star rating 1–5 */
    rating: zod_1.z.number().int().min(1).max(5).optional(),
});
exports.TestimonialsPayloadSchema = zod_1.z.object({
    heading: zod_1.z.string().min(1).max(200),
    subheading: zod_1.z.string().max(400).optional(),
    items: zod_1.z.array(TestimonialItemSchema).min(1).max(12),
    /** Display mode */
    displayStyle: zod_1.z.enum(['grid', 'carousel', 'masonry']).default('grid'),
    columns: zod_1.z.union([zod_1.z.literal(1), zod_1.z.literal(2), zod_1.z.literal(3)]).default(3),
    /** Show star ratings */
    showRatings: zod_1.z.boolean().default(true),
    /** Background style */
    bgStyle: zod_1.z.enum(['white', 'light', 'dark', 'brand']).default('light'),
});
// ── 4. Pricing Preview ─────────────────────────────────────────────────────────
const PricingTierSchema = zod_1.z.object({
    /** Internal tier key — maps to plan tier in TENANT_TIERS */
    tierKey: zod_1.z.string().max(32),
    name: zod_1.z.string().min(1).max(80),
    description: zod_1.z.string().max(300).optional(),
    /** Display price (rendered as-is — can be "Free", "$29/mo", etc.) */
    priceDisplay: zod_1.z.string().max(30),
    /** Billing period label — "per month", "per year", etc. */
    billingPeriod: zod_1.z.string().max(30).optional(),
    /** Array of feature bullet points */
    features: zod_1.z.array(zod_1.z.string().max(150)).min(1).max(12),
    /** CTA button for this tier */
    cta: CtaButtonSchema,
    /** Whether to visually highlight this tier as "popular" */
    isHighlighted: zod_1.z.boolean().default(false),
    /** Badge text on highlighted tier — "Most Popular", "Best Value" */
    badgeText: zod_1.z.string().max(30).optional(),
});
exports.PricingPreviewPayloadSchema = zod_1.z.object({
    heading: zod_1.z.string().min(1).max(200),
    subheading: zod_1.z.string().max(400).optional(),
    tiers: zod_1.z.array(PricingTierSchema).min(1).max(5),
    /** Toggle for monthly/annual billing switch */
    showBillingToggle: zod_1.z.boolean().default(false),
    /** Annual discount label — "Save 20%" */
    annualSavingText: zod_1.z.string().max(50).optional(),
    /** Footer note below pricing grid */
    footerNote: zod_1.z.string().max(300).optional(),
});
// ── 5. FAQ ─────────────────────────────────────────────────────────────────────
const FaqItemSchema = zod_1.z.object({
    question: zod_1.z.string().min(5).max(300),
    answer: zod_1.z.string().min(10).max(2000),
    /** Optional category for grouped FAQs */
    category: zod_1.z.string().max(80).optional(),
});
exports.FaqPayloadSchema = zod_1.z.object({
    heading: zod_1.z.string().min(1).max(200),
    subheading: zod_1.z.string().max(400).optional(),
    items: zod_1.z.array(FaqItemSchema).min(1).max(20),
    /** Display as accordion (default) or listed */
    displayStyle: zod_1.z.enum(['accordion', 'list', 'two-column']).default('accordion'),
    /** Whether multiple accordion items can be open simultaneously */
    allowMultiOpen: zod_1.z.boolean().default(false),
    /** Optional CTA at the bottom */
    cta: CtaButtonSchema.optional(),
});
// ── 6. CTA Section ─────────────────────────────────────────────────────────────
exports.CtaSectionPayloadSchema = zod_1.z.object({
    heading: zod_1.z.string().min(1).max(200),
    subheading: zod_1.z.string().max(400).optional(),
    body: zod_1.z.string().max(1000).optional(),
    primaryCta: CtaButtonSchema,
    secondaryCta: CtaButtonSchema.optional(),
    /** Background style */
    bgStyle: zod_1.z.enum(['brand', 'dark', 'light', 'image']).default('brand'),
    backgroundImageUrl: zod_1.z.string().url().optional(),
    overlayOpacity: zod_1.z.number().min(0).max(1).default(0.6),
    /** Layout: centred text block or split with image */
    layout: zod_1.z.enum(['centered', 'split-left', 'split-right']).default('centered'),
    /** Optional badge/eyebrow */
    eyebrowText: zod_1.z.string().max(80).optional(),
});
/**
 * SECTION_SCHEMAS — maps each section type to its Zod schema.
 * Used by HomepageService to validate payload before persisting.
 */
exports.SECTION_SCHEMAS = {
    hero_banner: exports.HeroBannerPayloadSchema,
    feature_highlights: exports.FeatureHighlightsPayloadSchema,
    testimonials: exports.TestimonialsPayloadSchema,
    pricing_preview: exports.PricingPreviewPayloadSchema,
    faq: exports.FaqPayloadSchema,
    cta: exports.CtaSectionPayloadSchema,
};
//# sourceMappingURL=section-payload.types.js.map