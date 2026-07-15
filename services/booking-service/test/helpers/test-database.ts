/**
 * test/helpers/test-database.ts
 *
 * Provides a real PostgreSQL DataSource for integration tests.
 * Tests use TEST_DATABASE_URL (never the production DATABASE_URL).
 *
 * If TEST_DATABASE_URL is unset the caller must skip DB-dependent tests:
 *   if (!db.available) { test.skip('No TEST_DATABASE_URL'); return; }
 *
 * Usage:
 *   const db = new TestDatabase();
 *   beforeAll(async () => db.connect());
 *   afterAll(async () => db.close());
 *   beforeEach(async () => db.truncateTables([...]));
 */
import { DataSource } from 'typeorm';

export class TestDatabase {
  private ds: DataSource | null = null;
  readonly available: boolean;

  constructor() {
    this.available = Boolean(process.env['TEST_DATABASE_URL']);
  }

  async connect(): Promise<DataSource | null> {
    if (!this.available) return null;
    this.ds = new DataSource({
      type:        'postgres',
      url:         process.env['TEST_DATABASE_URL'],
      synchronize: false,
      logging:     false,
    });
    await this.ds.initialize();
    return this.ds;
  }

  get dataSource(): DataSource {
    if (!this.ds) throw new Error('TestDatabase not connected');
    return this.ds;
  }

  async close(): Promise<void> {
    if (this.ds?.isInitialized) await this.ds.destroy();
    this.ds = null;
  }

  /**
   * Truncates named tables in the given order (caller handles FK order).
   * Uses TRUNCATE ... RESTART IDENTITY CASCADE for a clean slate.
   */
  async truncateTables(tables: string[]): Promise<void> {
    if (!this.ds) return;
    for (const t of tables) {
      await this.ds.query(`TRUNCATE TABLE ${t} RESTART IDENTITY CASCADE`);
    }
  }

  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.dataSource.query<T[]>(sql, params);
  }
}
