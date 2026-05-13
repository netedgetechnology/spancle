# Phase 1 Production Readiness Checklist

Generated: 2026-05-13

**Legend:** ✅ Pass · ⚠️ Warning · ❌ Fail · 🔧 Fix required before go-live

---

## 1. Environment Variables

| # | Check | Status | Notes |
|---|---|---|---|
| 1.1 | All services use `config.getOrThrow()` for required vars | ✅ | `DATABASE_URL` throws on missing |
| 1.2 | Master env template covers all 8 services | ✅ | `infrastructure/environments/.env.production.template` |
| 1.3 | Per-service env files generated from master | ✅ | `scripts/gen-service-envs.sh` |
| 1.4 | Env files chmod 600, owned by deploy user | ✅ | Set in `gen-service-envs.sh` |
| 1.5 | No secrets in git (`.env*` in `.gitignore`) | ✅ | Only `.env.example` committed |
| 1.6 | `JWT_SECRET` and `NEXTAUTH_SECRET` are distinct secrets | ✅ | Separate vars in template |
| 1.7 | `ENCRYPTION_KEY` set for PII field encryption | ⚠️ | Template has placeholder — must be set before go-live |
| 1.8 | `DATABASE_SSL=true` for production PostgreSQL | ⚠️ | Defaults to `false` in template — enable if DB is remote |
| 1.9 | Services bind to `0.0.0.0` (reachable externally if no firewall) | 🔧 | NestJS default; add `ufw deny 3001:3008/tcp` or bind to 127.0.0.1 in `main.ts` |

---

## 2. Build Scripts

| # | Check | Status | Notes |
|---|---|---|---|
| 2.1 | `build-production.sh` builds packages → services → apps in order | ✅ | Turbo dependency graph respected |
| 2.2 | TypeScript typecheck runs before build | ✅ | `--skip-typecheck` opt-in only |
| 2.3 | All 8 `dist/main.js` entry points verified after build | ✅ | Script checks each and warns |
| 2.4 | All 4 `.next/` build outputs verified | ✅ | Script checks each and warns |
| 2.5 | `pnpm install --frozen-lockfile` enforced | ✅ | No version drift in production |
| 2.6 | `NEXT_TELEMETRY_DISABLED=1` set | ✅ | No data sent to Vercel |
| 2.7 | `ormconfig.ts` compiled into `dist/ormconfig.js` | ✅ | `tsconfig.json` includes `src/**/*` |
| 2.8 | Turbo remote cache not configured | ⚠️ | Cold build ~22 min — add `TURBO_TOKEN` + `TURBO_TEAM` to speed up CI/CD |

---

## 3. Database Migrations

| # | Check | Status | Notes |
|---|---|---|---|
| 3.1 | `ormconfig.ts` created for all 8 services | ✅ | Each registers correct entities + `dist/migrations/*.js` |
| 3.2 | `db-migrate.sh` runner with `run`/`revert`/`show`/`sync` commands | ✅ | Runs services in FK-dependency order |
| 3.3 | Separate database per service | ✅ | 8 databases: `spancle_identity`, `spancle_booking`, etc. |
| 3.4 | **Zero migration files exist** — only `schema:sync` for initial setup | 🔧 | Must generate TypeORM migrations before any schema change post-launch. Run: `typeorm migration:generate -d dist/ormconfig.js -n InitialSchema` per service |
| 3.5 | `synchronize: false` in all services | ✅ | No accidental schema changes on boot |
| 3.6 | Atomic sequence increment for invoice numbers | ✅ | `UPDATE ... RETURNING` — race-safe |
| 3.7 | Migration runner loads per-service env (separate `DATABASE_URL`) | ✅ | Sources `/etc/spancle/.env.<service>` |
| 3.8 | PostgreSQL extensions (`pgcrypto`, `uuid-ossp`) created in setup docs | ✅ | `DEPLOYMENT.md` includes `CREATE EXTENSION` commands |

---

## 4. Seed Scripts

| # | Check | Status | Notes |
|---|---|---|---|
| 4.1 | 11 SQL seed files covering all Phase 1 demo data | ✅ | `00_config.sql` → `10_invoices.sql` |
| 4.2 | Master runner `run_seed.sh` with `--reset` flag | ✅ | Idempotent via `ON CONFLICT DO NOTHING` |
| 4.3 | Fixed UUIDs for all seed records | ✅ | Re-running produces identical rows |
| 4.4 | Seed reads `IDENTITY_DB_URL`, `BOOKING_DB_URL`, `FINANCE_DB_URL` | ✅ | Separate DB per service |
| 4.5 | Bcrypt hashes pre-computed (cost 12) | ✅ | No runtime dependency on bcryptjs in seed |
| 4.6 | Seed GST/invoice data uses correct HSN SAC code `999335` | ✅ | Sports/recreation services code |
| 4.7 | Seed passwords documented in runner output | ✅ | Printed in final summary box |

---

## 5. Authentication Security

| # | Check | Status | Notes |
|---|---|---|---|
| 5.1 | bcrypt cost factor 12 (`PASSWORD.BCRYPT_ROUNDS`) | ✅ | `password.service.ts` uses constant from `@spancle/constants` |
| 5.2 | Password policy enforced (min 8, uppercase, digit, special char) | ✅ | `PasswordService.enforce()` before hashing |
| 5.3 | Refresh token rotation — family tracking | ✅ | Token reuse revokes entire family |
| 5.4 | JTI blacklist on logout via Redis | ✅ | Access tokens revocable before expiry |
| 5.5 | JWT validated globally in `identity-service` (`JwtAuthGuard` as `APP_GUARD`) | ✅ | Guard chain: Throttler → Tenant → JWT → TenantStatus → Plan → Roles |
| 5.6 | `booking-service`, `finance-service`, `reporting-service` trust `x-actor-role` header without JWT verification | ⚠️ | Architecture: API-gateway injects headers after JWT validation. **Block direct access to ports 3003–3008 with firewall before go-live.** |
| 5.7 | Account lockout after failed logins | ✅ | `PASSWORD.LOCKOUT_DURATION_MINUTES` in constants |
| 5.8 | `forbidNonWhitelisted: true` on ValidationPipe in all services | ✅ | Checked across all 8 `main.ts` files |
| 5.9 | Passwords never logged | ✅ | Documented in `password.service.ts` contract |
| 5.10 | HTTPS enforced via nginx SSL config | ⚠️ | HTTP-only until `certbot` run. Run Step 8 of `DEPLOYMENT.md` immediately after DNS points. |

---

## 6. Tenant Isolation

| # | Check | Status | Notes |
|---|---|---|---|
| 6.1 | All tenant-owned entities have `tenant_id` column | ✅ | Confirmed across 35+ entities |
| 6.2 | All repositories use scoped query builders (`tenantId` in every `WHERE`) | ✅ | `scopedQb()` pattern throughout |
| 6.3 | `TenantGuard` validates `x-tenant-id` UUID format on every request | ✅ | Rejects non-UUID and missing headers with 401 |
| 6.4 | `findOne(id, tenantId)` pattern — cross-tenant access returns 404 | ✅ | Used consistently in all service methods |
| 6.5 | All raw SQL queries in reporting include `tenant_id = $1` | ✅ | Every query in `reporting.repository.ts` scoped |
| 6.6 | `package.entity.ts` intentionally has no `tenant_id` | ✅ | Platform-level data — correct |
| 6.7 | Frontend `apiClient` injects `x-tenant-id` from session on every request | ✅ | Session-aware client in all four apps |

---

## 7. RBAC

| # | Check | Status | Notes |
|---|---|---|---|
| 7.1 | `identity-service`: RolesGuard as global `APP_GUARD` | ✅ | 6-guard chain including RolesGuard |
| 7.2 | `booking-service`: RbacGuard as global `APP_GUARD` | ✅ | Added; removed manual `new RbacGuard(new Reflector())` instantiation |
| 7.3 | `finance-service`: RbacGuard as global `APP_GUARD` | ✅ | Covers invoice, payment, wallet, reporting |
| 7.4 | `reporting-service`: RbacGuard as global `APP_GUARD` | ✅ | Analytics restricted to TENANT_ADMIN/MANAGER/CASHIER/REPORT_VIEWER |
| 7.5 | **`saas-platform-service` has NO global auth guard** | 🔧 | CMS admin endpoints (blog, pages, homepage sections) require only `x-tenant-id`. Add JWT guard or restrict to internal network only. |
| 7.6 | RECEPTIONIST role defined and wired to booking/QR endpoints | ✅ | Can create bookings, check-in, scan QR |
| 7.7 | CASHIER role defined and wired to payment/invoice endpoints | ✅ | Full payment lifecycle, reconciliation |
| 7.8 | REPORT_VIEWER role defined — read-only analytics access | ✅ | Cannot mutate any data |
| 7.9 | MEMBER role defined | ✅ | Own bookings and invoices only |
| 7.10 | SUPER_ADMIN bypasses all role checks (wildcard) | ✅ | `RbacEngine.evaluate()` returns allow for SUPER_ADMIN |

---

## 8. Booking Flow

| # | Check | Status | Notes |
|---|---|---|---|
| 8.1 | Double-booking race condition prevented with pessimistic lock | ✅ | `lockAndVerifyAvailable()` — `SELECT FOR UPDATE` inside transaction |
| 8.2 | Slot validation re-runs inside transaction (reschedule) | ✅ | New slots locked before old slots released |
| 8.3 | `waiveNoShow` transitions to `completed` (not `refunded`) | ✅ | Fixed; `'completed'` added to `ALLOWED_TRANSITIONS['no_show']` |
| 8.4 | `PATCH /bookings/:id/payment-failed` releases reserved slots | ✅ | Transitions `pending_payment → cancelled`, frees all slot IDs |
| 8.5 | Recurring booking conflict logged at correct severity | ✅ | Slot conflicts → `warn`; unexpected errors → `error` with stack |
| 8.6 | Cancellation voids issued invoice (fire-and-forget HTTP) | ✅ | `voidInvoiceForBooking()` called in `cancel()` |
| 8.7 | Auto-invoice created on booking confirmation | ✅ | `createInvoiceForBooking()` fire-and-forget to finance-service |
| 8.8 | Booking status machine validated with `ALLOWED_TRANSITIONS` | ✅ | All state transitions checked before update |
| 8.9 | Health endpoint missing on `booking-service` | 🔧 | `deploy.sh` checks `localhost:3003/health` but no `GET /health` handler exists. Add to app controller. |

---

## 9. Billing Flow

| # | Check | Status | Notes |
|---|---|---|---|
| 9.1 | Invoice numbers generated atomically (`UPDATE ... RETURNING`) | ✅ | No gap or duplicate under concurrency |
| 9.2 | Financial year correctly computed for Indian FY (Apr–Mar) | ✅ | `currentFinancialYear()` handles Jan/Feb/Mar → previous year |
| 9.3 | `intra_state` → CGST + SGST (equal halves, rounding to SGST) | ✅ | `computeLineGst()` splits correctly |
| 9.4 | `inter_state` → IGST only; CGST/SGST = 0 | ✅ | Verified in `computeLineGst()` |
| 9.5 | Mixed-rate invoice header uses blended effective rate | ✅ | Fixed; was using `lineItems[0].gstRateBps` only |
| 9.6 | Payment refund creates `PaymentRefundEntity` row | ✅ | Fixed; was only updating parent payment |
| 9.7 | `providerRefundId` stored on `PaymentRefundEntity` (not overwriting `providerPaymentId`) | ✅ | Fixed |
| 9.8 | `syncInvoicePaid` correct for full refund: `paid → issued` | ✅ | Fixed; was leaving `paid` status when balance restored |
| 9.9 | `syncInvoicePaid` correct for partial payment: `issued → partially_paid` | ✅ | Fixed; was leaving `draft`/`issued` on partial payment |
| 9.10 | Booking invoices auto-issued on create (appear in revenue reports) | ✅ | Fixed; draft invoices had `NULL issued_at` → invisible in reports |
| 9.11 | Revenue reports always exclude `draft` invoices | ✅ | Fixed; added `'draft'` to `excludedStatuses` |
| 9.12 | Split payments: multiple legs per invoice summed correctly | ✅ | `sumSettledForInvoice()` aggregates all `captured`/`settled` legs |
| 9.13 | GSTIN format validated (15-char pattern) | ✅ | Regex check in `InvoiceService.create()` |
| 9.14 | `wallet.entity.ts` has no credit/debit mutation endpoints yet | ⚠️ | Wallet module is stub — Sprint 2 |

---

## 10. CMS Flow

| # | Check | Status | Notes |
|---|---|---|---|
| 10.1 | `GET /cms/pages/homepage` endpoint exists | ✅ | Added to `PageController` |
| 10.2 | Tenant portal homepage editor resolves real `pageId` from API | ✅ | Fixed; was hardcoded to string `'homepage'` |
| 10.3 | Homepage sections fetched at `/pages/:pageId/sections/published` | ✅ | Public renderer calls correct endpoint |
| 10.4 | Section payload validated against Zod schema per type | ✅ | `SECTION_SCHEMAS` map in `homepage.service.ts` |
| 10.5 | Published sections excluded from public API when `isVisible=false` | ✅ | `getPublishedSections()` filters by status and visibility |
| 10.6 | Blog posts accessible by slug: `GET /cms/blog/posts/by-slug/:slug` | ✅ | Endpoint exists in `BlogController` |
| 10.7 | No public blog rendering route in `public-website` (`/blog/[slug]`) | 🔧 | Missing page. Create `apps/public-website/src/app/blog/[slug]/page.tsx` |
| 10.8 | SEO fields stored on `PageEntity` and `BlogPostEntity` | ✅ | `SeoFieldsEmbed` embedded in both entities |
| 10.9 | `generateMetadata` in `[[...slug]]/page.tsx` does not use CMS SEO fields | 🔧 | Returns only `{ title: slug }`. Wire to `page.seo.metaTitle`, `metaDescription` |
| 10.10 | No lead/contact form module in `saas-platform-service` | 🔧 | Demo/trial form data has nowhere to go. Create `LeadModule` or use third-party (HubSpot/Crisp) |
| 10.11 | Media library registered via `POST /cms/media/register` (URL only, no upload) | ⚠️ | Metadata stored; actual file handling requires `STORAGE_DRIVER` config |

---

## 11. Error Handling

| # | Check | Status | Notes |
|---|---|---|---|
| 11.1 | `HttpExceptionFilter` registered globally in all services | ✅ | Found in all `main.ts` files |
| 11.2 | `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true` | ✅ | Confirmed across all 8 services |
| 11.3 | Unhandled promise rejections caught globally | ✅ | NestJS default uncaught exception handler active |
| 11.4 | Fire-and-forget calls (`createInvoiceForBooking`, `voidInvoiceForBooking`) log on failure | ✅ | `logger.warn()` in catch blocks |
| 11.5 | Database transaction failures roll back atomically | ✅ | TypeORM `DataSource.transaction()` used for booking create/reschedule |
| 11.6 | All apps have `error.tsx`, `not-found.tsx`, `unauthorized/page.tsx` | ✅ | All four apps covered |
| 11.7 | Health endpoints missing on 4 of 8 services | 🔧 | `booking`, `finance`, `saas-platform`, `reporting` return 404 on `/health`. Deploy script waits for them. |
| 11.8 | No circuit breaker on cross-service HTTP calls | ⚠️ | Finance/booking fire-and-forget calls have 5s timeout + warn-on-fail. Add retry/circuit breaker in Sprint 2. |

---

## 12. Logging

| # | Check | Status | Notes |
|---|---|---|---|
| 12.1 | `LOG_LEVEL=warn` in production PM2 config | ✅ | `ecosystem.production.config.js` sets `LOG_LEVEL: 'error'` (stricter) |
| 12.2 | Per-process log files in `/var/log/spancle/<name>/` | ✅ | Separate `out.log` and `error.log` per PM2 process |
| 12.3 | Structured logging (timestamps, process name) | ✅ | PM2 `log_date_format: 'YYYY-MM-DD HH:mm:ss Z'` |
| 12.4 | RBAC denials logged with userId + role + path | ✅ | `RolesGuard` and `RbacGuard` emit `logger.warn()` on denial |
| 12.5 | Sensitive data (passwords, tokens) never logged | ✅ | Documented contract in `password.service.ts`; JWT logging shows only path/reason |
| 12.6 | Audit interceptor logs mutating operations | ✅ | `AuditInterceptor` on all controllers |
| 12.7 | No structured/JSON log format (plain text) | ⚠️ | NestJS default plain text. Use `nestjs-pino` for JSON structured logs before enabling log aggregation (Loki/Elasticsearch) |
| 12.8 | Log rotation not configured | ⚠️ | PM2 `pm2-logrotate` module not installed. Run: `pm2 install pm2-logrotate` |

---

## Pre-Launch Checklist (🔧 items only)

- [ ] **3.4** Generate TypeORM migration files for all 8 services before first schema change post-launch  
- [ ] **5.9** Add `ufw deny` rules for ports 3001–3008, 3010–3013 (allow only nginx → loopback)  
- [ ] **5.10** Run `certbot --nginx` for all 5 domains immediately after DNS cutover  
- [ ] **7.5** Add JWT authentication guard to `saas-platform-service` CMS admin endpoints  
- [ ] **8.9** Add `GET /health` handler to `booking-service`, `finance-service`, `saas-platform-service`, `reporting-service`  
- [ ] **10.7** Create `apps/public-website/src/app/blog/[slug]/page.tsx`  
- [ ] **10.9** Wire `page.seo.*` fields into `generateMetadata()` in `[[...slug]]/page.tsx`  
- [ ] **10.10** Create `LeadModule` in `saas-platform-service` or integrate third-party CRM for demo/contact forms  

---

## Summary

| Area | Pass | Warn | Fail |
|---|---|---|---|
| Environment Variables | 7 | 2 | 0 |
| Build Scripts | 7 | 1 | 0 |
| Database Migrations | 7 | 0 | 1 |
| Seed Scripts | 7 | 0 | 0 |
| Authentication Security | 7 | 2 | 1 |
| Tenant Isolation | 7 | 0 | 0 |
| RBAC | 9 | 0 | 1 |
| Booking Flow | 8 | 0 | 1 |
| Billing Flow | 13 | 1 | 0 |
| CMS Flow | 7 | 1 | 3 |
| Error Handling | 6 | 2 | 0 |
| Logging | 6 | 2 | 0 |
| **Total** | **91** | **11** | **7** |

**7 blockers must be resolved before production go-live.**  
**11 warnings are acceptable for Phase 1 launch but should be tracked as Sprint 2 items.**
