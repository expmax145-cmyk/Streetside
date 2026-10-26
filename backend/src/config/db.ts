import mongoose from 'mongoose';
import { env } from './env';

mongoose.set('strictQuery', true);

/**
 * Safe, idempotent startup migrations — run automatically every time the
 * server connects to the database, so nobody ever has to open a MongoDB
 * shell and type a command by hand.
 *
 * Both steps are no-ops on a brand-new/empty database (nothing to
 * migrate) and no-ops on a database that's already been migrated once
 * (nothing left to find), so it's always safe to run this on every
 * startup, not just the first one.
 */
async function runStartupMigrations(): Promise<void> {
  // 1. Drop the old full-unique offer-code index, if it still exists.
  // It was replaced by a partial index (only enforced on active offers)
  // so a deleted offer's code can be reused. A fresh database was never
  // created with the old index in the first place, so this simply does
  // nothing there.
  try {
    const offersCollection = mongoose.connection.collection('offers');
    const indexes = await offersCollection.indexes();
    if (indexes.some((i) => i.name === 'vendor_1_code_1')) {
      await offersCollection.dropIndex('vendor_1_code_1');
      console.log('[db] Migration: dropped legacy offer code index (vendor_1_code_1)');
    }
  } catch (err) {
    // Collection may not exist yet on a brand-new database — that's fine.
    console.warn('[db] Migration (offer index) skipped:', (err as Error).message);
  }

  // 2. Backfill approvalStatus on any vendor created before the vendor
  // approval gate existed. Mongoose schema defaults only apply to newly
  // created documents, never retroactively — without this, an existing
  // vendor would have approvalStatus: undefined and silently disappear
  // from the public site the moment this code deploys (the public list
  // only shows approvalStatus: 'approved'). Vendors from BEFORE this
  // feature existed were already live and reviewed by nobody needing to
  // re-approve them, so 'approved' is the correct backfill value, not
  // 'pending'.
  try {
    const result = await mongoose.connection.collection('vendors').updateMany(
      { approvalStatus: { $exists: false } },
      { $set: { approvalStatus: 'approved' } },
    );
    if (result.modifiedCount > 0) {
      console.log(`[db] Migration: backfilled approvalStatus on ${result.modifiedCount} existing vendor(s)`);
    }
  } catch (err) {
    console.warn('[db] Migration (vendor approvalStatus) skipped:', (err as Error).message);
  }
}

export async function connectDB(uri: string = env.mongodbUri): Promise<void> {
  if (!uri) {
    throw new Error('MONGODB_URI is not set — cannot connect to the database.');
  }

  mongoose.connection.on('connected', () => {
    console.log('[db] MongoDB connected');
  });
  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB connection error:', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected');
  });

  await mongoose.connect(uri);
  await runStartupMigrations();
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
