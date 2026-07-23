"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const cache_manager_1 = require("@nestjs/cache-manager");
const config_1 = require("@nestjs/config");
const redisStore = __importStar(require("cache-manager-ioredis"));
const qr_token_entity_1 = require("./entities/qr-token.entity");
const qr_scan_log_entity_1 = require("./entities/qr-scan-log.entity");
const qr_token_repository_1 = require("./repositories/qr-token.repository");
const qr_generation_service_1 = require("./services/qr-generation.service");
const qr_validation_service_1 = require("./services/qr-validation.service");
const qr_controller_1 = require("./controllers/qr.controller");
const booking_module_1 = require("../booking/booking.module");
let QrModule = class QrModule {
};
exports.QrModule = QrModule;
exports.QrModule = QrModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([qr_token_entity_1.QrTokenEntity, qr_scan_log_entity_1.QrScanLogEntity]),
            cache_manager_1.CacheModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    store: redisStore,
                    host: config.get('REDIS_HOST', 'localhost'),
                    port: config.get('REDIS_PORT', 6379),
                    password: config.get('REDIS_PASSWORD', ''),
                    db: config.get('REDIS_DB_CACHE', 0),
                    ttl: 86_400,
                    max: 500,
                }),
            }),
            (0, common_1.forwardRef)(() => booking_module_1.BookingModule),
        ],
        controllers: [qr_controller_1.QrController],
        providers: [
            qr_token_repository_1.QrTokenRepository,
            qr_generation_service_1.QrGenerationService,
            qr_validation_service_1.QrValidationService,
        ],
        exports: [qr_generation_service_1.QrGenerationService, qr_validation_service_1.QrValidationService],
    })
], QrModule);
//# sourceMappingURL=qr.module.js.map