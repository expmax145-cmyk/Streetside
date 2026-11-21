import { connectDB, disconnectDB } from '../config/db';
import { truncateAll } from '../db/engine';

// Tests run against an in-memory Postgres (PGlite) built from db/schema.sql.
beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await connectDB('');
});

afterEach(async () => {
  try {
    await truncateAll();
  } catch {
    // Surface on the next operation rather than breaking cleanup.
  }
});

afterAll(async () => {
  await disconnectDB();
});
