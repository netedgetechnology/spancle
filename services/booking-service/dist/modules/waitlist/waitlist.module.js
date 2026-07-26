"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaitlistModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const waitlist_entry_entity_1 = require("./entities/waitlist-entry.entity");
const waitlist_repository_1 = require("./repositories/waitlist.repository");
const waitlist_service_1 = require("./services/waitlist.service");
const waitlist_controller_1 = require("./controllers/waitlist.controller");
const slot_module_1 = require("../slot/slot.module");
let WaitlistModule = class WaitlistModule {
};
exports.WaitlistModule = WaitlistModule;
exports.WaitlistModule = WaitlistModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([waitlist_entry_entity_1.WaitlistEntryEntity]), slot_module_1.SlotModule],
        controllers: [waitlist_controller_1.WaitlistController],
        providers: [waitlist_repository_1.WaitlistRepository, waitlist_service_1.WaitlistService],
        exports: [waitlist_service_1.WaitlistService],
    })
], WaitlistModule);
//# sourceMappingURL=waitlist.module.js.map