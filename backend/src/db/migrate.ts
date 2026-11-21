import { connectDB, disconnectDB, applySchema } from './engine';

/** Applies db/schema.sql to DATABASE_URL (idempotent). Usage: npm run db:migrate */
async function main() {
  await connectDB();
  await applySchema();
  console.log('[db] schema applied');
  await disconnectDB();
}

main().catch((err) => {
  console.error('[db] migrate failed:', err);
  process.exit(1);
});
