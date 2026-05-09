import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export * from './schema';

export function createDb(connectionString: string) {
  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  const db = drizzle(client, { schema });

  return { db, client };
}

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) {
    const databaseUrl = process.env['DATABASE_URL'];
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    _db = createDb(databaseUrl);
  }
  return _db;
}

export type Database = ReturnType<typeof createDb>['db'];
