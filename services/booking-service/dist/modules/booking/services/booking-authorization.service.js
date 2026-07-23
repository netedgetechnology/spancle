"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BookingAuthorizationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingAuthorizationService = void 0;
const common_1 = require("@nestjs/common");
let BookingAuthorizationService = BookingAuthorizationService_1 = class BookingAuthorizationService {
    constructor() {
        this.logger = new common_1.Logger(BookingAuthorizationService_1.name);
        this.STAFF_ROLES = new Set([
            'TENANT_ADMIN',
            'TENANT_MANAGER',
            'COACH',
            'SUPER_ADMIN',
        ]);
    }
    assertOwnerOrStaff(booking, actor, resource = 'booking') {
        if (this.STAFF_ROLES.has(actor.role))
            return;
        if (!actor.userId || booking.userId !== actor.userId) {
            this.logger.warn(`Booking ownership violation — ` +
                `actor=${actor.actorId} role=${actor.role} userId=${actor.userId ?? 'null'} ` +
                `booking=${booking.id} ref=${booking.reference} ` +
                `owner=${booking.userId ?? 'null'} resource=${resource}`);
            throw new common_1.ForbiddenException(`You do not have permission to access this ${resource}`);
        }
    }
    isOwnerOrStaff(booking, actor) {
        if (this.STAFF_ROLES.has(actor.role))
            return true;
        return !!actor.userId && booking.userId === actor.userId;
    }
};
exports.BookingAuthorizationService = BookingAuthorizationService;
exports.BookingAuthorizationService = BookingAuthorizationService = BookingAuthorizationService_1 = __decorate([
    (0, common_1.Injectable)()
], BookingAuthorizationService);
//# sourceMappingURL=booking-authorization.service.js.map