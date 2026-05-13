// Local homepage section types — avoids cross-service imports

export const SECTION_TYPES = [
  'hero_banner',
  'feature_highlights',
  'testimonials',
  'pricing_preview',
  'faq',
  'cta',
] as const;

export type SectionType = typeof SECTION_TYPES[number];

// ── Shared ────────────────────────────────────────────────────────────────────

export interface CtaButton {
  label:    string;
  href:     string;
  variant?:     'primary' | 'secondary' | 'outline';
  targetBlank?:  boolean;
  [key: string]: unknown;
}

// ── Hero Banner ───────────────────────────────────────────────────────────────

export interface HeroBannerPayload {
  heading:     string;
  subheading?: string;
  body?:       string;
  ctaButtons?: CtaButton[];
  imageSrc?:   string;
  imageAlt?:   string;
  layout?:     string;
  bgStyle?:    string;
  backgroundImageUrl?: string;
  overlayOpacity?:     number;
  eyebrowText?:        string;
  headline?:           string;
  subheadline?:        string;
  primaryCta?:         CtaButton;
  secondaryCta?:       CtaButton;
  bgColor?:            string;
  textScheme?:         string;
  [key: string]:       unknown;
}

// ── Feature Highlights ────────────────────────────────────────────────────────

export interface FeatureItem {
  icon?:        string;
  iconName?:    string;
  title:        string;
  description:  string;
  accentColor?: string;
  badge?:       string;
  linkHref?:    string;
  linkLabel?:   string;
  [key: string]: unknown;
}

export interface FeatureHighlightsPayload {
  heading?:       string;
  subheading?:    string;
  features:       FeatureItem[];
  layout?:        string;
  columns?:       number;
  accentColor?:   string;
  [key: string]:  unknown;
}

// ── Testimonials ──────────────────────────────────────────────────────────────

export interface TestimonialItem {
  name:     string;
  role?:    string;
  company?: string;
  quote:    string;
  avatar?:  string;
  rating?:  number;
  [key: string]: unknown;
}

export interface TestimonialsPayload {
  heading?:     string;
  subheading?:  string;
  testimonials: TestimonialItem[];
  layout?:      string;
  [key: string]: unknown;
}

// ── Pricing Preview ───────────────────────────────────────────────────────────

export interface PricingPreviewPayload {
  heading?:    string;
  subheading?: string;
  ctaLabel?:   string;
  ctaHref?:    string;
  features?:   string[];
  tiers?:      PricingTier[];
  [key: string]: unknown;
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

export interface FaqItem {
  question: string;
  answer:   string;
  [key: string]: unknown;
}

export interface FaqPayload {
  heading?:        string;
  subheading?:     string;
  items:           FaqItem[];
  allowMultiOpen?: boolean;
  cta?:            CtaButton;
  [key: string]:   unknown;
}

// ── CTA Section ───────────────────────────────────────────────────────────────

export interface CtaSectionPayload {
  heading:             string;
  subheading?:         string;
  body?:               string;
  buttons?:            CtaButton[];
  primaryCta?:         CtaButton;
  secondaryCta?:       CtaButton;
  bgStyle?:            string;
  backgroundImageUrl?: string;
  overlayOpacity?:     number;
  layout?:             string;
  eyebrowText?:        string;
  [key: string]:       unknown;
}

// ── Payload map ───────────────────────────────────────────────────────────────

export interface SectionPayloadMap {
  hero_banner:         HeroBannerPayload;
  feature_highlights:  FeatureHighlightsPayload;
  testimonials:        TestimonialsPayload;
  pricing_preview:     PricingPreviewPayload;
  faq:                 FaqPayload;
  cta:                 CtaSectionPayload;
}

// ── Section entity ────────────────────────────────────────────────────────────

export interface HomepageSection {
  id:           string;
  tenantId?:    string;
  pageId?:      string;
  sectionType:  SectionType;
  adminLabel?:  string;
  payload:      SectionPayloadMap[SectionType];
  sortOrder?:   number;
  order?:       number;
  status?:      'draft' | 'published' | 'archived';
  isVisible?:   boolean;
  isPublished?: boolean;
  abVariant?:   string | null;
  createdAt:    string;
  updatedAt:    string;
}

export interface PricingTier {
  name:     string;
  price?:   number | string;
  features: string[];
  ctaLabel?: string;
  ctaHref?:  string;
  highlighted?: boolean;
  [key: string]: unknown;
}
