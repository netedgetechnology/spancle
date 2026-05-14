"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const axios_1 = require("@nestjs/axios");
const booking_entity_1 = require("./entities/booking.entity");
const booking_payment_entity_1 = require("./entities/booking-payment.entity");
const booking_refund_entity_1 = require("./entities/booking-refund.entity");
const booking_log_entity_1 = require("./entities/booking-log.entity");
const booking_repository_1 = require("./repositories/booking.repository");
const booking_support_repository_1 = require("./repositories/booking-support.repository");
const booking_service_1 = require("./services/booking.service");
const booking_validation_service_1 = require("./services/booking-validation.service");
const booking_controller_1 = require("./controllers/booking.controller");
const slot_module_1 = require("../slot/slot.module");
let BookingModule = class BookingModule {
};
exports.BookingModule = BookingModule;
exports.BookingModule = BookingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                booking_entity_1.BookingEntity,
                booking_payment_entity_1.BookingPaymentEntity,
                booking_refund_entity_1.BookingRefundEntity,
                booking_log_entity_1.BookingLogEntity,
            ]),
            axios_1.HttpModule.register({ timeout: 5_000, maxRedirects: 0 }),
            slot_module_1.SlotModule,
        ],
        controllers: [booking_controller_1.BookingController],
        providers: [
            booking_repository_1.BookingRepository,
            booking_support_repository_1.BookingPaymentRepository,
            booking_support_repository_1.BookingRefundRepository,
            booking_support_repository_1.BookingLogRepository,
            booking_validation_service_1.BookingValidationService,
            booking_service_1.BookingService,
        ],
        exports: [booking_service_1.BookingService, booking_validation_service_1.BookingValidationService],
    })
], BookingModule);
//# sourceMappingURL=booking.module.js.map