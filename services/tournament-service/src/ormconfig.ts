/**
 * TypeORM DataSource — tournament-service
 * Used by: typeorm migration:run, migration:revert, migration:generate
 */

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { BracketEntity } from './modules/bracket/entities/bracket.entity';
import { MatchEntity } from './modules/match/entities/match.entity';
import { TournamentEntity } from './modules/tournament/entities/tournament.entity';

const dataSource = new DataSource({
  type:               'postgres',
  url:                process.env['DATABASE_URL']!,
  entities:           [
    BracketEntity,
    MatchEntity,
    TournamentEntity,
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
