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
var GuestBookingLinkingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuestBookingLinkingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const booking_entity_1 = require("../booking/entities/booking.entity");
let GuestBookingLinkingService = GuestBookingLinkingService_1 = class GuestBookingLinkingService {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(GuestBookingLinkingService_1.name);
    }
    async linkGuestBookings(params) {
        const email = params.customerEmail.toLowerCase().trim();
        const result = await this.dataSource
            .createQueryBuilder()
            .update(booking_entity_1.BookingEntity)
            .set({ userId: params.userId })
            .where('tenantId = :tenantId', { tenantId: params.tenantId })
            .andWhere('customerEmail = :email', { email })
            .andWhere('userId IS NULL')
            .andWhere('isDeleted = false')
            .execute();
        const linked = result.affected ?? 0;
        if (linked > 0) {
            this.logger.log(`Guest bookings linked — tenant=${params.tenantId} ` +
                `userId=${params.userId} email=[masked] linked=${linked}`);
        }
        return { linked };
    }
};
exports.GuestBookingLinkingService = GuestBookingLinkingService;
exports.GuestBookingLinkingService = GuestBookingLinkingService = GuestBookingLinkingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], GuestBookingLinkingService);
//# sourceMappingURL=guest-booking-linking.service.js.map