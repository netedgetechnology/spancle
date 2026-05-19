-- =============================================================================
-- scripts/seed/12_public_website_pages.sql
--
-- Seeds all public website CMS pages and their sections for Spancle.
-- Target tenant: af2ef75b-9bd1-448a-86f0-1b7291fcda57
--
-- Idempotent:
--   - Pages:    INSERT ... ON CONFLICT (tenant_id, slug) DO UPDATE
--   - Sections: INSERT ... ON CONFLICT (id) DO UPDATE
--
-- Usage:
--   export SAAS_DB_URL="$(tr '\0' '\n' < /proc/$(pm2 pid spancle-saas-platform)/environ | grep '^DATABASE_URL=' | cut -d= -f2-)"
--   psql "$SAAS_DB_URL" -f /var/www/spancle/scripts/seed/12_public_website_pages.sql
-- =============================================================================

\set tenant_id  'af2ef75b-9bd1-448a-86f0-1b7291fcda57'

-- ── Helper: upsert a page ────────────────────────────────────────────────────
-- Returns the page id for use in section inserts below.

-- ── 1. About ─────────────────────────────────────────────────────────────────
INSERT INTO cms_pages (
  id, tenant_id, title, slug, status, is_homepage, is_deleted,
  content, seo, template, sort_order, created_at, updated_at
) VALUES (
  'a1000001-0000-0000-0000-000000000001',
  :'tenant_id',
  'About Spancle', 'about', 'published', false, false,
  '{}'::jsonb,
  '{"metaTitle":"About Spancle Sports OS","metaDescription":"Learn how Spancle helps sports clubs, academies and venues manage bookings, payments and members in one platform.","robots":"index,follow","canonicalUrl":"https://www.spancle.com/about"}'::jsonb,
  'default', 10, NOW(), NOW()
)
ON CONFLICT (tenant_id, slug) DO UPDATE SET
  title = EXCLUDED.title, status = EXCLUDED.status,
  seo = EXCLUDED.seo, updated_at = NOW();

-- About sections
INSERT INTO cms_homepage_sections (
  id, tenant_id, page_id, section_type, admin_label, sort_order,
  status, is_visible, payload, is_deleted, created_at, updated_at
) VALUES
(
  'a1000001-0001-0000-0000-000000000001',
  :'tenant_id',
  (SELECT id FROM cms_pages WHERE tenant_id = :'tenant_id' AND slug = 'about'),
  'hero_banner', 'About Hero', 10, 'published', true,
  '{"headline":"Built for sports. Designed for growth.","subheadline":"Spancle is an enterprise operating system purpose-built for sports organisations — from grassroots clubs to multi-facility academies.","body":"We handle the complexity of bookings, payments, memberships and compliance so your team can focus on what matters: sport.","eyebrowText":"Our Story","layout":"centered","textScheme":"light"}'::jsonb,
  false, NOW(), NOW()
),
(
  'a1000001-0002-0000-0000-000000000001',
  :'tenant_id',
  (SELECT id FROM cms_pages WHERE tenant_id = :'tenant_id' AND slug = 'about'),
  'feature_highlights', 'About Values', 20, 'published', true,
  '{"heading":"Why Spancle","subheading":"We started where you are — managing a sports club with spreadsheets and WhatsApp. We built the platform we wished existed.","columns":3,"items":[{"title":"India-first","description":"Built for Indian GST, UPI payments and multi-branch operations from day one.","iconName":"shield"},{"title":"API-first architecture","description":"Every feature is available via REST API — integrate with your existing tools or build on top of us.","iconName":"bolt"},{"title":"Tenant isolation","description":"Your data is completely isolated from other organisations. No shared tables, no leaks.","iconName":"lock"}]}'::jsonb,
  false, NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  payload = EXCLUDED.payload, status = EXCLUDED.status, updated_at = NOW();

-- ── 2. Features ───────────────────────────────────────────────────────────────
INSERT INTO cms_pages (
  id, tenant_id, title, slug, status, is_homepage, is_deleted,
  content, seo, template, sort_order, created_at, updated_at
) VALUES (
  'a1000002-0000-0000-0000-000000000001',
  :'tenant_id',
  'Features', 'features', 'published', false, false,
  '{}'::jsonb,
  '{"metaTitle":"Spancle Features — Booking, Payments, CMS & More","metaDescription":"Explore Spancle''s full feature set: smart booking engine, GST invoicing, member portal, multi-branch management and a built-in CMS.","robots":"index,follow","canonicalUrl":"https://www.spancle.com/features"}'::jsonb,
  'default', 20, NOW(), NOW()
)
ON CONFLICT (tenant_id, slug) DO UPDATE SET
  title = EXCLUDED.title, status = EXCLUDED.status,
  seo = EXCLUDED.seo, updated_at = NOW();

INSERT INTO cms_homepage_sections (
  id, tenant_id, page_id, section_type, admin_label, sort_order,
  status, is_visible, payload, is_deleted, created_at, updated_at
) VALUES
(
  'a1000002-0001-0000-0000-000000000001',
  :'tenant_id',
  (SELECT id FROM cms_pages WHERE tenant_id = :'tenant_id' AND slug = 'features'),
  'hero_banner', 'Features Hero', 10, 'published', true,
  '{"headline":"Everything your sports organisation needs","subheadline":"One platform. Eight modules. Zero integration headaches.","eyebrowText":"Platform Features","layout":"centered","textScheme":"light"}'::jsonb,
  false, NOW(), NOW()
),
(
  'a1000002-0002-0000-0000-000000000001',
  :'tenant_id',
  (SELECT id FROM cms_pages WHERE tenant_id = :'tenant_id' AND slug = 'features'),
  'feature_highlights', 'Features Grid', 20, 'published', true,
  '{"heading":"A complete sports management platform","subheading":"Each module works standalone or as part of the full suite.","columns":3,"items":[{"title":"Smart Booking Engine","description":"Real-time slot availability, conflict detection, automatic confirmations and waitlist management.","iconName":"calendar"},{"title":"GST-Compliant Invoicing","description":"Automatic CGST/SGST/IGST split, HSN/SAC codes, e-invoice ready, bulk export for GSTR.","iconName":"receipt"},{"title":"Member Portal","description":"Branded self-service portal where members register, book, pay and view their history.","iconName":"user"},{"title":"Multi-Branch Management","description":"Manage courts, coaches and pricing across multiple venues from one dashboard.","iconName":"building"},{"title":"Live Analytics","description":"Revenue, occupancy, membership and court utilisation reports updated in real time.","iconName":"chart"},{"title":"Website CMS","description":"Edit your public website, blog and landing pages without a developer.","iconName":"pencil"}]}'::jsonb,
  false, NOW(), NOW()
),
(
  'a1000002-0003-0000-0000-000000000001',
  :'tenant_id',
  (SELECT id FROM cms_pages WHERE tenant_id = :'tenant_id' AND slug = 'features'),
  'cta', 'Features CTA', 30, 'published', true,
  '{"heading":"Ready to see it in action?","subheading":"Book a personalised demo and we will walk you through the full platform.","bgStyle":"brand","layout":"centered","primaryCta":{"label":"Book a Demo","href":"/book-demo","variant":"secondary","targetBlank":false},"secondaryCta":{"label":"Start free trial","href":"/onboarding/signup","variant":"ghost","targetBlank":false}}'::jsonb,
  false, NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  payload = EXCLUDED.payload, status = EXCLUDED.status, updated_at = NOW();

-- ── 3. Pricing ────────────────────────────────────────────────────────────────
INSERT INTO cms_pages (
  id, tenant_id, title, slug, status, is_homepage, is_deleted,
  content, seo, template, sort_order, created_at, updated_at
) VALUES (
  'a1000003-0000-0000-0000-000000000001',
  :'tenant_id',
  'Pricing', 'pricing', 'published', false, false,
  '{}'::jsonb,
  '{"metaTitle":"Spancle Pricing — Simple & Transparent","metaDescription":"No setup fees, no contracts. Choose the plan that fits your sports organisation. Start free, upgrade as you grow.","robots":"index,follow","canonicalUrl":"https://www.spancle.com/pricing"}'::jsonb,
  'default', 30, NOW(), NOW()
)
ON CONFLICT (tenant_id, slug) DO UPDATE SET
  title = EXCLUDED.title, status = EXCLUDED.status,
  seo = EXCLUDED.seo, updated_at = NOW();

INSERT INTO cms_homepage_sections (
  id, tenant_id, page_id, section_type, admin_label, sort_order,
  status, is_visible, payload, is_deleted, created_at, updated_at
) VALUES
(
  'a1000003-0001-0000-0000-000000000001',
  :'tenant_id',
  (SELECT id FROM cms_pages WHERE tenant_id = :'tenant_id' AND slug = 'pricing'),
  'hero_banner', 'Pricing Hero', 10, 'published', true,
  '{"headline":"Simple, transparent pricing","subheadline":"No setup fees. No contracts. Cancel anytime.","body":"All prices exclude applicable GST. Billed monthly in INR.","eyebrowText":"Pricing","layout":"centered","textScheme":"light"}'::jsonb,
  false, NOW(), NOW()
),
(
  'a1000003-0002-0000-0000-000000000001',
  :'tenant_id',
  (SELECT id FROM cms_pages WHERE tenant_id = :'tenant_id' AND slug = 'pricing'),
  'faq', 'Pricing FAQ', 20, 'published', true,
  '{"heading":"Pricing questions","subheading":"Everything you need to know about Spancle plans.","allowMultiOpen":false,"items":[{"question":"Is there a free trial?","answer":"Yes. Every plan starts with a 30-day free trial. No credit card required to get started."},{"question":"Can I switch plans later?","answer":"Yes, you can upgrade or downgrade at any time. Changes take effect immediately and are prorated."},{"question":"Are there setup or onboarding fees?","answer":"No. There are no setup fees, implementation fees or hidden charges."},{"question":"Does the price include GST?","answer":"No. All prices are exclusive of GST. GST at applicable rates will be added at checkout."},{"question":"Can I pay annually?","answer":"Annual billing is available at a 15% discount. Contact us to switch."}]}'::jsonb,
  false, NOW(), NOW()
),
(
  'a1000003-0003-0000-0000-000000000001',
  :'tenant_id',
  (SELECT id FROM cms_pages WHERE tenant_id = :'tenant_id' AND slug = 'pricing'),
  'cta', 'Pricing CTA', 30, 'published', true,
  '{"heading":"Not sure which plan is right?","subheading":"Talk to us and we will help you choose.","bgStyle":"brand","layout":"centered","primaryCta":{"label":"Book a Demo","href":"/book-demo","variant":"secondary","targetBlank":false},"secondaryCta":{"label":"Start free trial","href":"/onboarding/signup","variant":"ghost","targetBlank":false}}'::jsonb,
  false, NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  payload = EXCLUDED.payload, status = EXCLUDED.status, updated_at = NOW();

-- ── 4. Contact ────────────────────────────────────────────────────────────────
INSERT INTO cms_pages (
  id, tenant_id, title, slug, status, is_homepage, is_deleted,
  content, seo, template, sort_order, created_at, updated_at
) VALUES (
  'a1000004-0000-0000-0000-000000000001',
  :'tenant_id',
  'Contact', 'contact', 'published', false, false,
  '{}'::jsonb,
  '{"metaTitle":"Contact Spancle — Get in Touch","metaDescription":"Reach out to the Spancle team for sales, support or partnership enquiries.","robots":"index,follow","canonicalUrl":"https://www.spancle.com/contact"}'::jsonb,
  'default', 40, NOW(), NOW()
)
ON CONFLICT (tenant_id, slug) DO UPDATE SET
  title = EXCLUDED.title, status = EXCLUDED.status,
  seo = EXCLUDED.seo, updated_at = NOW();

INSERT INTO cms_homepage_sections (
  id, tenant_id, page_id, section_type, admin_label, sort_order,
  status, is_visible, payload, is_deleted, created_at, updated_at
) VALUES
(
  'a1000004-0001-0000-0000-000000000001',
  :'tenant_id',
  (SELECT id FROM cms_pages WHERE tenant_id = :'tenant_id' AND slug = 'contact'),
  'hero_banner', 'Contact Hero', 10, 'published', true,
  '{"headline":"Get in touch","subheadline":"We typically respond within one business day.","eyebrowText":"Contact Us","layout":"centered","textScheme":"light"}'::jsonb,
  false, NOW(), NOW()
),
(
  'a1000004-0002-0000-0000-000000000001',
  :'tenant_id',
  (SELECT id FROM cms_pages WHERE tenant_id = :'tenant_id' AND slug = 'contact'),
  'feature_highlights', 'Contact Options', 20, 'published', true,
  '{"heading":"How to reach us","subheading":"Choose the channel that works best for you.","columns":3,"items":[{"title":"Sales enquiries","description":"Interested in Spancle for your organisation? Talk to our sales team about the right plan.","iconName":"user"},{"title":"Technical support","description":"Need help with setup, billing or a technical issue? Our support team is here.","iconName":"shield"},{"title":"Partnerships","description":"Want to integrate Spancle or explore a partnership? Reach our business development team.","iconName":"globe"}]}'::jsonb,
  false, NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  payload = EXCLUDED.payload, status = EXCLUDED.status, updated_at = NOW();

-- ── 5. Book Demo ──────────────────────────────────────────────────────────────
INSERT INTO cms_pages (
  id, tenant_id, title, slug, status, is_homepage, is_deleted,
  content, seo, template, sort_order, created_at, updated_at
) VALUES (
  'a1000005-0000-0000-0000-000000000001',
  :'tenant_id',
  'Book a Demo', 'book-demo', 'published', false, false,
  '{}'::jsonb,
  '{"metaTitle":"Book a Demo — Spancle Sports OS","metaDescription":"See Spancle in action. Book a personalised demo with our team and discover how it fits your sports organisation.","robots":"index,follow","canonicalUrl":"https://www.spancle.com/book-demo"}'::jsonb,
  'default', 50, NOW(), NOW()
)
ON CONFLICT (tenant_id, slug) DO UPDATE SET
  title = EXCLUDED.title, status = EXCLUDED.status,
  seo = EXCLUDED.seo, updated_at = NOW();

INSERT INTO cms_homepage_sections (
  id, tenant_id, page_id, section_type, admin_label, sort_order,
  status, is_visible, payload, is_deleted, created_at, updated_at
) VALUES
(
  'a1000005-0001-0000-0000-000000000001',
  :'tenant_id',
  (SELECT id FROM cms_pages WHERE tenant_id = :'tenant_id' AND slug = 'book-demo'),
  'hero_banner', 'Book Demo Hero', 10, 'published', true,
  '{"headline":"See Spancle in action","subheadline":"Book a 30-minute personalised demo with our team. We will show you exactly how Spancle fits your organisation.","body":"No sales pressure. Just a clear walkthrough of the platform with real data relevant to your sport.","eyebrowText":"Book a Demo","layout":"centered","textScheme":"light","primaryCta":{"label":"Schedule a call","href":"mailto:demo@spancle.com","variant":"secondary","targetBlank":true}}'::jsonb,
  false, NOW(), NOW()
),
(
  'a1000005-0002-0000-0000-000000000001',
  :'tenant_id',
  (SELECT id FROM cms_pages WHERE tenant_id = :'tenant_id' AND slug = 'book-demo'),
  'feature_highlights', 'Demo What to Expect', 20, 'published', true,
  '{"heading":"What to expect","subheading":"A focused 30-minute session tailored to your organisation.","columns":3,"items":[{"title":"Live platform walkthrough","description":"We show you the full booking, billing and admin workflow using your sport as the example.","iconName":"bolt"},{"title":"Your questions answered","description":"Bring your specific requirements — we answer every question on the call.","iconName":"shield"},{"title":"Same-day trial access","description":"If it is a fit, you get trial access the same day with sample data pre-loaded.","iconName":"check"}]}'::jsonb,
  false, NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  payload = EXCLUDED.payload, status = EXCLUDED.status, updated_at = NOW();

-- ── 6. Terms ──────────────────────────────────────────────────────────────────
INSERT INTO cms_pages (
  id, tenant_id, title, slug, status, is_homepage, is_deleted,
  content, seo, template, sort_order, created_at, updated_at
) VALUES (
  'a1000006-0000-0000-0000-000000000001',
  :'tenant_id',
  'Terms of Service', 'terms', 'published', false, false,
  '{}'::jsonb,
  '{"metaTitle":"Terms of Service — Spancle Sports OS","metaDescription":"Read the Spancle terms of service that govern your use of the platform.","robots":"index,follow","canonicalUrl":"https://www.spancle.com/terms"}'::jsonb,
  'default', 60, NOW(), NOW()
)
ON CONFLICT (tenant_id, slug) DO UPDATE SET
  title = EXCLUDED.title, status = EXCLUDED.status,
  seo = EXCLUDED.seo, updated_at = NOW();

INSERT INTO cms_homepage_sections (
  id, tenant_id, page_id, section_type, admin_label, sort_order,
  status, is_visible, payload, is_deleted, created_at, updated_at
) VALUES
(
  'a1000006-0001-0000-0000-000000000001',
  :'tenant_id',
  (SELECT id FROM cms_pages WHERE tenant_id = :'tenant_id' AND slug = 'terms'),
  'hero_banner', 'Terms Hero', 10, 'published', true,
  '{"headline":"Terms of Service","subheadline":"Last updated January 2025. These terms govern your use of the Spancle platform.","eyebrowText":"Legal","layout":"centered","textScheme":"light"}'::jsonb,
  false, NOW(), NOW()
),
(
  'a1000006-0002-0000-0000-000000000001',
  :'tenant_id',
  (SELECT id FROM cms_pages WHERE tenant_id = :'tenant_id' AND slug = 'terms'),
  'faq', 'Terms Summary', 20, 'published', true,
  '{"heading":"Key terms at a glance","subheading":"This is a plain-English summary. The full legal text applies.","allowMultiOpen":true,"items":[{"question":"Who can use Spancle?","answer":"Spancle is a B2B SaaS platform available to registered sports organisations, clubs, academies and venues. Individuals may use the platform only as authorised users of a subscribing organisation."},{"question":"Data ownership","answer":"You own your data. Spancle does not sell or share your data with third parties. You can export your data at any time via the admin dashboard."},{"question":"Service availability","answer":"We target 99.5% uptime. Scheduled maintenance is communicated at least 48 hours in advance via email."},{"question":"Termination","answer":"Either party may terminate the subscription with 30 days written notice. On termination, your data is retained for 90 days and then permanently deleted."},{"question":"Governing law","answer":"These terms are governed by the laws of India. Disputes are subject to the exclusive jurisdiction of courts in Bengaluru, Karnataka."}]}'::jsonb,
  false, NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  payload = EXCLUDED.payload, status = EXCLUDED.status, updated_at = NOW();

-- ── 7. Privacy ────────────────────────────────────────────────────────────────
INSERT INTO cms_pages (
  id, tenant_id, title, slug, status, is_homepage, is_deleted,
  content, seo, template, sort_order, created_at, updated_at
) VALUES (
  'a1000007-0000-0000-0000-000000000001',
  :'tenant_id',
  'Privacy Policy', 'privacy', 'published', false, false,
  '{}'::jsonb,
  '{"metaTitle":"Privacy Policy — Spancle Sports OS","metaDescription":"How Spancle collects, uses and protects your personal data in compliance with Indian data protection laws.","robots":"index,follow","canonicalUrl":"https://www.spancle.com/privacy"}'::jsonb,
  'default', 70, NOW(), NOW()
)
ON CONFLICT (tenant_id, slug) DO UPDATE SET
  title = EXCLUDED.title, status = EXCLUDED.status,
  seo = EXCLUDED.seo, updated_at = NOW();

INSERT INTO cms_homepage_sections (
  id, tenant_id, page_id, section_type, admin_label, sort_order,
  status, is_visible, payload, is_deleted, created_at, updated_at
) VALUES
(
  'a1000007-0001-0000-0000-000000000001',
  :'tenant_id',
  (SELECT id FROM cms_pages WHERE tenant_id = :'tenant_id' AND slug = 'privacy'),
  'hero_banner', 'Privacy Hero', 10, 'published', true,
  '{"headline":"Privacy Policy","subheadline":"Last updated January 2025. We are committed to protecting your personal data.","eyebrowText":"Privacy","layout":"centered","textScheme":"light"}'::jsonb,
  false, NOW(), NOW()
),
(
  'a1000007-0002-0000-0000-000000000001',
  :'tenant_id',
  (SELECT id FROM cms_pages WHERE tenant_id = :'tenant_id' AND slug = 'privacy'),
  'faq', 'Privacy Summary', 20, 'published', true,
  '{"heading":"Privacy at a glance","subheading":"Plain-English summary. The full policy applies.","allowMultiOpen":true,"items":[{"question":"What data do we collect?","answer":"We collect account information (name, email, phone) provided during signup, usage data (features used, session logs) and payment information (processed by Razorpay — we do not store card details)."},{"question":"How is data used?","answer":"Data is used to operate the platform, send transactional emails, improve the product and comply with legal obligations. We do not use your data for advertising."},{"question":"Who do we share data with?","answer":"We share data with: Razorpay (payment processing), AWS (infrastructure), Sentry (error monitoring) and legal authorities when required by law. No data is sold."},{"question":"Data retention","answer":"Active account data is retained for the duration of the subscription plus 90 days. Backup logs are retained for 12 months."},{"question":"Your rights","answer":"You may request access, correction or deletion of your personal data at any time by emailing privacy@spancle.com. We respond within 30 days."}]}'::jsonb,
  false, NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  payload = EXCLUDED.payload, status = EXCLUDED.status, updated_at = NOW();

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT
  p.slug,
  p.title,
  p.status,
  COUNT(s.id) AS section_count
FROM cms_pages p
LEFT JOIN cms_homepage_sections s
  ON s.page_id = p.id
  AND s.status = 'published'
  AND s.is_visible = true
  AND s.is_deleted = false
WHERE p.tenant_id = 'af2ef75b-9bd1-448a-86f0-1b7291fcda57'
  AND p.is_deleted = false
ORDER BY p.sort_order;
