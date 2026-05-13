/**
 * TypeORM DataSource — reporting-service
 * Used by: typeorm migration:run, migration:revert, migration:generate
 */

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { DashboardEntity } from './modules/dashboard/entities/dashboard.entity';
import { MetricEntity } from './modules/metric/entities/metric.entity';
import { ReportEntity } from './modules/report/entities/report.entity';

const dataSource = new DataSource({
  type:               'postgres',
  url:                process.env['DATABASE_URL']!,
  entities:           [
    DashboardEntity,
    MetricEntity,
    ReportEntity,
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
