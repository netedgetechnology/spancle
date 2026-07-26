"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const webhook_event_entity_1 = require("./entities/webhook-event.entity");
const gateway_registry_service_1 = require("./services/gateway-registry.service");
const payment_orchestrator_service_1 = require("./services/payment-orchestrator.service");
const webhook_handler_service_1 = require("./services/webhook-handler.service");
const payment_controller_1 = require("./controllers/payment.controller");
const webhook_controller_1 = require("./controllers/webhook.controller");
const finance_module_1 = require("../finance/finance.module");
const booking_module_1 = require("../booking/booking.module");
let PaymentModule = class PaymentModule {
};
exports.PaymentModule = PaymentModule;
exports.PaymentModule = PaymentModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            typeorm_1.TypeOrmModule.forFeature([webhook_event_entity_1.WebhookEventEntity]),
            finance_module_1.FinanceModule,
            (0, common_1.forwardRef)(() => booking_module_1.BookingModule),
        ],
        controllers: [
            payment_controller_1.PaymentController,
            webhook_controller_1.WebhookController,
        ],
        providers: [
            gateway_registry_service_1.GatewayRegistry,
            payment_orchestrator_service_1.PaymentOrchestratorService,
            webhook_handler_service_1.WebhookHandlerService,
        ],
        exports: [
            gateway_registry_service_1.GatewayRegistry,
            payment_orchestrator_service_1.PaymentOrchestratorService,
            webhook_handler_service_1.WebhookHandlerService,
        ],
    })
], PaymentModule);
//# sourceMappingURL=payment.module.js.map