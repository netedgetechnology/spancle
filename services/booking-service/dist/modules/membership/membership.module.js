"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembershipModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const membership_plan_entity_1 = require("./entities/membership-plan.entity");
const membership_benefit_entity_1 = require("./entities/membership-benefit.entity");
const membership_entity_1 = require("./entities/membership.entity");
const membership_transaction_entity_1 = require("./entities/membership-transaction.entity");
const membership_audit_log_entity_1 = require("./entities/membership-audit-log.entity");
const membership_plan_repository_1 = require("./repositories/membership-plan.repository");
const membership_repository_1 = require("./repositories/membership.repository");
const membership_plan_service_1 = require("./services/membership-plan.service");
const membership_service_1 = require("./services/membership.service");
const membership_scheduler_service_1 = require("./services/membership-scheduler.service");
const membership_plan_controller_1 = require("./controllers/membership-plan.controller");
const membership_controller_1 = require("./controllers/membership.controller");
let MembershipModule = class MembershipModule {
};
exports.MembershipModule = MembershipModule;
exports.MembershipModule = MembershipModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                membership_plan_entity_1.MembershipPlanEntity,
                membership_benefit_entity_1.MembershipBenefitEntity,
                membership_entity_1.MembershipEntity,
                membership_transaction_entity_1.MembershipTransactionEntity,
                membership_audit_log_entity_1.MembershipAuditLogEntity,
            ]),
        ],
        controllers: [
            membership_plan_controller_1.MembershipPlanController,
            membership_controller_1.MembershipController,
        ],
        providers: [
            membership_plan_repository_1.MembershipPlanRepository,
            membership_repository_1.MembershipRepository,
            membership_plan_service_1.MembershipPlanService,
            membership_service_1.MembershipService,
            membership_scheduler_service_1.MembershipSchedulerService,
        ],
        exports: [membership_service_1.MembershipService],
    })
], MembershipModule);
//# sourceMappingURL=membership.module.js.map