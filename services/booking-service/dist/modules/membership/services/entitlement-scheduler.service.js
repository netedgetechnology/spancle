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
var EntitlementSchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntitlementSchedulerService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const entitlement_service_1 = require("./entitlement.service");
let EntitlementSchedulerService = EntitlementSchedulerService_1 = class EntitlementSchedulerService {
    constructor(entitlementService) {
        this.entitlementService = entitlementService;
        this.logger = new common_1.Logger(EntitlementSchedulerService_1.name);
    }
    async resetDueBalances() {
        try {
            const count = await this.entitlementService.autoResetDueBalances();
            if (count) {
                this.logger.log(`[cron:period_reset] Reset ${count} entitlement balance(s)`);
            }
        }
        catch (err) {
            this.logger.error(`[cron:period_reset] Failed — ${err.message}`);
        }
    }
    async releaseStaleReservations() {
        try {
            const count = await this.entitlementService.autoReleaseStaleReservations();
            if (count) {
                this.logger.log(`[cron:stale_reservations] Cleared ${count} stale reservation(s)`);
            }
        }
        catch (err) {
            this.logger.error(`[cron:stale_reservations] Failed — ${err.message}`);
        }
    }
};
exports.EntitlementSchedulerService = EntitlementSchedulerService;
__decorate([
    (0, schedule_1.Cron)('30 2 * * *', { name: 'entitlement:period_reset' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EntitlementSchedulerService.prototype, "resetDueBalances", null);
__decorate([
    (0, schedule_1.Cron)('0 */4 * * *', { name: 'entitlement:stale_reservations' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EntitlementSchedulerService.prototype, "releaseStaleReservations", null);
exports.EntitlementSchedulerService = EntitlementSchedulerService = EntitlementSchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [entitlement_service_1.EntitlementService])
], EntitlementSchedulerService);
//# sourceMappingURL=entitlement-scheduler.service.js.map