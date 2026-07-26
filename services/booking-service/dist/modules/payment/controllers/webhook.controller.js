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
exports.WebhookController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const booking_guard_1 = require("../../booking/guards/booking.guard");
const webhook_handler_service_1 = require("../services/webhook-handler.service");
let WebhookController = class WebhookController {
    constructor(handler) {
        this.handler = handler;
    }
    async handleWebhook(provider, req) {
        if (!req.rawBody) {
            throw new common_1.BadRequestException('Raw body unavailable — configure bodyParser.raw() for /webhooks/* in main.ts (PAY-1)');
        }
        const rawBody = req.rawBody;
        const signature = req.headers['stripe-signature'] ??
            req.headers['x-razorpay-signature'];
        const sourceIp = req.headers['x-forwarded-for']
            ?? req.socket.remoteAddress
            ?? undefined;
        const tenantId = req.headers['x-tenant-id'] ?? '';
        const result = await this.handler.handle({
            provider: provider.toLowerCase(),
            tenantId,
            rawBody,
            signature,
            payload: req.body,
            sourceIp,
        });
        return { received: true, status: result.status };
    }
};
exports.WebhookController = WebhookController;
__decorate([
    (0, common_1.Post)(':provider'),
    (0, roles_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('provider')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "handleWebhook", null);
exports.WebhookController = WebhookController = __decorate([
    (0, common_1.Controller)('webhooks'),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard),
    __metadata("design:paramtypes", [webhook_handler_service_1.WebhookHandlerService])
], WebhookController);
//# sourceMappingURL=webhook.controller.js.map