# Spancle Sports OS — Architecture Overview

> **Status:** Living Document | **Version:** 0.1.0 | **Owner:** Platform Engineering

---

## System Overview

Spancle Sports OS is an enterprise multi-tenant SaaS platform purpose-built for sports
organizations. It provides a unified operating system for leagues, clubs, academies, and
governing bodies to manage players, teams, fixtures, analytics, and billing under a single
platform with full tenant isolation.

---

## Architecture Pillars

| Pillar | Decision |
|--------|----------|
| **Multi-tenancy** | Row-Level Security (RLS) in PostgreSQL. Every table carries `tenant_id`. No cross-tenant query is possible at the database layer. |
| **API-first** | All functionality exposed via versioned REST APIs. Internal services communicate via typed service clients. No direct DB access across service boundaries. |
| **Event-driven** | All state mutations emit Redis Pub/Sub events. Downstream consumers are decoupled from producers. |
| **Audit by default** | Every mutating operation writes to `audit_log` table with actor, tenant, resource, action, before/after payload. |
| **Security by default** | JWT + RBAC guards on all endpoints. Tenant context resolved and validated on every request. |

---

## Monorepo Structure

```
spancle-sports-os/
├── apps/                   # NextJS frontend applications
│   ├── web/                # Tenant-facing web app (Sprint 1)
│   └── admin/              # Platform admin app (Sprint 2)
│
├── services/               # NestJS backend microservices
│   ├── api-gateway/        # Unified API entry point (Sprint 1)
│   ├── auth-service/       # Authentication & authorization (Sprint 1)
│   ├── tenant-service/     # Tenant provisioning & config (Sprint 1)
│   ├── player-service/     # Player management (Sprint 2)
│   ├── team-service/       # Team management (Sprint 2)
│   ├── fixture-service/    # Fixtures & scheduling (Sprint 3)
│   ├── analytics-service/  # Stats & reporting (Sprint 4)
│   ├── billing-service/    # Subscriptions & billing (Sprint 4)
│   └── notification-service/ # Email, push, in-app (Sprint 3)
│
├── packages/               # Shared internal packages
│   ├── types/              # TypeScript types & interfaces
│   ├── tsconfig/           # Shared TS configurations
│   ├── eslint-config/      # Shared ESLint rules
│   ├── ui/                 # Shared React component library (Sprint 2)
│   ├── utils/              # Shared utility functions (Sprint 1)
│   └── sdk/                # Public API SDK (Sprint 5)
│
├── infrastructure/
│   ├── docker/             # Local development containers
│   ├── k8s/                # Kubernetes manifests (Sprint 6)
│   └── terraform/          # Cloud infrastructure (Sprint 6)
│
├── docs/                   # Architecture decisions & guides
├── scripts/                # Developer tooling scripts
└── tests/                  # Global test configuration & utilities
```

---

## Technology Decisions

### Backend: NestJS
- Decorator-based, opinionated structure enforces consistency across services
- Built-in dependency injection aligns with enterprise testability requirements
- First-class TypeScript support with `emitDecoratorMetadata`
- Module system enforces service boundary contracts

### Frontend: Next.js 14+
- App Router with Server Components for tenant-aware SSR
- Edge middleware for tenant resolution before request reaches app
- Parallel routes for multi-panel sports dashboards

### Database: PostgreSQL 16
- Row-Level Security for tenant isolation at storage layer
- JSONB columns for flexible athlete metadata
- Materialized views for analytics query performance

### Cache/Queue/Events: Redis 7
- Logical DB separation: Cache (DB0), Sessions (DB1), BullMQ (DB2), Pub/Sub (DB3)
- All service-to-service events flow through Pub/Sub channels
- Session store for distributed JWT refresh token management

### Monorepo: pnpm + Turborepo
- pnpm workspaces for strict dependency isolation
- Turbo for incremental build caching across CI/CD pipeline

---

## Tenant Isolation Contract

Every layer enforces isolation:

1. **HTTP Layer:** `x-tenant-id` header validated by `TenantGuard` on every request
2. **Service Layer:** `TenantContext` injected via request scope into every service method
3. **Repository Layer:** `tenantId` appended to every query via `TenantAwareRepository` base class
4. **Cache Layer:** All Redis keys namespaced as `tenant:{tenantId}:{resource}:{key}`
5. **Event Layer:** All Pub/Sub channels namespaced as `spancle/{tenantId}/{domain}/{event}`
6. **Database Layer:** Row-Level Security policy on every tenant-scoped table

---

## ADR Index

| ADR | Title | Status |
|-----|-------|--------|
| ADR-001 | Monorepo with pnpm + Turborepo | Accepted |
| ADR-002 | PostgreSQL RLS for tenant isolation | Accepted |
| ADR-003 | Redis logical DB separation by concern | Accepted |
| ADR-004 | JWT + RBAC with per-tenant role definitions | Accepted |
| ADR-005 | Audit log as first-class domain concern | Accepted |

---

## Sprint Roadmap

| Sprint | Scope |
|--------|-------|
| **Sprint 0** | Foundation: monorepo, tooling, infrastructure |
| **Sprint 1** | Auth service, tenant service, API gateway, web app shell |
| **Sprint 2** | Player service, team service, admin app shell |
| **Sprint 3** | Fixture service, notification service |
| **Sprint 4** | Analytics service, billing service |
| **Sprint 5** | Public SDK, webhook system |
| **Sprint 6** | Kubernetes, Terraform, production readiness |
