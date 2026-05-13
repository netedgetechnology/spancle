/**
 * TypeORM DataSource — academy-service
 * Used by: typeorm migration:run, migration:revert, migration:generate
 */

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { AcademyEntity } from './modules/academy/entities/academy.entity';
import { CoachEntity } from './modules/coach/entities/coach.entity';
import { PlayerEntity } from './modules/player/entities/player.entity';

const dataSource = new DataSource({
  type:               'postgres',
  url:                process.env['DATABASE_URL']!,
  entities:           [
    AcademyEntity,
    CoachEntity,
    PlayerEntity,
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
