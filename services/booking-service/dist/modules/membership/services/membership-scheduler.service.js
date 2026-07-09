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
var MembershipSchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembershipSchedulerService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const config_1 = require("@nestjs/config");
const membership_service_1 = require("./membership.service");
let MembershipSchedulerService = MembershipSchedulerService_1 = class MembershipSchedulerService {
    constructor(membershipService, config) {
        this.membershipService = membershipService;
        this.config = config;
        this.logger = new common_1.Logger(MembershipSchedulerService_1.name);
    }
    async sweepPendingRenewals() {
        try {
            const leadDays = this.config.get('MEMBERSHIP_RENEWAL_LEAD_DAYS', 7);
            const count = await this.membershipService.autoRequestRenewals(leadDays);
            if (count) {
                this.logger.log(`[cron:renewal_sweep] Queued ${count} renewal invoice request(s)`);
            }
        }
        catch (err) {
            this.logger.error(`[cron:renewal_sweep] Sweep failed — ${err.message}`);
        }
    }
    async sweepTrialExpiry() {
        try {
            const count = await this.membershipService.autoExpireTrials();
            if (count) {
                this.logger.log(`[cron:trial_expiry] Expired ${count} trial(s)`);
            }
        }
        catch (err) {
            this.logger.error(`[cron:trial_expiry] Sweep failed — ${err.message}`);
        }
    }
    async sweepGraceExpiry() {
        try {
            const count = await this.membershipService.autoExpireGrace();
            if (count) {
                this.logger.log(`[cron:grace_expiry] Expired ${count} membership(s) after grace`);
            }
        }
        catch (err) {
            this.logger.error(`[cron:grace_expiry] Sweep failed — ${err.message}`);
        }
    }
    async sweepFreezeLift() {
        try {
            const count = await this.membershipService.autoLiftFreezes();
            if (count) {
                this.logger.log(`[cron:freeze_lift] Auto-unfrozen ${count} membership(s)`);
            }
        }
        catch (err) {
            this.logger.error(`[cron:freeze_lift] Sweep failed — ${err.message}`);
        }
    }
    async sweepDowngradeExecution() {
        try {
            const count = await this.membershipService.autoExecuteDowngrades();
            if (count) {
                this.logger.log(`[cron:downgrade_exec] Executed ${count} downgrade(s)`);
            }
        }
        catch (err) {
            this.logger.error(`[cron:downgrade_exec] Sweep failed — ${err.message}`);
        }
    }
    async sweepCancellationFinalisation() {
        try {
            const count = await this.membershipService.autoFinaliseCancellations();
            if (count) {
                this.logger.log(`[cron:cancellation_exec] Finalised ${count} cancellation(s)`);
            }
        }
        catch (err) {
            this.logger.error(`[cron:cancellation_exec] Sweep failed — ${err.message}`);
        }
    }
};
exports.MembershipSchedulerService = MembershipSchedulerService;
__decorate([
    (0, schedule_1.Cron)('0 6 * * *', { name: 'membership:renewal_sweep' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MembershipSchedulerService.prototype, "sweepPendingRenewals", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_30_MINUTES, { name: 'membership:trial_expiry' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MembershipSchedulerService.prototype, "sweepTrialExpiry", null);
__decorate([
    (0, schedule_1.Cron)('0 */4 * * *', { name: 'membership:grace_expiry' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MembershipSchedulerService.prototype, "sweepGraceExpiry", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_30_MINUTES, { name: 'membership:freeze_lift' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MembershipSchedulerService.prototype, "sweepFreezeLift", null);
__decorate([
    (0, schedule_1.Cron)('0 2 * * *', { name: 'membership:downgrade_exec' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MembershipSchedulerService.prototype, "sweepDowngradeExecution", null);
__decorate([
    (0, schedule_1.Cron)('0 3 * * *', { name: 'membership:cancellation_exec' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MembershipSchedulerService.prototype, "sweepCancellationFinalisation", null);
exports.MembershipSchedulerService = MembershipSchedulerService = MembershipSchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [membership_service_1.MembershipService,
        config_1.ConfigService])
], MembershipSchedulerService);
//# sourceMappingURL=membership-scheduler.service.js.map