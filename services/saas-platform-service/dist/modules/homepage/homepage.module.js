"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomepageModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const homepage_section_entity_1 = require("./entities/homepage-section.entity");
const homepage_controller_1 = require("./controllers/homepage.controller");
const homepage_service_1 = require("./services/homepage.service");
const homepage_section_repository_1 = require("./repositories/homepage-section.repository");
let HomepageModule = class HomepageModule {
};
exports.HomepageModule = HomepageModule;
exports.HomepageModule = HomepageModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([homepage_section_entity_1.HomepageSectionEntity])],
        controllers: [homepage_controller_1.HomepageController],
        providers: [homepage_service_1.HomepageService, homepage_section_repository_1.HomepageSectionRepository],
        exports: [homepage_service_1.HomepageService],
    })
], HomepageModule);
//# sourceMappingURL=homepage.module.js.map