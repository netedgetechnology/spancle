# Commercial Engine — Architecture

## Overview

The Commercial Engine is a NestJS bounded context in `saas-platform-service`.  
It has **no dependency on BookingModule or FinanceModule**. Cross-engine communication is event-only.

## Layers

```
HTTP Request
     ↓
CommercialDecisionController   (POST /commercial/decisions)
     ↓
CommercialDecisionService      (VALIDATE → RESOLVE → SNAPSHOT)
     ↓
IPolicyResolver                (POLICY_RESOLVER symbol)
     ↓
DefaultPolicyResolver          resolves the full bundle
  ├── PlanService              tenant → Plan → Package (authoritative assignment)
  ├── PackageVersionRepository pinned version via plan.tierKey
  ├── IEntitlementResolver     feature/limit computation
  ├── CommercialRuleVersionRepository  active rule versions (pinned)
  ├── OwnershipPolicyRepository
  ├── DistributionPolicyRepository
  ├── PricingModelRepository
  ├── GatewayDefinitionRepository
  └── FeatureFlagRepository
     ↓
IEntitlementResolver           (ENTITLEMENT_RESOLVER symbol)
     ↓
DefaultEntitlementResolver     builds EntitlementBundle from PackageVersionEntity
```

## Tenant → Plan → Package → Version Flow

```
PlanService.findForTenant(tenantId)
  → PlanEntity { id, packageId, tierKey, featureOverrides, limitOverrides }
        ↓
PackageService.findOne(plan.packageId)
  → PackageEntity { slug, status, features, limits }
  → Validates: status ∈ {active, deprecated}
        ↓
PackageVersionRepository.findByPackageAndVersion(packageId, plan.tierKey)
  → PackageVersionEntity { version, features, limits, prices }
  → Version is PINNED by plan.tierKey — never "latest"
        ↓
PackageAssignment {
  planId, packageId, packageSlug, tierKey,
  packageVersion (immutable),
  effectiveFeatures = pv.features + plan.featureOverrides,
  effectiveLimits   = pv.limits   + plan.limitOverrides
}
```

## Package Assignment Lifecycle

| State | Description |
|---|---|
| Plan created | `SubscriptionService` calls `PlanService.upsertForTenant()` → new `PlanEntity` |
| Assignment resolved | `DefaultPolicyResolver` reads active plan, loads package and version |
| Entitlements built | `DefaultEntitlementResolver` merges features/limits/flags into `EntitlementBundle` |
| Decision made | `CommercialDecisionService` writes immutable `CommercialDecisionSnapshotEntity` |
| Replay | Snapshot `resultPayload.packageAssignment` contains full `PackageAssignmentSnapshot` |

## PolicyResolver Contract

`IPolicyResolver.resolve(context)` must:
- Never read `PackageEntity` after `PackageAssignment` is built
- Never sort package versions to pick "latest"
- Always resolve via `PlanEntity.tierKey` = `PackageVersionEntity.version`
- Emit `PACKAGE_RESOLVED` on success, `PACKAGE_RESOLUTION_FAILED` on error
- Return `null` `packageAssignment` when tenant has no plan (DENIED outcome)

## EntitlementResolver Contract

`IEntitlementResolver.resolve(assignment, flags)` must:
- Read features/limits exclusively from `PackageVersionEntity` (immutable)
- Apply `PlanEntity` overrides (already pre-computed in `PackageAssignment`)
- Never read from `PackageEntity` (mutable)
- Apply `FeatureFlagEntity` overrides: DISABLED > ENABLED > GRADUAL (→ false) > package default
- Return an `EntitlementBundle` with pre-computed `effectivePermissions` (O(1) lookups)

## Decision → Policy Interaction

```
CommercialDecisionService.evaluate(context)
  1. VALIDATE_REQUEST  — input type guards
  2. RESOLVE (via PolicyResolver)
     ├── stepResolveViaPolicy(ctx)
     │     → policyResolver.resolve(context)
     │     → gets full ResolvedPolicyBundle including entitlementBundle
     └── RESOLVE_PACKAGE / RESOLVE_PRODUCT / RESOLVE_POLICIES stepTrace entries
  3. GENERATE_SNAPSHOT
     → writes CommercialDecisionSnapshotEntity (INSERT-only)
     → resultPayload.packageAssignment = PackageAssignmentSnapshot (serialised)
     → includes planId, packageId, packageSlug, packageVersion, tierKey
```

## Snapshot Immutability

`CommercialDecisionSnapshotEntity` is INSERT-only (`@CreateDateColumn` only, no `@UpdateDateColumn`). The `resultPayload` stores a full `PackageAssignmentSnapshot` for deterministic replay without re-querying.

## Events

| Event | When |
|---|---|
| `DECISION_REQUESTED` | Before pipeline begins |
| `PACKAGE_RESOLVED` | Package version successfully pinned |
| `PACKAGE_RESOLUTION_FAILED` | Plan missing, package inactive, or version missing |
| `POLICY_RESOLVED` | Full bundle assembled |
| `POLICY_RESOLUTION_FAILED` | Any resolution error |
| `ENTITLEMENTS_RESOLVED` | EntitlementBundle built |
| `ENTITLEMENT_RESOLUTION_FAILED` | PackageVersion missing |
| `DECISION_GENERATED` | Snapshot written, result returned |
| `DECISION_FAILED` | Unrecoverable pipeline error |
