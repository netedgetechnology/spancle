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
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const auth_module_1 = require("./modules/auth/auth.module");
const identity_module_1 = require("./modules/identity/identity.module");
const user_module_1 = require("./modules/user/user.module");
const role_module_1 = require("./modules/role/role.module");
const tenant_module_1 = require("./modules/tenant/tenant.module");
const onboarding_module_1 = require("./modules/onboarding/onboarding.module");
const branch_module_1 = require("./modules/branch/branch.module");
const sport_module_1 = require("./modules/sport/sport.module");
const court_module_1 = require("./modules/court/court.module");
const tenant_guard_1 = require("./common/guards/tenant.guard");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
const roles_guard_1 = require("./common/guards/roles.guard");
const permissions_guard_1 = require("./common/guards/permissions.guard");
const tenant_status_guard_1 = require("./modules/tenant/guards/tenant-status.guard");
const plan_limit_guard_1 = require("./modules/tenant/guards/plan-limit.guard");
const tenant_context_middleware_1 = require("./common/middleware/tenant-context.middleware");
const tenant_context_interceptor_1 = require("./common/interceptors/tenant-context.interceptor");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(tenant_context_middleware_1.TenantContextMiddleware).forRoutes('*');
    }
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
                            ttl: config.get('RATE_LIMIT_TTL_MS', 60_000),
                            limit: config.get('RATE_LIMIT_MAX_REQUESTS', 100),
                        }],
                }),
            }),
            tenant_module_1.TenantModule,
            auth_module_1.AuthModule,
            identity_module_1.IdentityModule,
            user_module_1.UserModule,
            role_module_1.RoleModule,
            onboarding_module_1.OnboardingModule,
            branch_module_1.BranchModule,
            sport_module_1.SportModule,
            court_module_1.CourtModule,
        ],
        providers: [
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            { provide: core_1.APP_GUARD, useClass: tenant_guard_1.TenantGuard },
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
            { provide: core_1.APP_GUARD, useClass: tenant_status_guard_1.TenantStatusGuard },
            { provide: core_1.APP_GUARD, useClass: plan_limit_guard_1.PlanLimitGuard },
            { provide: core_1.APP_GUARD, useClass: roles_guard_1.RolesGuard },
            { provide: core_1.APP_GUARD, useClass: permissions_guard_1.PermissionsGuard },
            { provide: core_1.APP_INTERCEPTOR, useClass: tenant_context_interceptor_1.TenantContextInterceptor },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map