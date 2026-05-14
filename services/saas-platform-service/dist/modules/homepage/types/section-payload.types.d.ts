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
export declare const SECTION_TYPES: readonly ["hero_banner", "feature_highlights", "testimonials", "pricing_preview", "faq", "cta"];
export type SectionType = typeof SECTION_TYPES[number];
declare const CtaButtonSchema: z.ZodObject<{
    label: z.ZodString;
    href: z.ZodString;
    variant: z.ZodDefault<z.ZodEnum<["primary", "secondary", "outline", "ghost"]>>;
    targetBlank: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    label: string;
    href: string;
    variant: "primary" | "secondary" | "outline" | "ghost";
    targetBlank: boolean;
}, {
    label: string;
    href: string;
    variant?: "primary" | "secondary" | "outline" | "ghost" | undefined;
    targetBlank?: boolean | undefined;
}>;
export type CtaButton = z.infer<typeof CtaButtonSchema>;
export declare const HeroBannerPayloadSchema: z.ZodObject<{
    /** Main headline — displayed as H1 */
    headline: z.ZodString;
    /** Supporting subheading */
    subheadline: z.ZodOptional<z.ZodString>;
    /** Short paragraph body copy */
    body: z.ZodOptional<z.ZodString>;
    /** Primary CTA button */
    primaryCta: z.ZodOptional<z.ZodObject<{
        label: z.ZodString;
        href: z.ZodString;
        variant: z.ZodDefault<z.ZodEnum<["primary", "secondary", "outline", "ghost"]>>;
        targetBlank: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        href: string;
        variant: "primary" | "secondary" | "outline" | "ghost";
        targetBlank: boolean;
    }, {
        label: string;
        href: string;
        variant?: "primary" | "secondary" | "outline" | "ghost" | undefined;
        targetBlank?: boolean | undefined;
    }>>;
    /** Secondary CTA button */
    secondaryCta: z.ZodOptional<z.ZodObject<{
        label: z.ZodString;
        href: z.ZodString;
        variant: z.ZodDefault<z.ZodEnum<["primary", "secondary", "outline", "ghost"]>>;
        targetBlank: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        href: string;
        variant: "primary" | "secondary" | "outline" | "ghost";
        targetBlank: boolean;
    }, {
        label: string;
        href: string;
        variant?: "primary" | "secondary" | "outline" | "ghost" | undefined;
        targetBlank?: boolean | undefined;
    }>>;
    /** Background image URL */
    backgroundImageUrl: z.ZodOptional<z.ZodString>;
    /** Overlay opacity 0–1 for text readability over image */
    overlayOpacity: z.ZodDefault<z.ZodNumber>;
    /** Background colour hex (fallback when no image) */
    bgColor: z.ZodDefault<z.ZodString>;
    /** Text colour scheme */
    textScheme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
    /** Optional media asset ID for CMS linking */
    mediaAssetId: z.ZodOptional<z.ZodString>;
    /** Badge/eyebrow text shown above headline */
    eyebrowText: z.ZodOptional<z.ZodString>;
    /** Layout variant */
    layout: z.ZodDefault<z.ZodEnum<["centered", "left-aligned", "split"]>>;
}, "strip", z.ZodTypeAny, {
    bgColor: string;
    headline: string;
    overlayOpacity: number;
    textScheme: "light" | "dark";
    layout: "split" | "centered" | "left-aligned";
    body?: string | undefined;
    subheadline?: string | undefined;
    primaryCta?: {
        label: string;
        href: string;
        variant: "primary" | "secondary" | "outline" | "ghost";
        targetBlank: boolean;
    } | undefined;
    secondaryCta?: {
        label: string;
        href: string;
        variant: "primary" | "secondary" | "outline" | "ghost";
        targetBlank: boolean;
    } | undefined;
    backgroundImageUrl?: string | undefined;
    mediaAssetId?: string | undefined;
    eyebrowText?: string | undefined;
}, {
    headline: string;
    body?: string | undefined;
    bgColor?: string | undefined;
    subheadline?: string | undefined;
    primaryCta?: {
        label: string;
        href: string;
        variant?: "primary" | "secondary" | "outline" | "ghost" | undefined;
        targetBlank?: boolean | undefined;
    } | undefined;
    secondaryCta?: {
        label: string;
        href: string;
        variant?: "primary" | "secondary" | "outline" | "ghost" | undefined;
        targetBlank?: boolean | undefined;
    } | undefined;
    backgroundImageUrl?: string | undefined;
    overlayOpacity?: number | undefined;
    textScheme?: "light" | "dark" | undefined;
    mediaAssetId?: string | undefined;
    eyebrowText?: string | undefined;
    layout?: "split" | "centered" | "left-aligned" | undefined;
}>;
export type HeroBannerPayload = z.infer<typeof HeroBannerPayloadSchema>;
declare const FeatureItemSchema: z.ZodObject<{
    /** Icon name from lucide-react */
    iconName: z.ZodOptional<z.ZodString>;
    /** Feature title */
    title: z.ZodString;
    /** Feature description */
    description: z.ZodString;
    /** Optional CTA link */
    linkHref: z.ZodOptional<z.ZodString>;
    linkLabel: z.ZodOptional<z.ZodString>;
    /** Image or illustration URL */
    imageUrl: z.ZodOptional<z.ZodString>;
    /** Highlight colour — applied to icon/accent */
    accentColor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description: string;
    title: string;
    imageUrl?: string | undefined;
    iconName?: string | undefined;
    linkHref?: string | undefined;
    linkLabel?: string | undefined;
    accentColor?: string | undefined;
}, {
    description: string;
    title: string;
    imageUrl?: string | undefined;
    iconName?: string | undefined;
    linkHref?: string | undefined;
    linkLabel?: string | undefined;
    accentColor?: string | undefined;
}>;
export type FeatureItem = z.infer<typeof FeatureItemSchema>;
export declare const FeatureHighlightsPayloadSchema: z.ZodObject<{
    /** Section heading */
    heading: z.ZodString;
    subheading: z.ZodOptional<z.ZodString>;
    /** Feature items — min 2, max 8 */
    items: z.ZodArray<z.ZodObject<{
        /** Icon name from lucide-react */
        iconName: z.ZodOptional<z.ZodString>;
        /** Feature title */
        title: z.ZodString;
        /** Feature description */
        description: z.ZodString;
        /** Optional CTA link */
        linkHref: z.ZodOptional<z.ZodString>;
        linkLabel: z.ZodOptional<z.ZodString>;
        /** Image or illustration URL */
        imageUrl: z.ZodOptional<z.ZodString>;
        /** Highlight colour — applied to icon/accent */
        accentColor: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        title: string;
        imageUrl?: string | undefined;
        iconName?: string | undefined;
        linkHref?: string | undefined;
        linkLabel?: string | undefined;
        accentColor?: string | undefined;
    }, {
        description: string;
        title: string;
        imageUrl?: string | undefined;
        iconName?: string | undefined;
        linkHref?: string | undefined;
        linkLabel?: string | undefined;
        accentColor?: string | undefined;
    }>, "many">;
    /** Grid columns layout */
    columns: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>>;
    /** Display style */
    displayStyle: z.ZodDefault<z.ZodEnum<["card", "icon-list", "numbered"]>>;
}, "strip", z.ZodTypeAny, {
    items: {
        description: string;
        title: string;
        imageUrl?: string | undefined;
        iconName?: string | undefined;
        linkHref?: string | undefined;
        linkLabel?: string | undefined;
        accentColor?: string | undefined;
    }[];
    heading: string;
    columns: 2 | 3 | 4;
    displayStyle: "card" | "icon-list" | "numbered";
    subheading?: string | undefined;
}, {
    items: {
        description: string;
        title: string;
        imageUrl?: string | undefined;
        iconName?: string | undefined;
        linkHref?: string | undefined;
        linkLabel?: string | undefined;
        accentColor?: string | undefined;
    }[];
    heading: string;
    subheading?: string | undefined;
    columns?: 2 | 3 | 4 | undefined;
    displayStyle?: "card" | "icon-list" | "numbered" | undefined;
}>;
export type FeatureHighlightsPayload = z.infer<typeof FeatureHighlightsPayloadSchema>;
declare const TestimonialItemSchema: z.ZodObject<{
    /** Quote text */
    quote: z.ZodString;
    /** Author full name */
    authorName: z.ZodString;
    /** Author role / title */
    authorRole: z.ZodOptional<z.ZodString>;
    /** Author organisation */
    authorOrg: z.ZodOptional<z.ZodString>;
    /** Author avatar URL */
    avatarUrl: z.ZodOptional<z.ZodString>;
    /** Star rating 1–5 */
    rating: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    quote: string;
    authorName: string;
    authorRole?: string | undefined;
    authorOrg?: string | undefined;
    avatarUrl?: string | undefined;
    rating?: number | undefined;
}, {
    quote: string;
    authorName: string;
    authorRole?: string | undefined;
    authorOrg?: string | undefined;
    avatarUrl?: string | undefined;
    rating?: number | undefined;
}>;
export type TestimonialItem = z.infer<typeof TestimonialItemSchema>;
export declare const TestimonialsPayloadSchema: z.ZodObject<{
    heading: z.ZodString;
    subheading: z.ZodOptional<z.ZodString>;
    items: z.ZodArray<z.ZodObject<{
        /** Quote text */
        quote: z.ZodString;
        /** Author full name */
        authorName: z.ZodString;
        /** Author role / title */
        authorRole: z.ZodOptional<z.ZodString>;
        /** Author organisation */
        authorOrg: z.ZodOptional<z.ZodString>;
        /** Author avatar URL */
        avatarUrl: z.ZodOptional<z.ZodString>;
        /** Star rating 1–5 */
        rating: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        quote: string;
        authorName: string;
        authorRole?: string | undefined;
        authorOrg?: string | undefined;
        avatarUrl?: string | undefined;
        rating?: number | undefined;
    }, {
        quote: string;
        authorName: string;
        authorRole?: string | undefined;
        authorOrg?: string | undefined;
        avatarUrl?: string | undefined;
        rating?: number | undefined;
    }>, "many">;
    /** Display mode */
    displayStyle: z.ZodDefault<z.ZodEnum<["grid", "carousel", "masonry"]>>;
    columns: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>>;
    /** Show star ratings */
    showRatings: z.ZodDefault<z.ZodBoolean>;
    /** Background style */
    bgStyle: z.ZodDefault<z.ZodEnum<["white", "light", "dark", "brand"]>>;
}, "strip", z.ZodTypeAny, {
    items: {
        quote: string;
        authorName: string;
        authorRole?: string | undefined;
        authorOrg?: string | undefined;
        avatarUrl?: string | undefined;
        rating?: number | undefined;
    }[];
    heading: string;
    columns: 1 | 2 | 3;
    displayStyle: "grid" | "carousel" | "masonry";
    showRatings: boolean;
    bgStyle: "light" | "dark" | "white" | "brand";
    subheading?: string | undefined;
}, {
    items: {
        quote: string;
        authorName: string;
        authorRole?: string | undefined;
        authorOrg?: string | undefined;
        avatarUrl?: string | undefined;
        rating?: number | undefined;
    }[];
    heading: string;
    subheading?: string | undefined;
    columns?: 1 | 2 | 3 | undefined;
    displayStyle?: "grid" | "carousel" | "masonry" | undefined;
    showRatings?: boolean | undefined;
    bgStyle?: "light" | "dark" | "white" | "brand" | undefined;
}>;
export type TestimonialsPayload = z.infer<typeof TestimonialsPayloadSchema>;
declare const PricingTierSchema: z.ZodObject<{
    /** Internal tier key — maps to plan tier in TENANT_TIERS */
    tierKey: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    /** Display price (rendered as-is — can be "Free", "$29/mo", etc.) */
    priceDisplay: z.ZodString;
    /** Billing period label — "per month", "per year", etc. */
    billingPeriod: z.ZodOptional<z.ZodString>;
    /** Array of feature bullet points */
    features: z.ZodArray<z.ZodString, "many">;
    /** CTA button for this tier */
    cta: z.ZodObject<{
        label: z.ZodString;
        href: z.ZodString;
        variant: z.ZodDefault<z.ZodEnum<["primary", "secondary", "outline", "ghost"]>>;
        targetBlank: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        href: string;
        variant: "primary" | "secondary" | "outline" | "ghost";
        targetBlank: boolean;
    }, {
        label: string;
        href: string;
        variant?: "primary" | "secondary" | "outline" | "ghost" | undefined;
        targetBlank?: boolean | undefined;
    }>;
    /** Whether to visually highlight this tier as "popular" */
    isHighlighted: z.ZodDefault<z.ZodBoolean>;
    /** Badge text on highlighted tier — "Most Popular", "Best Value" */
    badgeText: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    tierKey: string;
    features: string[];
    isHighlighted: boolean;
    cta: {
        label: string;
        href: string;
        variant: "primary" | "secondary" | "outline" | "ghost";
        targetBlank: boolean;
    };
    priceDisplay: string;
    description?: string | undefined;
    badgeText?: string | undefined;
    billingPeriod?: string | undefined;
}, {
    name: string;
    tierKey: string;
    features: string[];
    cta: {
        label: string;
        href: string;
        variant?: "primary" | "secondary" | "outline" | "ghost" | undefined;
        targetBlank?: boolean | undefined;
    };
    priceDisplay: string;
    description?: string | undefined;
    badgeText?: string | undefined;
    isHighlighted?: boolean | undefined;
    billingPeriod?: string | undefined;
}>;
export type PricingTier = z.infer<typeof PricingTierSchema>;
export declare const PricingPreviewPayloadSchema: z.ZodObject<{
    heading: z.ZodString;
    subheading: z.ZodOptional<z.ZodString>;
    tiers: z.ZodArray<z.ZodObject<{
        /** Internal tier key — maps to plan tier in TENANT_TIERS */
        tierKey: z.ZodString;
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        /** Display price (rendered as-is — can be "Free", "$29/mo", etc.) */
        priceDisplay: z.ZodString;
        /** Billing period label — "per month", "per year", etc. */
        billingPeriod: z.ZodOptional<z.ZodString>;
        /** Array of feature bullet points */
        features: z.ZodArray<z.ZodString, "many">;
        /** CTA button for this tier */
        cta: z.ZodObject<{
            label: z.ZodString;
            href: z.ZodString;
            variant: z.ZodDefault<z.ZodEnum<["primary", "secondary", "outline", "ghost"]>>;
            targetBlank: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            label: string;
            href: string;
            variant: "primary" | "secondary" | "outline" | "ghost";
            targetBlank: boolean;
        }, {
            label: string;
            href: string;
            variant?: "primary" | "secondary" | "outline" | "ghost" | undefined;
            targetBlank?: boolean | undefined;
        }>;
        /** Whether to visually highlight this tier as "popular" */
        isHighlighted: z.ZodDefault<z.ZodBoolean>;
        /** Badge text on highlighted tier — "Most Popular", "Best Value" */
        badgeText: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        tierKey: string;
        features: string[];
        isHighlighted: boolean;
        cta: {
            label: string;
            href: string;
            variant: "primary" | "secondary" | "outline" | "ghost";
            targetBlank: boolean;
        };
        priceDisplay: string;
        description?: string | undefined;
        badgeText?: string | undefined;
        billingPeriod?: string | undefined;
    }, {
        name: string;
        tierKey: string;
        features: string[];
        cta: {
            label: string;
            href: string;
            variant?: "primary" | "secondary" | "outline" | "ghost" | undefined;
            targetBlank?: boolean | undefined;
        };
        priceDisplay: string;
        description?: string | undefined;
        badgeText?: string | undefined;
        isHighlighted?: boolean | undefined;
        billingPeriod?: string | undefined;
    }>, "many">;
    /** Toggle for monthly/annual billing switch */
    showBillingToggle: z.ZodDefault<z.ZodBoolean>;
    /** Annual discount label — "Save 20%" */
    annualSavingText: z.ZodOptional<z.ZodString>;
    /** Footer note below pricing grid */
    footerNote: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    heading: string;
    tiers: {
        name: string;
        tierKey: string;
        features: string[];
        isHighlighted: boolean;
        cta: {
            label: string;
            href: string;
            variant: "primary" | "secondary" | "outline" | "ghost";
            targetBlank: boolean;
        };
        priceDisplay: string;
        description?: string | undefined;
        badgeText?: string | undefined;
        billingPeriod?: string | undefined;
    }[];
    showBillingToggle: boolean;
    subheading?: string | undefined;
    annualSavingText?: string | undefined;
    footerNote?: string | undefined;
}, {
    heading: string;
    tiers: {
        name: string;
        tierKey: string;
        features: string[];
        cta: {
            label: string;
            href: string;
            variant?: "primary" | "secondary" | "outline" | "ghost" | undefined;
            targetBlank?: boolean | undefined;
        };
        priceDisplay: string;
        description?: string | undefined;
        badgeText?: string | undefined;
        isHighlighted?: boolean | undefined;
        billingPeriod?: string | undefined;
    }[];
    subheading?: string | undefined;
    showBillingToggle?: boolean | undefined;
    annualSavingText?: string | undefined;
    footerNote?: string | undefined;
}>;
export type PricingPreviewPayload = z.infer<typeof PricingPreviewPayloadSchema>;
declare const FaqItemSchema: z.ZodObject<{
    question: z.ZodString;
    answer: z.ZodString;
    /** Optional category for grouped FAQs */
    category: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    question: string;
    answer: string;
    category?: string | undefined;
}, {
    question: string;
    answer: string;
    category?: string | undefined;
}>;
export type FaqItem = z.infer<typeof FaqItemSchema>;
export declare const FaqPayloadSchema: z.ZodObject<{
    heading: z.ZodString;
    subheading: z.ZodOptional<z.ZodString>;
    items: z.ZodArray<z.ZodObject<{
        question: z.ZodString;
        answer: z.ZodString;
        /** Optional category for grouped FAQs */
        category: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        question: string;
        answer: string;
        category?: string | undefined;
    }, {
        question: string;
        answer: string;
        category?: string | undefined;
    }>, "many">;
    /** Display as accordion (default) or listed */
    displayStyle: z.ZodDefault<z.ZodEnum<["accordion", "list", "two-column"]>>;
    /** Whether multiple accordion items can be open simultaneously */
    allowMultiOpen: z.ZodDefault<z.ZodBoolean>;
    /** Optional CTA at the bottom */
    cta: z.ZodOptional<z.ZodObject<{
        label: z.ZodString;
        href: z.ZodString;
        variant: z.ZodDefault<z.ZodEnum<["primary", "secondary", "outline", "ghost"]>>;
        targetBlank: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        href: string;
        variant: "primary" | "secondary" | "outline" | "ghost";
        targetBlank: boolean;
    }, {
        label: string;
        href: string;
        variant?: "primary" | "secondary" | "outline" | "ghost" | undefined;
        targetBlank?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    items: {
        question: string;
        answer: string;
        category?: string | undefined;
    }[];
    heading: string;
    displayStyle: "accordion" | "list" | "two-column";
    allowMultiOpen: boolean;
    cta?: {
        label: string;
        href: string;
        variant: "primary" | "secondary" | "outline" | "ghost";
        targetBlank: boolean;
    } | undefined;
    subheading?: string | undefined;
}, {
    items: {
        question: string;
        answer: string;
        category?: string | undefined;
    }[];
    heading: string;
    cta?: {
        label: string;
        href: string;
        variant?: "primary" | "secondary" | "outline" | "ghost" | undefined;
        targetBlank?: boolean | undefined;
    } | undefined;
    subheading?: string | undefined;
    displayStyle?: "accordion" | "list" | "two-column" | undefined;
    allowMultiOpen?: boolean | undefined;
}>;
export type FaqPayload = z.infer<typeof FaqPayloadSchema>;
export declare const CtaSectionPayloadSchema: z.ZodObject<{
    heading: z.ZodString;
    subheading: z.ZodOptional<z.ZodString>;
    body: z.ZodOptional<z.ZodString>;
    primaryCta: z.ZodObject<{
        label: z.ZodString;
        href: z.ZodString;
        variant: z.ZodDefault<z.ZodEnum<["primary", "secondary", "outline", "ghost"]>>;
        targetBlank: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        href: string;
        variant: "primary" | "secondary" | "outline" | "ghost";
        targetBlank: boolean;
    }, {
        label: string;
        href: string;
        variant?: "primary" | "secondary" | "outline" | "ghost" | undefined;
        targetBlank?: boolean | undefined;
    }>;
    secondaryCta: z.ZodOptional<z.ZodObject<{
        label: z.ZodString;
        href: z.ZodString;
        variant: z.ZodDefault<z.ZodEnum<["primary", "secondary", "outline", "ghost"]>>;
        targetBlank: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        href: string;
        variant: "primary" | "secondary" | "outline" | "ghost";
        targetBlank: boolean;
    }, {
        label: string;
        href: string;
        variant?: "primary" | "secondary" | "outline" | "ghost" | undefined;
        targetBlank?: boolean | undefined;
    }>>;
    /** Background style */
    bgStyle: z.ZodDefault<z.ZodEnum<["brand", "dark", "light", "image"]>>;
    backgroundImageUrl: z.ZodOptional<z.ZodString>;
    overlayOpacity: z.ZodDefault<z.ZodNumber>;
    /** Layout: centred text block or split with image */
    layout: z.ZodDefault<z.ZodEnum<["centered", "split-left", "split-right"]>>;
    /** Optional badge/eyebrow */
    eyebrowText: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    primaryCta: {
        label: string;
        href: string;
        variant: "primary" | "secondary" | "outline" | "ghost";
        targetBlank: boolean;
    };
    overlayOpacity: number;
    layout: "centered" | "split-left" | "split-right";
    heading: string;
    bgStyle: "image" | "light" | "dark" | "brand";
    body?: string | undefined;
    secondaryCta?: {
        label: string;
        href: string;
        variant: "primary" | "secondary" | "outline" | "ghost";
        targetBlank: boolean;
    } | undefined;
    backgroundImageUrl?: string | undefined;
    eyebrowText?: string | undefined;
    subheading?: string | undefined;
}, {
    primaryCta: {
        label: string;
        href: string;
        variant?: "primary" | "secondary" | "outline" | "ghost" | undefined;
        targetBlank?: boolean | undefined;
    };
    heading: string;
    body?: string | undefined;
    secondaryCta?: {
        label: string;
        href: string;
        variant?: "primary" | "secondary" | "outline" | "ghost" | undefined;
        targetBlank?: boolean | undefined;
    } | undefined;
    backgroundImageUrl?: string | undefined;
    overlayOpacity?: number | undefined;
    eyebrowText?: string | undefined;
    layout?: "centered" | "split-left" | "split-right" | undefined;
    subheading?: string | undefined;
    bgStyle?: "image" | "light" | "dark" | "brand" | undefined;
}>;
export type CtaSectionPayload = z.infer<typeof CtaSectionPayloadSchema>;
export type SectionPayload = {
    sectionType: 'hero_banner';
    payload: HeroBannerPayload;
} | {
    sectionType: 'feature_highlights';
    payload: FeatureHighlightsPayload;
} | {
    sectionType: 'testimonials';
    payload: TestimonialsPayload;
} | {
    sectionType: 'pricing_preview';
    payload: PricingPreviewPayload;
} | {
    sectionType: 'faq';
    payload: FaqPayload;
} | {
    sectionType: 'cta';
    payload: CtaSectionPayload;
};
/**
 * SECTION_SCHEMAS — maps each section type to its Zod schema.
 * Used by HomepageService to validate payload before persisting.
 */
export declare const SECTION_SCHEMAS: Record<SectionType, z.ZodTypeAny>;
export {};
//# sourceMappingURL=section-payload.types.d.ts.map