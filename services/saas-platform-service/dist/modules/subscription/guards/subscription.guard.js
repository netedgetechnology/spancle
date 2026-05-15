"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantGuard = exports.SubscriptionGuard = void 0;
const common_1 = require("@nestjs/common");
const tenant_guard_1 = require("../../tenant/guards/tenant.guard");
let SubscriptionGuard = class SubscriptionGuard extends tenant_guard_1.TenantGuard {
};
exports.SubscriptionGuard = SubscriptionGuard;
exports.SubscriptionGuard = SubscriptionGuard = __decorate([
    (0, common_1.Injectable)()
], SubscriptionGuard);
var tenant_guard_2 = require("../../tenant/guards/tenant.guard");
Object.defineProperty(exports, "TenantGuard", { enumerable: true, get: function () { return tenant_guard_2.TenantGuard; } });
//# sourceMappingURL=subscription.guard.js.map