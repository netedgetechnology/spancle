"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SECTION_SCHEMAS = exports.CtaSectionPayloadSchema = exports.FaqPayloadSchema = exports.PricingPreviewPayloadSchema = exports.TestimonialsPayloadSchema = exports.FeatureHighlightsPayloadSchema = exports.HeroBannerPayloadSchema = exports.SECTION_TYPES = void 0;
const zod_1 = require("zod");
exports.SECTION_TYPES = [
    'hero_banner',
    'feature_highlights',
    'testimonials',
    'pricing_preview',
    'faq',
    'cta',
];
const CtaButtonSchema = zod_1.z.object({
    label: zod_1.z.string().min(1).max(100),
    href: zod_1.z.string().max(2048),
    variant: zod_1.z.enum(['primary', 'secondary', 'outline', 'ghost']).default('primary'),
    targetBlank: zod_1.z.boolean().default(false),
});
exports.HeroBannerPayloadSchema = zod_1.z.object({
    headline: zod_1.z.string().min(1).max(200),
    subheadline: zod_1.z.string().max(400).optional(),
    body: zod_1.z.string().max(1000).optional(),
    primaryCta: CtaButtonSchema.optional(),
    secondaryCta: CtaButtonSchema.optional(),
    backgroundImageUrl: zod_1.z.string().url().optional(),
    overlayOpacity: zod_1.z.number().min(0).max(1).default(0.4),
    bgColor: zod_1.z.string().max(20).default('#0ea5e9'),
    textScheme: zod_1.z.enum(['light', 'dark']).default('light'),
    mediaAssetId: zod_1.z.string().uuid().optional(),
    eyebrowText: zod_1.z.string().max(80).optional(),
    layout: zod_1.z.enum(['centered', 'left-aligned', 'split']).default('centered'),
});
const FeatureItemSchema = zod_1.z.object({
    iconName: zod_1.z.string().max(50).optional(),
    title: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(500),
    linkHref: zod_1.z.string().max(2048).optional(),
    linkLabel: zod_1.z.string().max(80).optional(),
    imageUrl: zod_1.z.string().url().optional(),
    accentColor: zod_1.z.string().max(20).optional(),
});
exports.FeatureHighlightsPayloadSchema = zod_1.z.object({
    heading: zod_1.z.string().min(1).max(200),
    subheading: zod_1.z.string().max(400).optional(),
    items: zod_1.z.array(FeatureItemSchema).min(1).max(8),
    columns: zod_1.z.union([zod_1.z.literal(2), zod_1.z.literal(3), zod_1.z.literal(4)]).default(3),
    displayStyle: zod_1.z.enum(['card', 'icon-list', 'numbered']).default('card'),
});
const TestimonialItemSchema = zod_1.z.object({
    quote: zod_1.z.string().min(10).max(1000),
    authorName: zod_1.z.string().min(1).max(100),
    authorRole: zod_1.z.string().max(100).optional(),
    authorOrg: zod_1.z.string().max(100).optional(),
    avatarUrl: zod_1.z.string().url().optional(),
    rating: zod_1.z.number().int().min(1).max(5).optional(),
});
exports.TestimonialsPayloadSchema = zod_1.z.object({
    heading: zod_1.z.string().min(1).max(200),
    subheading: zod_1.z.string().max(400).optional(),
    items: zod_1.z.array(TestimonialItemSchema).min(1).max(12),
    displayStyle: zod_1.z.enum(['grid', 'carousel', 'masonry']).default('grid'),
    columns: zod_1.z.union([zod_1.z.literal(1), zod_1.z.literal(2), zod_1.z.literal(3)]).default(3),
    showRatings: zod_1.z.boolean().default(true),
    bgStyle: zod_1.z.enum(['white', 'light', 'dark', 'brand']).default('light'),
});
const PricingTierSchema = zod_1.z.object({
    tierKey: zod_1.z.string().max(32),
    name: zod_1.z.string().min(1).max(80),
    description: zod_1.z.string().max(300).optional(),
    priceDisplay: zod_1.z.string().max(30),
    billingPeriod: zod_1.z.string().max(30).optional(),
    features: zod_1.z.array(zod_1.z.string().max(150)).min(1).max(12),
    cta: CtaButtonSchema,
    isHighlighted: zod_1.z.boolean().default(false),
    badgeText: zod_1.z.string().max(30).optional(),
});
exports.PricingPreviewPayloadSchema = zod_1.z.object({
    heading: zod_1.z.string().min(1).max(200),
    subheading: zod_1.z.string().max(400).optional(),
    tiers: zod_1.z.array(PricingTierSchema).min(1).max(5),
    showBillingToggle: zod_1.z.boolean().default(false),
    annualSavingText: zod_1.z.string().max(50).optional(),
    footerNote: zod_1.z.string().max(300).optional(),
});
const FaqItemSchema = zod_1.z.object({
    question: zod_1.z.string().min(5).max(300),
    answer: zod_1.z.string().min(10).max(2000),
    category: zod_1.z.string().max(80).optional(),
});
exports.FaqPayloadSchema = zod_1.z.object({
    heading: zod_1.z.string().min(1).max(200),
    subheading: zod_1.z.string().max(400).optional(),
    items: zod_1.z.array(FaqItemSchema).min(1).max(20),
    displayStyle: zod_1.z.enum(['accordion', 'list', 'two-column']).default('accordion'),
    allowMultiOpen: zod_1.z.boolean().default(false),
    cta: CtaButtonSchema.optional(),
});
exports.CtaSectionPayloadSchema = zod_1.z.object({
    heading: zod_1.z.string().min(1).max(200),
    subheading: zod_1.z.string().max(400).optional(),
    body: zod_1.z.string().max(1000).optional(),
    primaryCta: CtaButtonSchema,
    secondaryCta: CtaButtonSchema.optional(),
    bgStyle: zod_1.z.enum(['brand', 'dark', 'light', 'image']).default('brand'),
    backgroundImageUrl: zod_1.z.string().url().optional(),
    overlayOpacity: zod_1.z.number().min(0).max(1).default(0.6),
    layout: zod_1.z.enum(['centered', 'split-left', 'split-right']).default('centered'),
    eyebrowText: zod_1.z.string().max(80).optional(),
});
exports.SECTION_SCHEMAS = {
    hero_banner: exports.HeroBannerPayloadSchema,
    feature_highlights: exports.FeatureHighlightsPayloadSchema,
    testimonials: exports.TestimonialsPayloadSchema,
    pricing_preview: exports.PricingPreviewPayloadSchema,
    faq: exports.FaqPayloadSchema,
    cta: exports.CtaSectionPayloadSchema,
};
//# sourceMappingURL=section-payload.types.js.map