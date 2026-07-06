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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var BookingSchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingSchedulerService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const booking_service_1 = require("./booking.service");
let BookingSchedulerService = BookingSchedulerService_1 = class BookingSchedulerService {
    constructor(bookingService, config, dataSource) {
        this.bookingService = bookingService;
        this.config = config;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(BookingSchedulerService_1.name);
    }
    async expireStaleReservations() {
        try {
            const count = await this.bookingService.autoExpireReservations();
            if (count) {
                this.logger.log(`[cron:expire] Released ${count} stale reservation(s)`);
            }
        }
        catch (err) {
            this.logger.error(`[cron:expire] Sweep failed — ${err.message}`);
        }
    }
    async markInProgressStarted() {
        try {
            for (const tenantId of await this.activeTenants()) {
                const count = await this.bookingService.autoMarkInProgress(tenantId);
                if (count) {
                    this.logger.log(`[cron:in_progress] tenant=${tenantId} count=${count}`);
                }
            }
        }
        catch (err) {
            this.logger.error(`[cron:in_progress] Sweep failed — ${err.message}`);
        }
    }
    async completeFinishedBookings() {
        try {
            for (const tenantId of await this.activeTenants()) {
                const count = await this.bookingService.autoCompleteExpired(tenantId);
                if (count) {
                    this.logger.log(`[cron:complete] tenant=${tenantId} count=${count}`);
                }
            }
        }
        catch (err) {
            this.logger.error(`[cron:complete] Sweep failed — ${err.message}`);
        }
    }
    async markNoShows() {
        try {
            for (const tenantId of await this.activeTenants()) {
                const count = await this.bookingService.autoMarkNoShows(tenantId);
                if (count) {
                    this.logger.log(`[cron:no_show] tenant=${tenantId} count=${count}`);
                }
            }
        }
        catch (err) {
            this.logger.error(`[cron:no_show] Sweep failed — ${err.message}`);
        }
    }
    async activeTenants() {
        const rows = await this.dataSource.query(`SELECT DISTINCT tenant_id
       FROM bookings
       WHERE is_deleted = false
         AND status NOT IN ('cancelled', 'completed', 'refunded', 'expired', 'no_show', 'rescheduled')
       LIMIT 200`);
        return rows.map((r) => r.tenant_id);
    }
};
exports.BookingSchedulerService = BookingSchedulerService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BookingSchedulerService.prototype, "expireStaleReservations", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BookingSchedulerService.prototype, "markInProgressStarted", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BookingSchedulerService.prototype, "completeFinishedBookings", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BookingSchedulerService.prototype, "markNoShows", null);
exports.BookingSchedulerService = BookingSchedulerService = BookingSchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [booking_service_1.BookingService,
        config_1.ConfigService,
        typeorm_2.DataSource])
], BookingSchedulerService);
//# sourceMappingURL=booking-scheduler.service.js.map