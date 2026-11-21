import fs from 'node:fs';
import path from 'node:path';
import { translateDbError } from './errors';

/**
 * Postgres connection layer.
 *
 * - Production / development: a `pg` connection pool pointed at DATABASE_URL
 *   (for Supabase, use the *connection pooler* URL so serverless functions
 *   don't exhaust connections).
 * - Tests (NODE_ENV=test with no URL): an in-memory PGlite database, which is
 *   real Postgres compiled to WASM — no external service needed.
 */

export interface QueryResult {
  rows: any[];
  rowCount: number;
}

interface Driver {
  query(text: string, params?: unknown[]): Promise<QueryResult>;
  end(): Promise<void>;
}

let driver: Driver | null = null;
let connecting: Promise<void> | null = null;

const SCHEMA_FILE = path.resolve(__dirname, '../../db/schema.sql');

export function readSchemaSql(): string {
  return fs.readFileSync(SCHEMA_FILE, 'utf8');
}

async function createPgDriver(url: string): Promise<Driver> {
  // Loaded lazily so tests (PGlite) never need the native-ish `pg` module.
  const { Pool } = await import('pg');
  const isLocal = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
  const pool = new Pool({
    connectionString: url,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    // Serverless functions each hold their own pool; keep it small.
    max: Number(process.env.DB_POOL_MAX) || 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  pool.on('error', (err) => console.error('[db] idle client error:', err.message));
  return {
    async query(text, params) {
      const res = await pool.query(text, params as any[]);
      return { rows: res.rows, rowCount: res.rowCount ?? 0 };
    },
    end: () => pool.end(),
  };
}

async function createPgliteDriver(): Promise<Driver> {
  // Module name kept in a variable so bundlers/file tracers don't ship the
  // (dev-only) PGlite WASM with the production serverless function.
  const moduleName = '@electric-sql/pglite';
  const { PGlite } = await import(moduleName);
  const db = new PGlite();
  await db.exec(readSchemaSql());
  return {
    async query(text, params) {
      const res = await db.query(text, params as any[]);
      return { rows: res.rows as any[], rowCount: res.affectedRows ?? res.rows.length };
    },
    end: () => db.close(),
  };
}

export async function connectDB(url?: string): Promise<void> {
  if (driver) return;
  if (connecting) return connecting;

  connecting = (async () => {
    const target = url ?? process.env.DATABASE_URL ?? '';
    if (!target) {
      if (process.env.NODE_ENV === 'test') {
        driver = await createPgliteDriver();
        console.log('[db] in-memory Postgres (PGlite) ready');
        return;
      }
      throw new Error('DATABASE_URL is not set — cannot connect to the database.');
    }
    const candidate = await createPgDriver(target);
    try {
      await candidate.query('select 1');
    } catch (err) {
      await candidate.end().catch(() => undefined);
      throw err;
    }
    driver = candidate;
    console.log('[db] Postgres connected');
  })();

  try {
    await connecting;
  } finally {
    connecting = null;
  }
}

export async function disconnectDB(): Promise<void> {
  const d = driver;
  driver = null;
  if (d) await d.end();
}

export function isConnected(): boolean {
  return driver !== null;
}

/** Runs a parameterised query. Postgres errors are translated to API-friendly types. */
export async function query(text: string, params: unknown[] = []): Promise<QueryResult> {
  if (!driver) throw new Error('Database is not connected');
  try {
    return await driver.query(text, params);
  } catch (err) {
    throw translateDbError(err);
  }
}

/** Test helper: empties every StreetSide table. */
export async function truncateAll(): Promise<void> {
  await query(
    `truncate table streetside.audit_logs, streetside.media, streetside.reward_activities,
       streetside.reports, streetside.favorites, streetside.food_trails, streetside.events,
       streetside.offers, streetside.reviews, streetside.menu_items, streetside.vendors,
       streetside.users restart identity cascade`,
  );
}

/** Applies db/schema.sql (idempotent). Used by `npm run db:migrate`. */
export async function applySchema(): Promise<void> {
  await query(readSchemaSql());
}
