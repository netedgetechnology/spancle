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

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { TenantEntity }     from './modules/tenant/entities/tenant.entity';
import { UserEntity }       from './modules/user/entities/user.entity';
import { RoleEntity }       from './modules/role/entities/role.entity';
import { IdentityEntity }   from './modules/identity/entities/identity.entity';
import { BranchEntity }     from './modules/branch/entities/branch.entity';
import { CourtEntity }      from './modules/court/entities/court.entity';
import { SportEntity }      from './modules/sport/entities/sport.entity';
import { SportBranchEntity } from './modules/sport/entities/sport-branch.entity';

const dataSource = new DataSource({
  type:               'postgres',
  url:                process.env['DATABASE_URL']!,
  entities:           [
    TenantEntity,
    UserEntity,
    RoleEntity,
    IdentityEntity,
    BranchEntity,
    CourtEntity,
    SportEntity,
    SportBranchEntity,
  ],
  migrations:         ['dist/migrations/*.js'],
  migrationsTableName: 'typeorm_migrations',
  synchronize:        false,
  logging:            ['error', 'migration'],
  ssl: process.env['DATABASE_SSL'] === 'true'
    ? { rejectUnauthorized: process.env['DATABASE_SSL_REJECT_UNAUTHORIZED'] !== 'false' }
    : false,
});

export default dataSource;
