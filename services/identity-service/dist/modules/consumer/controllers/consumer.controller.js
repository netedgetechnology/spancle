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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsumerController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const tenant_guard_1 = require("../../../common/guards/tenant.guard");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const consumer_registration_service_1 = require("../services/consumer-registration.service");
const consumer_dto_1 = require("../dto/consumer.dto");
let ConsumerController = class ConsumerController {
    constructor(registrationService) {
        this.registrationService = registrationService;
    }
    register(dto, tenant) {
        return this.registrationService.register(dto, tenant.tenantId);
    }
};
exports.ConsumerController = ConsumerController;
__decorate([
    (0, common_1.Post)('register'),
    (0, roles_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60_000 } }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [consumer_dto_1.RegisterConsumerDto, Object]),
    __metadata("design:returntype", void 0)
], ConsumerController.prototype, "register", null);
exports.ConsumerController = ConsumerController = __decorate([
    (0, common_1.Controller)('consumer'),
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [consumer_registration_service_1.ConsumerRegistrationService])
], ConsumerController);
//# sourceMappingURL=consumer.controller.js.map