"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DefaultEntitlementResolver_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultEntitlementResolver = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const commercial_events_1 = require("../events/commercial.events");
const commercial_enums_1 = require("../enums/commercial.enums");
let DefaultEntitlementResolver = DefaultEntitlementResolver_1 = class DefaultEntitlementResolver {
    constructor(eventEmitter) {
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(DefaultEntitlementResolver_1.name);
    }
    resolve(packageAssignment, featureFlags) {
        if (!packageAssignment.packageVersion) {
            const msg = `Cannot resolve entitlements: tenant ${packageAssignment.planId} ` +
                `has no PackageVersion (tierKey="${packageAssignment.tierKey}")`;
            this.eventEmitter.emitAsync(commercial_events_1.CommercialEvents.ENTITLEMENT_RESOLUTION_FAILED, {
                tenantId: packageAssignment.planId,
                tierKey: packageAssignment.tierKey,
                reason: 'NO_PACKAGE_VERSION',
                timestamp: new Date().toISOString(),
            }).catch(() => { });
            throw new common_1.UnprocessableEntityException(msg);
        }
        const pv = packageAssignment.packageVersion;
        const baseFeatures = {
            ...pv.features,
            ...packageAssignment.effectiveFeatures,
        };
        const effectivePermissions = { ...baseFeatures };
        for (const flag of featureFlags) {
            switch (flag.status) {
                case commercial_enums_1.FeatureFlagStatus.ENABLED:
                    effectivePermissions[flag.key] = true;
                    break;
                case commercial_enums_1.FeatureFlagStatus.DISABLED:
                    effectivePermissions[flag.key] = false;
                    break;
                case commercial_enums_1.FeatureFlagStatus.GRADUAL:
                    effectivePermissions[flag.key] = false;
                    break;
            }
        }
        const limits = {
            ...pv.limits,
            ...packageAssignment.effectiveLimits,
        };
        const resolvedAt = new Date();
        const bundle = {
            packageVersion: pv,
            enabledFeatures: baseFeatures,
            limits,
            featureFlags,
            effectivePermissions,
            tenantId: packageAssignment.planId,
            tierKey: packageAssignment.tierKey,
            resolvedAt,
        };
        this.logger.debug(`resolve: pkg=${packageAssignment.packageSlug}@${packageAssignment.tierKey} ` +
            `features=${Object.keys(effectivePermissions).length} ` +
            `limits=${Object.keys(limits).length} ` +
            `flags=${featureFlags.length}`);
        this.eventEmitter.emitAsync(commercial_events_1.CommercialEvents.ENTITLEMENTS_RESOLVED, {
            tenantId: packageAssignment.planId,
            tierKey: packageAssignment.tierKey,
            packageVersion: pv.version,
            featureCount: Object.keys(effectivePermissions).length,
            resolvedAt: resolvedAt.toISOString(),
        }).catch(() => { });
        return bundle;
    }
    hasFeature(bundle, featureKey) {
        return bundle.effectivePermissions[featureKey] === true;
    }
    getLimit(bundle, limitKey) {
        const value = bundle.limits[limitKey];
        return value !== undefined ? value : 0;
    }
    isEnabled(bundle, featureKey) {
        const flag = bundle.featureFlags.find((f) => f.key === featureKey);
        if (!flag)
            return this.hasFeature(bundle, featureKey);
        switch (flag.status) {
            case commercial_enums_1.FeatureFlagStatus.ENABLED: return true;
            case commercial_enums_1.FeatureFlagStatus.DISABLED: return false;
            case commercial_enums_1.FeatureFlagStatus.GRADUAL: return false;
        }
    }
};
exports.DefaultEntitlementResolver = DefaultEntitlementResolver;
exports.DefaultEntitlementResolver = DefaultEntitlementResolver = DefaultEntitlementResolver_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2])
], DefaultEntitlementResolver);
//# sourceMappingURL=default-entitlement-resolver.js.map