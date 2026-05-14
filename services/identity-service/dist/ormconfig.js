"use strict";
/**
 * TypeORM DataSource — identity-service
 * Used by: typeorm migration:run, migration:revert, migration:generate
 *
 * Usage:
 *   npx typeorm migration:run    -d dist/ormconfig.js
 *   npx typeorm migration:revert -d dist/ormconfig.js
 *   npx typeorm schema:sync      -d dist/ormconfig.js   # initial setup only
 *   npx typeorm schema:log       -d dist/ormconfig.js   # preview changes
 */
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const typeorm_1 = require("typeorm");
const tenant_entity_1 = require("./modules/tenant/entities/tenant.entity");
const user_entity_1 = require("./modules/user/entities/user.entity");
const role_entity_1 = require("./modules/role/entities/role.entity");
const identity_entity_1 = require("./modules/identity/entities/identity.entity");
const branch_entity_1 = require("./modules/branch/entities/branch.entity");
const court_entity_1 = require("./modules/court/entities/court.entity");
const sport_entity_1 = require("./modules/sport/entities/sport.entity");
const sport_branch_entity_1 = require("./modules/sport/entities/sport-branch.entity");
const dataSource = new typeorm_1.DataSource({
    type: 'postgres',
    url: process.env['DATABASE_URL'],
    entities: [
        tenant_entity_1.TenantEntity,
        user_entity_1.UserEntity,
        role_entity_1.RoleEntity,
        identity_entity_1.IdentityEntity,
        branch_entity_1.BranchEntity,
        court_entity_1.CourtEntity,
        sport_entity_1.SportEntity,
        sport_branch_entity_1.SportBranchEntity,
    ],
    migrations: ['dist/migrations/*.js'],
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    logging: ['error', 'migration'],
    ssl: process.env['DATABASE_SSL'] === 'true'
        ? { rejectUnauthorized: process.env['DATABASE_SSL_REJECT_UNAUTHORIZED'] !== 'false' }
        : false,
});
exports.default = dataSource;
//# sourceMappingURL=ormconfig.js.map