"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const package_entity_1 = require("./entities/package.entity");
const package_controller_1 = require("./controllers/package.controller");
const package_service_1 = require("./services/package.service");
const package_repository_1 = require("./repositories/package.repository");
const super_admin_guard_1 = require("../admin/guards/super-admin.guard");
let PackageModule = class PackageModule {
};
exports.PackageModule = PackageModule;
exports.PackageModule = PackageModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([package_entity_1.PackageEntity])],
        controllers: [package_controller_1.PackageController],
        providers: [package_service_1.PackageService, package_repository_1.PackageRepository, super_admin_guard_1.SuperAdminGuard],
        exports: [package_service_1.PackageService],
    })
], PackageModule);
//# sourceMappingURL=package.module.js.map