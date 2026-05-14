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
declare const dataSource: DataSource;
export default dataSource;
//# sourceMappingURL=ormconfig.d.ts.map