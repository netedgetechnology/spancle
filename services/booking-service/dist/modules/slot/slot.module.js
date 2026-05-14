"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlotModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const axios_1 = require("@nestjs/axios");
// Entities
const slot_entity_1 = require("./entities/slot.entity");
const slot_template_entity_1 = require("./entities/slot-template.entity");
const pricing_rule_entity_1 = require("./entities/pricing-rule.entity");
const blackout_entity_1 = require("./entities/blackout.entity");
const holiday_entity_1 = require("./entities/holiday.entity");
// Repositories
const slot_repository_1 = require("./repositories/slot.repository");
const slot_template_repository_1 = require("./repositories/slot-template.repository");
const pricing_rule_repository_1 = require("./repositories/pricing-rule.repository");
const blackout_repository_1 = require("./repositories/blackout.repository");
const holiday_repository_1 = require("./repositories/holiday.repository");
// Services
const slot_service_1 = require("./services/slot.service");
const slot_generator_service_1 = require("./services/slot-generator.service");
const pricing_service_1 = require("./services/pricing.service");
const pricing_rule_validation_service_1 = require("./services/pricing-rule-validation.service");
const availability_service_1 = require("./services/availability.service");
const holiday_service_1 = require("./services/holiday.service");
// Controllers
const slot_controller_1 = require("./controllers/slot.controller");
const slot_template_controller_1 = require("./controllers/slot-template.controller");
const pricing_rule_controller_1 = require("./controllers/pricing-rule.controller");
const blackout_controller_1 = require("./controllers/blackout.controller");
const holiday_controller_1 = require("./controllers/holiday.controller");
/**
 * SlotModule — the complete slot engine.
 *
 * Entities registered: slots, slot_templates, pricing_rules, blackouts, holidays
 *
 * HttpModule: used by SlotGeneratorService to call identity-service for
 *   court + branch data (operating hours, status, rate).
 *
 * Exports SlotService and AvailabilityService so BookingModule can:
 *   - Reserve slots before confirming a booking (SlotService.reserve)
 *   - Check availability during booking (AvailabilityService.isWindowFree)
 */
let SlotModule = class SlotModule {
};
exports.SlotModule = SlotModule;
exports.SlotModule = SlotModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                slot_entity_1.SlotEntity,
                slot_template_entity_1.SlotTemplateEntity,
                pricing_rule_entity_1.PricingRuleEntity,
                blackout_entity_1.BlackoutEntity,
                holiday_entity_1.HolidayEntity,
            ]),
            axios_1.HttpModule.register({ timeout: 5_000, maxRedirects: 0 }),
        ],
        controllers: [
            slot_controller_1.SlotController,
            slot_template_controller_1.SlotTemplateController,
            pricing_rule_controller_1.PricingRuleController,
            blackout_controller_1.BlackoutController,
            holiday_controller_1.HolidayController,
        ],
        providers: [
            // Repositories
            slot_repository_1.SlotRepository,
            slot_template_repository_1.SlotTemplateRepository,
            pricing_rule_repository_1.PricingRuleRepository,
            blackout_repository_1.BlackoutRepository,
            holiday_repository_1.HolidayRepository,
            // Services
            slot_service_1.SlotService,
            slot_generator_service_1.SlotGeneratorService,
            pricing_service_1.PricingService,
            pricing_rule_validation_service_1.PricingRuleValidationService,
            availability_service_1.AvailabilityService,
            holiday_service_1.HolidayService,
        ],
        exports: [
            slot_service_1.SlotService,
            availability_service_1.AvailabilityService,
            pricing_service_1.PricingService,
        ],
    })
], SlotModule);
//# sourceMappingURL=slot.module.js.map