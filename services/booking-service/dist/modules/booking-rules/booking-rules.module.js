"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingRulesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const booking_rules_entity_1 = require("./entities/booking-rules.entity");
const booking_rules_repository_1 = require("./repositories/booking-rules.repository");
const booking_rules_service_1 = require("./services/booking-rules.service");
const booking_rules_controller_1 = require("./controllers/booking-rules.controller");
let BookingRulesModule = class BookingRulesModule {
};
exports.BookingRulesModule = BookingRulesModule;
exports.BookingRulesModule = BookingRulesModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([booking_rules_entity_1.BookingRulesEntity])],
        controllers: [booking_rules_controller_1.BookingRulesController],
        providers: [booking_rules_repository_1.BookingRulesRepository, booking_rules_service_1.BookingRulesService],
        exports: [booking_rules_service_1.BookingRulesService],
    })
], BookingRulesModule);
//# sourceMappingURL=booking-rules.module.js.map