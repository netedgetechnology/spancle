"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformModule = void 0;
const common_1 = require("@nestjs/common");
const platform_contract_publisher_interface_1 = require("./publisher/platform-contract-publisher.interface");
const in_process_platform_contract_publisher_1 = require("./publisher/in-process-platform-contract-publisher");
let PlatformModule = class PlatformModule {
};
exports.PlatformModule = PlatformModule;
exports.PlatformModule = PlatformModule = __decorate([
    (0, common_1.Module)({
        providers: [
            {
                provide: platform_contract_publisher_interface_1.PLATFORM_CONTRACT_PUBLISHER,
                useClass: in_process_platform_contract_publisher_1.InProcessPlatformContractPublisher,
            },
        ],
        exports: [platform_contract_publisher_interface_1.PLATFORM_CONTRACT_PUBLISHER],
    })
], PlatformModule);
//# sourceMappingURL=platform.module.js.map