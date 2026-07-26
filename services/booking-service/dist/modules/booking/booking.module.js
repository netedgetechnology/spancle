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
const booking_entity_1 = require("./entities/booking.entity");
const booking_payment_entity_1 = require("./entities/booking-payment.entity");
const booking_refund_entity_1 = require("./entities/booking-refund.entity");
const booking_refund_payment_allocation_entity_1 = require("./entities/booking-refund-payment-allocation.entity");
const booking_log_entity_1 = require("./entities/booking-log.entity");
const booking_repository_1 = require("./repositories/booking.repository");
const booking_support_repository_1 = require("./repositories/booking-support.repository");
const booking_service_1 = require("./services/booking.service");
const booking_validation_service_1 = require("./services/booking-validation.service");
const booking_scheduler_service_1 = require("./services/booking-scheduler.service");
const booking_authorization_service_1 = require("./services/booking-authorization.service");
const booking_controller_1 = require("./controllers/booking.controller");
const court_module_1 = require("../court/court.module");
const venue_module_1 = require("../venue/venue.module");
const pricing_module_1 = require("../pricing/pricing.module");
const common_2 = require("@nestjs/common");
const qr_module_1 = require("../qr/qr.module");
const booking_rules_module_1 = require("../booking-rules/booking-rules.module");
const customer_module_1 = require("../customer/customer.module");
const membership_module_1 = require("../membership/membership.module");
const membership_integration_service_1 = require("./services/membership-integration.service");
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
                booking_refund_payment_allocation_entity_1.BookingRefundPaymentAllocationEntity,
                booking_log_entity_1.BookingLogEntity,
            ]),
            pricing_module_1.PricingModule,
            court_module_1.CourtModule,
            venue_module_1.VenueModule,
            (0, common_2.forwardRef)(() => qr_module_1.QrModule),
            booking_rules_module_1.BookingRulesModule,
            customer_module_1.CustomerModule,
            membership_module_1.MembershipModule,
        ],
        controllers: [booking_controller_1.BookingController],
        providers: [
            booking_repository_1.BookingRepository,
            booking_support_repository_1.BookingPaymentRepository,
            booking_support_repository_1.BookingRefundRepository,
            booking_support_repository_1.BookingLogRepository,
            booking_validation_service_1.BookingValidationService,
            booking_authorization_service_1.BookingAuthorizationService,
            membership_integration_service_1.MembershipIntegrationService,
            booking_service_1.BookingService,
            booking_scheduler_service_1.BookingSchedulerService,
        ],
        exports: [booking_service_1.BookingService, booking_validation_service_1.BookingValidationService, booking_authorization_service_1.BookingAuthorizationService, booking_repository_1.BookingRepository, booking_support_repository_1.BookingLogRepository],
    })
], BookingModule);
//# sourceMappingURL=booking.module.js.map