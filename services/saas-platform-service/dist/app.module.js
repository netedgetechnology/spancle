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
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
const tenant_module_1 = require("./modules/tenant/tenant.module");
const package_module_1 = require("./modules/package/package.module");
const subscription_module_1 = require("./modules/subscription/subscription.module");
const plan_module_1 = require("./modules/plan/plan.module");
const cms_module_1 = require("./modules/cms/cms.module");
const admin_module_1 = require("./modules/admin/admin.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, cache: true }),
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
            tenant_module_1.TenantModule, package_module_1.PackageModule, subscription_module_1.SubscriptionModule, plan_module_1.PlanModule, cms_module_1.CmsModule, admin_module_1.AdminModule,
        ],
        providers: [
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map