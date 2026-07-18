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
var DefaultGatewayRegistry_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultGatewayRegistry = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const commercial_events_1 = require("../events/commercial.events");
const commercial_enums_1 = require("../enums/commercial.enums");
const GATEWAY_TYPE_ORDER = {
    [commercial_enums_1.GatewayType.STRIPE]: 1,
    [commercial_enums_1.GatewayType.RAZORPAY]: 2,
    [commercial_enums_1.GatewayType.PAYU]: 3,
    [commercial_enums_1.GatewayType.CASHFREE]: 4,
    [commercial_enums_1.GatewayType.MANUAL]: 5,
    [commercial_enums_1.GatewayType.CUSTOM]: 6,
};
const PRIORITY_ORDER = {
    [commercial_enums_1.GatewayPriority.PRIMARY]: 1,
    [commercial_enums_1.GatewayPriority.SECONDARY]: 2,
    [commercial_enums_1.GatewayPriority.FALLBACK]: 3,
};
let DefaultGatewayRegistry = DefaultGatewayRegistry_1 = class DefaultGatewayRegistry {
    constructor(eventEmitter) {
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(DefaultGatewayRegistry_1.name);
    }
    resolve(gatewayDefinitions, credentials, ownershipType, context) {
        const resolvedAt = new Date();
        const { tenantId, currency, country } = context;
        const credentialMap = new Map();
        for (const cred of credentials) {
            if (cred.isActive && cred.scope === commercial_enums_1.GatewayScope.PLATFORM) {
                credentialMap.set(cred.gatewayDefinitionId, cred);
            }
        }
        for (const cred of credentials) {
            if (cred.isActive && cred.scope === commercial_enums_1.GatewayScope.TENANT) {
                credentialMap.set(cred.gatewayDefinitionId, cred);
            }
        }
        const tenantPreferred = ownershipType === commercial_enums_1.PaymentOwnershipType.TENANT ||
            ownershipType === commercial_enums_1.PaymentOwnershipType.SPLIT;
        const entries = [];
        for (const def of gatewayDefinitions) {
            if (!def.isActive)
                continue;
            const supportedCurrencies = def.supportedCurrencies;
            const caps = def.capabilities;
            const supportedCountries = caps['supportedCountries'] ?? [];
            const currencyMatch = supportedCurrencies.length === 0 ||
                supportedCurrencies.map((c) => c.toUpperCase()).includes(currency.toUpperCase());
            const countryMatch = supportedCountries.length === 0 ||
                supportedCountries.map((c) => c.toUpperCase()).includes(country.toUpperCase());
            const credential = credentialMap.get(def.id) ?? null;
            const hasTenantCred = credential?.scope === commercial_enums_1.GatewayScope.TENANT;
            const hasPlatformCred = credential?.scope === commercial_enums_1.GatewayScope.PLATFORM;
            let priority;
            if (!credential) {
                priority = commercial_enums_1.GatewayPriority.FALLBACK;
            }
            else if (tenantPreferred) {
                priority = hasTenantCred ? commercial_enums_1.GatewayPriority.PRIMARY : commercial_enums_1.GatewayPriority.SECONDARY;
            }
            else {
                priority = hasPlatformCred ? commercial_enums_1.GatewayPriority.PRIMARY : commercial_enums_1.GatewayPriority.SECONDARY;
            }
            const safeCredential = credential
                ? (({ secretConfigEncrypted: _, ...rest }) => rest)(credential)
                : null;
            entries.push({
                definition: def,
                credential: safeCredential,
                priority,
                supportedCurrencies,
                supportedCountries,
                isEligible: currencyMatch && countryMatch,
            });
        }
        entries.sort((a, b) => {
            const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
            if (pDiff !== 0)
                return pDiff;
            const aOrder = GATEWAY_TYPE_ORDER[a.definition.gatewayType] ?? 99;
            const bOrder = GATEWAY_TYPE_ORDER[b.definition.gatewayType] ?? 99;
            return aOrder - bOrder;
        });
        const eligible = entries.filter((e) => e.isEligible);
        const primary = eligible[0] ?? null;
        const bundle = {
            eligible,
            all: entries,
            primary,
            requestedCurrency: currency,
            requestedCountry: country,
            resolvedAt,
        };
        this.logger.debug(`resolve: tenant=${tenantId} currency=${currency} country=${country} ` +
            `total=${entries.length} eligible=${eligible.length} ` +
            `primary=${primary?.definition.gatewayType ?? 'none'}`);
        this.eventEmitter.emitAsync(primary ? commercial_events_1.CommercialEvents.GATEWAY_SELECTED : commercial_events_1.CommercialEvents.GATEWAY_SELECTION_FAILED, {
            tenantId,
            primaryGatewayType: primary?.definition.gatewayType ?? null,
            eligibleCount: eligible.length,
            totalCount: entries.length,
            currency,
            country,
            resolvedAt: resolvedAt.toISOString(),
        }).catch(() => { });
        return bundle;
    }
};
exports.DefaultGatewayRegistry = DefaultGatewayRegistry;
exports.DefaultGatewayRegistry = DefaultGatewayRegistry = DefaultGatewayRegistry_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2])
], DefaultGatewayRegistry);
//# sourceMappingURL=default-gateway-registry.js.map