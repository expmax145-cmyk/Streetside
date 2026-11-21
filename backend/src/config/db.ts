import { connectDB as connect, disconnectDB as disconnect } from '../db/engine';
import { env } from './env';

/**
 * Connects to Postgres (Supabase). The schema is managed by
 * backend/db/schema.sql (`npm run db:migrate`), so nothing is migrated here.
 */
export async function connectDB(url: string = env.databaseUrl): Promise<void> {
  await connect(url || undefined);
}

export async function disconnectDB(): Promise<void> {
  await disconnect();
}
