"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuestModule = void 0;
const common_1 = require("@nestjs/common");
const guest_session_service_1 = require("./guest-session.service");
const guest_booking_linking_service_1 = require("./guest-booking-linking.service");
const guest_controller_1 = require("./guest.controller");
const booking_module_1 = require("../booking/booking.module");
const qr_module_1 = require("../qr/qr.module");
let GuestModule = class GuestModule {
};
exports.GuestModule = GuestModule;
exports.GuestModule = GuestModule = __decorate([
    (0, common_1.Module)({
        imports: [
            (0, common_1.forwardRef)(() => booking_module_1.BookingModule),
            (0, common_1.forwardRef)(() => qr_module_1.QrModule),
        ],
        controllers: [guest_controller_1.GuestController],
        providers: [guest_session_service_1.GuestSessionService, guest_booking_linking_service_1.GuestBookingLinkingService],
        exports: [guest_session_service_1.GuestSessionService, guest_booking_linking_service_1.GuestBookingLinkingService],
    })
], GuestModule);
//# sourceMappingURL=guest.module.js.map