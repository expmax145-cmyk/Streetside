# Streetside

## Database (Supabase Postgres)

The API now stores everything in Postgres (Supabase), in its own `streetside` schema.

- Schema: `backend/db/schema.sql` (idempotent). Apply with `npm run db:migrate --prefix backend`.
- Connection: set `DATABASE_URL` to the Supabase **pooler** connection string (see `backend/.env.example`).
- Demo data: `npm run seed --prefix backend` (wipes the StreetSide tables first).
- Tests run against an in-memory Postgres (PGlite), so `npm test --prefix backend` needs no database.
