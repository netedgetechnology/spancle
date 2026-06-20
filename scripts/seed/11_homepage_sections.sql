-- =============================================================================
-- seed/11_homepage_sections.sql
--
-- Seeds CMS homepage sections for the Spancle public website.
-- All payload field names match the exact props consumed by
-- apps/public-website/src/components/sections/*.section.tsx.
--
-- Field mapping reference:
--   hero_banner        → headline, subheadline, body, primaryCta, secondaryCta,
--                        backgroundImageUrl, overlayOpacity, bgColor, textScheme,
--                        eyebrowText, layout
--   feature_highlights → heading, subheading, items[], columns, displayStyle
--   testimonials       → heading, subheading, items[], columns, bgStyle
--   faq                → heading, subheading, items[], allowMultiOpen, cta
--   cta                → heading, subheading, body, primaryCta, secondaryCta,
--                        bgStyle, overlayOpacity, layout, eyebrowText
--
-- CTA button shape everywhere: { label, href, targetBlank, variant }
--
-- Idempotent: uses ON CONFLICT (id) DO UPDATE so re-running updates payloads.
-- =============================================================================

-- Target tenant: the fixed platform tenant constant
-- 00000000-0000-0000-0000-000000000001 (slug: spancle-platform) — the SAME
-- constant used by scripts/seed/01_superadmin.sql and PLATFORM_TENANT_ID in
-- apps/superadmin-portal/src/lib/auth/options.ts. Previously this file
-- hardcoded an unrelated demo-tenant placeholder UUID
-- (a1b2c3d4-e5f6-7890-abcd-ef1234567890) that never matched a real seeded
-- tenant in saas-platform-service, causing the homepage to silently fail
-- to render for the actual platform tenant. NEVER hardcode a literal here.
\set tenant_id  '00000000-0000-0000-0000-000000000001'

-- Ensures a homepage cms_pages row exists for the platform tenant, then
-- resolves its id dynamically via \gset — never hardcode a page_id literal.
-- \gset is psql's native way to capture a query result into a variable;
-- far more reliable than shelling out to a second psql process.
INSERT INTO cms_pages (
  id, tenant_id, title, slug, status, is_homepage, is_deleted,
  content, seo, template, sort_order, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  :'tenant_id',
  'Home', 'home', 'published', true, false,
  '{}'::jsonb,
  '{"metaTitle":"Spancle Sports OS — Enterprise Sports Management Platform","metaDescription":"Bookings, payments, memberships and CMS — unified in one platform for sports organisations.","robots":"index,follow","canonicalUrl":"https://www.spancle.com/"}'::jsonb,
  'default', 0, NOW(), NOW()
)
ON CONFLICT (tenant_id, slug) DO UPDATE SET
  is_homepage = true, status = 'published', updated_at = NOW();

SELECT id AS page_id
FROM cms_pages
WHERE tenant_id = :'tenant_id' AND slug = 'home'
LIMIT 1 \gset

-- ── 1. Hero Banner ────────────────────────────────────────────────────────────
INSERT INTO cms_homepage_sections (
  id, tenant_id, page_id, section_type, admin_label, sort_order,
  status, is_visible, payload, created_by, created_at, updated_at, is_deleted
)
VALUES (
  'c3d4e5f6-a7b8-9012-cdef-012345678901',
  :'tenant_id',
  :'page_id',
  'hero_banner',
  'Hero Banner — Main',
  10,
  'published',
  true,
  '{
    "headline":     "The Operating System for Sports Organisations",
    "subheadline":  "Bookings, memberships, payments and CMS — unified in one platform.",
    "body":         "From grassroots clubs to multi-facility academies, Spancle handles every touchpoint so your team can focus on sport.",
    "eyebrowText":  "Now in Early Access",
    "bgColor":      "#0ea5e9",
    "textScheme":   "light",
    "layout":       "split",
    "overlayOpacity": 0.4,
    "primaryCta": {
      "label":       "Start Free Trial",
      "href":        "/onboarding/start",
      "variant":     "secondary",
      "targetBlank": false
    },
    "secondaryCta": {
      "label":       "See a Demo",
      "href":        "/demo",
      "variant":     "ghost",
      "targetBlank": false
    }
  }'::jsonb,
  NULL,
  NOW(),
  NOW(),
  false
)
ON CONFLICT (id) DO UPDATE
  SET payload     = EXCLUDED.payload,
      status      = EXCLUDED.status,
      updated_at  = NOW();

-- ── 2. Feature Highlights ─────────────────────────────────────────────────────
INSERT INTO cms_homepage_sections (
  id, tenant_id, page_id, section_type, admin_label, sort_order,
  status, is_visible, payload, created_by, created_at, updated_at, is_deleted
)
VALUES (
  'd4e5f6a7-b8c9-0123-defa-123456789012',
  :'tenant_id',
  :'page_id',
  'feature_highlights',
  'Feature Highlights',
  20,
  'published',
  true,
  '{
    "heading":    "Everything your sports club needs",
    "subheading": "Purpose-built tools that work together from day one.",
    "columns":    3,
    "displayStyle": "card",
    "items": [
      {
        "title":       "Smart Booking Engine",
        "description": "Real-time slot availability with automatic conflict prevention. Members book in seconds, staff confirm with a tap.",
        "iconName":    "calendar"
      },
      {
        "title":       "GST-Compliant Billing",
        "description": "Automatic invoice generation with CGST/SGST/IGST split, payment tracking, and refund management built in.",
        "iconName":    "receipt"
      },
      {
        "title":       "Multi-Branch Management",
        "description": "Manage courts, coaches and pricing across multiple venues from a single dashboard with full tenant isolation.",
        "iconName":    "building"
      },
      {
        "title":       "Member Portal",
        "description": "Branded self-service portal for members to book, pay, view history and manage their profile.",
        "iconName":    "user"
      },
      {
        "title":       "Live Reports",
        "description": "Revenue, occupancy and membership reports updated in real time. Export to CSV for your accountant.",
        "iconName":    "chart"
      },
      {
        "title":       "Website CMS",
        "description": "Edit your public website sections, blog and landing pages without a developer using the built-in CMS.",
        "iconName":    "pencil"
      }
    ]
  }'::jsonb,
  NULL,
  NOW(),
  NOW(),
  false
)
ON CONFLICT (id) DO UPDATE
  SET payload     = EXCLUDED.payload,
      status      = EXCLUDED.status,
      updated_at  = NOW();

-- ── 3. Testimonials ───────────────────────────────────────────────────────────
INSERT INTO cms_homepage_sections (
  id, tenant_id, page_id, section_type, admin_label, sort_order,
  status, is_visible, payload, created_by, created_at, updated_at, is_deleted
)
VALUES (
  'e5f6a7b8-c9d0-1234-efab-234567890123',
  :'tenant_id',
  :'page_id',
  'testimonials',
  'Testimonials',
  30,
  'published',
  true,
  '{
    "heading":    "Trusted by clubs across India",
    "subheading": "From badminton academies to multi-sport complexes.",
    "columns":    3,
    "bgStyle":    "light",
    "items": [
      {
        "quote":       "Spancle cut our front-desk workload in half. Members book online, invoices generate automatically — we just show up and coach.",
        "authorName":  "Rajesh Nair",
        "authorRole":  "Director",
        "authorOrg":   "Ace Sports Club, Koramangala",
        "rating":      5
      },
      {
        "quote":       "The GST invoicing alone saved us hours every week. Everything is automatically split into CGST and SGST with the right HSN codes.",
        "authorName":  "Priya Sharma",
        "authorRole":  "Finance Manager",
        "authorOrg":   "Elite Badminton Academy",
        "rating":      5
      },
      {
        "quote":       "We run three branches and Spancle keeps them all separate but visible from one screen. The multi-tenant architecture is exactly what we needed.",
        "authorName":  "Arjun Mehta",
        "authorRole":  "Operations Head",
        "authorOrg":   "SportZone Bengaluru",
        "rating":      5
      }
    ]
  }'::jsonb,
  NULL,
  NOW(),
  NOW(),
  false
)
ON CONFLICT (id) DO UPDATE
  SET payload     = EXCLUDED.payload,
      status      = EXCLUDED.status,
      updated_at  = NOW();

-- ── 4. Pricing Preview ────────────────────────────────────────────────────────
INSERT INTO cms_homepage_sections (
  id, tenant_id, page_id, section_type, admin_label, sort_order,
  status, is_visible, payload, created_by, created_at, updated_at, is_deleted
)
VALUES (
  'f6a7b8c9-d0e1-2345-fabc-345678901234',
  :'tenant_id',
  :'page_id',
  'pricing_preview',
  'Pricing Preview',
  40,
  'published',
  true,
  '{
    "heading":           "Simple, transparent pricing",
    "subheading":        "No setup fees. No contracts. Cancel anytime.",
    "showBillingToggle": false,
    "footerNote":        "All prices exclude applicable GST. Billed monthly in INR.",
    "tiers": [
      {
        "tierKey":       "starter",
        "name":          "Starter",
        "description":   "For single-venue clubs just getting started.",
        "priceDisplay":  "₹1,999",
        "billingPeriod": "per month",
        "isHighlighted": false,
        "features": [
          "1 branch, up to 8 courts",
          "25 staff accounts",
          "Unlimited member bookings",
          "GST-compliant invoicing",
          "Basic reports"
        ],
        "cta": {
          "label":       "Start Free Trial",
          "href":        "/onboarding/start?plan=starter",
          "variant":     "outline",
          "targetBlank": false
        }
      },
      {
        "tierKey":       "growth",
        "name":          "Growth",
        "description":   "For growing clubs with multiple coaches and programmes.",
        "priceDisplay":  "₹4,999",
        "billingPeriod": "per month",
        "isHighlighted": true,
        "badgeText":     "Most Popular",
        "features": [
          "3 branches, unlimited courts",
          "100 staff accounts",
          "Academy & coaching modules",
          "Advanced analytics",
          "Priority support",
          "Custom branding"
        ],
        "cta": {
          "label":       "Start Free Trial",
          "href":        "/onboarding/start?plan=growth",
          "variant":     "primary",
          "targetBlank": false
        }
      },
      {
        "tierKey":       "enterprise",
        "name":          "Enterprise",
        "description":   "For large multi-facility sports organisations.",
        "priceDisplay":  "Custom",
        "billingPeriod": "",
        "isHighlighted": false,
        "features": [
          "Unlimited branches and courts",
          "Unlimited staff",
          "Tournament module",
          "Custom integrations & API",
          "Dedicated account manager",
          "SLA-backed uptime"
        ],
        "cta": {
          "label":       "Contact Sales",
          "href":        "/contact-sales",
          "variant":     "outline",
          "targetBlank": false
        }
      }
    ]
  }'::jsonb,
  NULL,
  NOW(),
  NOW(),
  false
)
ON CONFLICT (id) DO UPDATE
  SET payload     = EXCLUDED.payload,
      status      = EXCLUDED.status,
      updated_at  = NOW();

-- ── 5. FAQ ────────────────────────────────────────────────────────────────────
INSERT INTO cms_homepage_sections (
  id, tenant_id, page_id, section_type, admin_label, sort_order,
  status, is_visible, payload, created_by, created_at, updated_at, is_deleted
)
VALUES (
  'a7b8c9d0-e1f2-3456-abcd-456789012345',
  :'tenant_id',
  :'page_id',
  'faq',
  'FAQ',
  50,
  'published',
  true,
  '{
    "heading":       "Frequently asked questions",
    "subheading":    "Everything you need to know before getting started.",
    "allowMultiOpen": false,
    "displayStyle":  "accordion",
    "cta": {
      "label":       "Contact Support",
      "href":        "/contact",
      "variant":     "outline",
      "targetBlank": false
    },
    "items": [
      {
        "question": "How long does setup take?",
        "answer":   "Most clubs are fully set up within a day. Our onboarding wizard walks you through adding your branches, courts, staff and pricing rules step by step. If you need help, our team is available by chat."
      },
      {
        "question": "Does Spancle handle Indian GST correctly?",
        "answer":   "Yes. Spancle automatically calculates CGST and SGST for intra-state transactions and IGST for inter-state transactions. Invoices include the correct HSN/SAC code (999335 for sports services) and your GSTIN. You can export a GSTR-ready report at any time."
      },
      {
        "question": "Can members book courts themselves?",
        "answer":   "Yes. Each club gets a branded booking portal at a custom subdomain. Members register, browse real-time slot availability and complete payment online. You control which slots are open, pricing tiers and advance booking windows."
      },
      {
        "question": "What payment methods are supported?",
        "answer":   "Spancle supports UPI, credit/debit cards, net banking and cash (recorded manually). Payment gateway integration is available via Razorpay. Wallet top-up for frequent members is included in Growth and Enterprise plans."
      },
      {
        "question": "Can I manage multiple branches from one account?",
        "answer":   "Yes. Spancle is built for multi-branch operations. Each branch has its own courts, staff, pricing and reports but shares a single tenant account. The Starter plan includes 1 branch; Growth includes 3; Enterprise is unlimited."
      },
      {
        "question": "Is my data safe?",
        "answer":   "All data is encrypted at rest and in transit. Each tenant's data is fully isolated at the database level — no tenant can access another's records. We run automated backups daily and maintain 30-day retention."
      }
    ]
  }'::jsonb,
  NULL,
  NOW(),
  NOW(),
  false
)
ON CONFLICT (id) DO UPDATE
  SET payload     = EXCLUDED.payload,
      status      = EXCLUDED.status,
      updated_at  = NOW();

-- ── 6. CTA Section ────────────────────────────────────────────────────────────
INSERT INTO cms_homepage_sections (
  id, tenant_id, page_id, section_type, admin_label, sort_order,
  status, is_visible, payload, created_by, created_at, updated_at, is_deleted
)
VALUES (
  'b8c9d0e1-f2a3-4567-bcde-567890123456',
  :'tenant_id',
  :'page_id',
  'cta',
  'CTA — Bottom',
  60,
  'published',
  true,
  '{
    "heading":      "Ready to modernise your sports club?",
    "subheading":   "Join hundreds of clubs already running on Spancle.",
    "body":         "Start your 14-day free trial today. No credit card required.",
    "eyebrowText":  "Get started for free",
    "bgStyle":      "brand",
    "layout":       "split",
    "overlayOpacity": 0.6,
    "primaryCta": {
      "label":       "Start Free Trial",
      "href":        "/onboarding/start",
      "variant":     "secondary",
      "targetBlank": false
    },
    "secondaryCta": {
      "label":       "Book a Demo",
      "href":        "/demo",
      "variant":     "ghost",
      "targetBlank": false
    }
  }'::jsonb,
  NULL,
  NOW(),
  NOW(),
  false
)
ON CONFLICT (id) DO UPDATE
  SET payload     = EXCLUDED.payload,
      status      = EXCLUDED.status,
      updated_at  = NOW();
