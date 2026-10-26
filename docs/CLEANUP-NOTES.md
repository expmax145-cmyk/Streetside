# Cleanup pass

- Merged the three archives into one project (root `package.json`, `frontend/`, `backend/`, `docs/`).
- Removed dead code: `frontend/src/data/vendors.ts`, `frontend/src/data/content.ts`, `frontend/src/lib/distance.ts` (no imports anywhere).
- Removed 7 vendor images referenced nowhere (10, 11, 12, 14, 15, 16, 19) and resized the rest to 1200px wide (26 MB -> 1.5 MB).
- PWA: stopped precaching photos (service worker precache 31 MB -> 0.6 MB); photos still cached at runtime.
- Bug fix: `/api/auth/refresh` added to CSRF-exempt paths (the frontend assumed it was; a still-present access cookie would have caused a 403 on refresh).
- Stripped "FIX n / ITEM x / DECISION n" change-log tags from code comments and `.env.example`.
- ESLint: context files no longer raise fast-refresh warnings.
- Docs moved into `docs/`.
- Not verified: Jest suite (needs a MongoDB binary download, blocked here). Typecheck, lint and both builds pass.
