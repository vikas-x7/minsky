import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@repo/database';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  public readonly db: ReturnType<typeof drizzle<typeof schema>>;
  private readonly client: ReturnType<typeof postgres>;

  constructor() {
    const databaseUrl = process.env['DATABASE_URL'];
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    this.client = postgres(databaseUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    this.db = drizzle(this.client, { schema });
  }

  async onModuleDestroy() {
    await this.client.end();
  }
}
