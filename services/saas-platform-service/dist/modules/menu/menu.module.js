"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const menu_entity_1 = require("./entities/menu.entity");
const menu_item_entity_1 = require("./entities/menu-item.entity");
const menu_controller_1 = require("./controllers/menu.controller");
const menu_service_1 = require("./services/menu.service");
const menu_repository_1 = require("./repositories/menu.repository");
const menu_item_repository_1 = require("./repositories/menu-item.repository");
let MenuModule = class MenuModule {
};
exports.MenuModule = MenuModule;
exports.MenuModule = MenuModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([menu_entity_1.MenuEntity, menu_item_entity_1.MenuItemEntity])],
        controllers: [menu_controller_1.MenuController],
        providers: [menu_service_1.MenuService, menu_repository_1.MenuRepository, menu_item_repository_1.MenuItemRepository],
        exports: [menu_service_1.MenuService],
    })
], MenuModule);
//# sourceMappingURL=menu.module.js.map