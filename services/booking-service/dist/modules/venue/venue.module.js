"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VenueModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const venue_controller_1 = require("./controllers/venue.controller");
const venue_service_1 = require("./services/venue.service");
const venue_repository_1 = require("./repositories/venue.repository");
const venue_entity_1 = require("./entities/venue.entity");
let VenueModule = class VenueModule {
};
exports.VenueModule = VenueModule;
exports.VenueModule = VenueModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([venue_entity_1.VenueEntity])],
        controllers: [venue_controller_1.VenueController],
        providers: [venue_service_1.VenueService, venue_repository_1.VenueRepository],
        exports: [venue_service_1.VenueService],
    })
], VenueModule);
//# sourceMappingURL=venue.module.js.map