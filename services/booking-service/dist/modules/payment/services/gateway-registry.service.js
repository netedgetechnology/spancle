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
var GatewayRegistry_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayRegistry = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stripe_adapter_1 = require("../../finance/gateway/stripe.adapter");
const payment_gateway_adapter_1 = require("../../finance/gateway/payment-gateway.adapter");
let GatewayRegistry = GatewayRegistry_1 = class GatewayRegistry {
    constructor(config, stripe) {
        this.config = config;
        this.stripe = stripe;
        this.logger = new common_1.Logger(GatewayRegistry_1.name);
        this.adapters = new Map();
        this.adapters.set(this.stripe.gatewayName, this.stripe);
        const razorpay = new payment_gateway_adapter_1.RazorpayAdapter();
        this.adapters.set(razorpay.gatewayName, razorpay);
        this.logger.log(`Gateway registry initialised — gateways: [${[...this.adapters.keys()].join(', ')}]`);
    }
    getActiveGateway() {
        const name = this.config.get('PAYMENT_GATEWAY', 'stripe').toLowerCase().trim();
        return this.getGateway(name);
    }
    getGateway(name) {
        const adapter = this.adapters.get(name.toLowerCase());
        if (!adapter) {
            throw new common_1.NotFoundException(`Payment gateway '${name}' is not registered. ` +
                `Available: [${[...this.adapters.keys()].join(', ')}]`);
        }
        return adapter;
    }
    getActiveGatewayName() {
        return this.config.get('PAYMENT_GATEWAY', 'stripe').toLowerCase().trim();
    }
    listGateways() {
        return [...this.adapters.keys()];
    }
};
exports.GatewayRegistry = GatewayRegistry;
exports.GatewayRegistry = GatewayRegistry = GatewayRegistry_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        stripe_adapter_1.StripeAdapter])
], GatewayRegistry);
//# sourceMappingURL=gateway-registry.service.js.map