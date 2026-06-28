"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const throttler_1 = require("@nestjs/throttler");
const booking_guard_1 = require("./modules/booking/guards/booking.guard");
const booking_module_1 = require("./modules/booking/booking.module");
const slot_module_1 = require("./modules/slot/slot.module");
const venue_module_1 = require("./modules/venue/venue.module");
const qr_module_1 = require("./modules/qr/qr.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, cache: true }),
            jwt_1.JwtModule.registerAsync({
                global: true,
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    secret: config.getOrThrow('JWT_SECRET'),
                    signOptions: { issuer: config.get('JWT_ISSUER', 'spancle-sports-os') },
                }),
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    type: 'postgres',
                    url: config.getOrThrow('DATABASE_URL'),
                    autoLoadEntities: true,
                    synchronize: false,
                    logging: config.get('NODE_ENV') === 'development' ? ['query', 'error'] : ['error'],
                    extra: {
                        max: config.get('DATABASE_POOL_MAX', 10),
                        idleTimeoutMillis: config.get('DATABASE_POOL_IDLE_TIMEOUT_MS', 30000),
                    },
                    ssl: config.get('DATABASE_SSL') === 'true'
                        ? { rejectUnauthorized: config.get('DATABASE_SSL_REJECT_UNAUTHORIZED') !== 'false' }
                        : false,
                }),
            }),
            event_emitter_1.EventEmitterModule.forRoot({ wildcard: true, delimiter: '.', global: true }),
            throttler_1.ThrottlerModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    throttlers: [{
                            ttl: config.get('RATE_LIMIT_TTL_MS', 60000),
                            limit: config.get('RATE_LIMIT_MAX_REQUESTS', 100),
                        }],
                }),
            }),
            booking_module_1.BookingModule, slot_module_1.SlotModule, venue_module_1.VenueModule, qr_module_1.QrModule,
        ],
        providers: [
            { provide: core_1.APP_GUARD, useClass: booking_guard_1.TenantGuard },
            { provide: core_1.APP_GUARD, useClass: booking_guard_1.RbacGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map