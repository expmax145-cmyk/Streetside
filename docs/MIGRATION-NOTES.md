# MIGRATION-NOTES.md — StreetSide Defect Fix Pass + Decisions + Deferred Items

This file covers two rounds of work: the original 29-defect fix pass, and
a follow-up round implementing the three decisions from NEEDS-DECISION.md
(full httpOnly-cookie auth, react-router v7, server-side pagination) plus
six previously-deferred features (email verification, password reset,
PWA/offline, FSSAI/hygiene display, a Media collection for image storage,
and a vendor approval gate).

## Database changes — REQUIRED before deploy

### 1. Drop old offer code unique index
The old `vendor_1_code_1` full-unique index must be dropped and the new partial index created:

```js
// Run in MongoDB shell or via Mongoose syncIndexes
db.offers.dropIndex('vendor_1_code_1');
// Mongoose will create 'vendor_code_active_unique' on next app start
// (syncIndexes is called automatically on model registration)
```

### 2. Backfill `approvalStatus` on existing vendors — CRITICAL
The new vendor approval gate (ITEM F) adds `approvalStatus` to the Vendor
schema with a default of `'pending'`. **Mongoose schema defaults only
apply when a document is created — they are never retroactively applied
to documents that already exist in the database.** If you deploy this
against a database that already has vendors in it, every existing vendor
will have `approvalStatus: undefined`, and since the public vendor list
now filters to `approvalStatus: 'approved'` only, **every existing vendor
will silently disappear from the public site** the moment this deploys,
with no error or warning.

Run this in MongoDB shell **before** or immediately after deploying, before any real traffic hits the new code:

```js
db.vendors.updateMany(
  { approvalStatus: { $exists: false } },
  { $set: { approvalStatus: 'approved' } }
);
```

The seed script (`backend/src/utils/seed.ts`) already sets
`approvalStatus: 'approved'` for fresh seed data, so this step is only
needed for a database that has vendors created before this change.

### 3. RewardActivity — `target` field and partial unique index
The partial unique index `unique_user_action_target` prevents points farming. Existing documents without `target` are unaffected (partial filter requires `target` to exist). No data migration needed.

### 4. AuditLog and Media collections (new)
Both are created automatically on first app start. No migration needed. Note: `Media` documents can grow the database's storage footprint — see "Operational notes" below for the one-time image migration.

## API changes

| Endpoint | Change |
|---|---|
| `POST /api/auth/register` | `vendorId` field removed from accepted body. **Response body no longer contains `accessToken`** — see DECISION 1 below. |
| `POST /api/auth/login` | **Response body no longer contains `accessToken`.** Sets `streetside_access_token`, `streetside_refresh_token`, and `streetside_csrf_token` cookies instead. |
| `POST /api/auth/refresh` | No longer returns `accessToken` in the body; re-issues the access + CSRF cookies. Reads the refresh token from a cookie, not the body. |
| `POST /api/auth/logout` | Clears all three auth cookies. |
| `POST /api/auth/verify-email` | **New** (ITEM A). Body: `{ token }`. |
| `POST /api/auth/resend-verification` | **New** (ITEM A). Authenticated, no body. |
| `POST /api/auth/forgot-password` | **New** (ITEM B). Body: `{ email }`. Always 200. |
| `POST /api/auth/reset-password` | **New** (ITEM B). Body: `{ token, newPassword }`. |
| `POST /api/media` | **New** (ITEM E). Authenticated. Body: `{ dataUri }`. Returns `{ id, url }`. |
| `GET /api/media/:id` | **New** (ITEM E). Public, long-cached, serves the stored image bytes. |
| `GET /api/admin/vendors/pending` | **New** (ITEM F). Not currently called by the dashboard, which filters its already-loaded `/admin/vendors` list client-side instead — kept as a documented, tested API surface for other consumers. |
| `PATCH /api/admin/vendors/:id/approve` | **New** (ITEM F). |
| `PATCH /api/admin/vendors/:id/reject` | **New** (ITEM F). Body: `{ reason? }`. |
| `PUT /api/vendors/:id` | Now also accepts `fssaiLicenseNumber` (owner-writable) and, **admin only**, `hygieneRating` / `hygieneVerified`. |
| `POST /api/vendors` | Every new vendor is now created with `approvalStatus: 'pending'` regardless of what the client sends, and is invisible to the public list/detail endpoints until an admin approves it. |
| `GET /api/vendors`, `GET /api/vendors/:id` | Now also filter out `approvalStatus !== 'approved'` for non-owner/non-admin requesters (in addition to the existing `isActive` filter). |
| **All mutating endpoints (POST/PUT/PATCH/DELETE)** | **Require an `X-CSRF-Token` header matching the `streetside_csrf_token` cookie, but ONLY when the request is authenticated via the access-token cookie.** Requests authenticated via an `Authorization: Bearer` header (API clients, mobile apps, this project's own test suite) are unaffected — see DECISION 1 below for why. |

## DECISION 1 — Full httpOnly cookie auth + CSRF (implemented)

**What changed:**
- The access token is no longer returned in any response body and is never stored in `localStorage`. It lives in a new httpOnly cookie (`streetside_access_token`), just like the refresh token already did.
- A new non-httpOnly `streetside_csrf_token` cookie is issued alongside it. The frontend reads this cookie and echoes it back as an `X-CSRF-Token` header on every mutating request — the backend compares the two (double-submit pattern) and rejects a mismatch with 403.
- `backend/src/middleware/auth.middleware.ts` reads the token from the cookie first, falling back to a `Bearer` header for non-browser clients.
- CSRF enforcement only applies when the request is authenticated via the cookie — a Bearer-header request is not vulnerable to CSRF in the first place (a forged cross-site request can't make a victim's browser attach a header it doesn't automatically attach, only cookies), so enforcing it there would break every non-browser client for no security benefit.
- Frontend: `services/api.ts` no longer manages a token at all; every request goes out with `credentials: 'include'` and the browser handles the cookies. `AuthContext` determines login state by calling `GET /auth/me` on mount instead of checking for a stored token.

**Backward compatibility:** any external API consumer that was parsing `accessToken` out of the login/register/refresh response body **will break** and must switch to sending cookies (if it's browser-based) or a `Bearer` header obtained some other way (there is currently no token-issuing endpoint for pure API clients — see NEEDS-DECISION.md if you need one).

**Required frontend env:** none new — the CSRF cookie is read directly from `document.cookie`, no configuration needed.

**Backend cookie settings:** `secure: true` and `sameSite: 'none'` in production (required for cross-site cookies over HTTPS); `secure: false` and `sameSite: 'lax'` in development (works over plain HTTP on localhost). If your frontend and backend are deployed on different top-level domains in production, confirm `CLIENT_URL`/CORS settings and that both are served over HTTPS — `sameSite: 'none'` cookies are rejected by browsers over plain HTTP.

## DECISION 2 — react-router-dom v7 (implemented)

Upgraded from `^6.30.4` to `^7.18.4`. No application code changes were required — this codebase only uses the stable, backward-compatible declarative API (`BrowserRouter`, `Routes`, `Route`, `useNavigate`, `useParams`, `useSearchParams`, `Link`). Verified with a full `tsc --noEmit` and `vite build` after the upgrade. This resolves the moderate open-redirect CVE that was open in v6.

Also attempted: bumping `vite` to patch its `esbuild` dev-server-only vulnerability. The available patch requires a major version bump to Vite 7 (another breaking change, out of scope for what was asked) — left as-is and still listed in `npm audit`. This vulnerability only affects the local dev server, not a production build, so the risk is limited to a developer's own machine while running `npm run dev`.

## DECISION 3 — Server-side pagination + infinite scroll (implemented)

- New `frontend/src/hooks/useInfiniteVendors.ts`: sends `category`, `veg`, `openNow`, `sort`, `userLat`/`userLng`, `maxDistanceKm`, `page`, and `limit` to the existing (already-capable) `GET /api/vendors` endpoint, and appends results as the user scrolls (via an `IntersectionObserver` sentinel).
- `ExplorePage.tsx` was rewritten to use this hook instead of filtering/sorting the full `DataContext.vendors` array client-side.
- **Deliberately NOT changed:** `SearchPage.tsx` and `DataContext.vendors` (the "load every page" approach from FIX 10) remain as they were. Fuzzy search ranks results by matching menu items across the whole catalog, which a database query can't replicate — it genuinely needs the full dataset client-side. "Similar vendors" lookups also use the full `DataContext.vendors` cache. This is a deliberate scope boundary, not an oversight — document it if a future pass wants to also make search server-side (would need a dedicated `/api/vendors/search` endpoint with server-side fuzzy ranking, a non-trivial addition).

## ITEM A — Email verification (implemented)

- New `User` fields: `emailVerified` (default `false`), `emailVerificationTokenHash`, `emailVerificationExpires`.
- `backend/src/utils/mailer.ts`: uses `nodemailer` if `SMTP_HOST` is set; otherwise **logs the email to the console** instead of failing. This means the feature is fully functional and testable without real email credentials — only actual delivery requires them.
- **New required setup for real email delivery:** set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` in `backend/.env` to a real provider (SendGrid, Mailgun, AWS SES, etc.). Until then, verification/reset links are printed to the server console log — check there to test the flow manually.
- Never blocks login, registration, or any action — only shows a dismissible-per-session banner (`EmailVerificationBanner.tsx`) prompting the user to verify.

## ITEM B — Password reset (implemented)

- New `User` fields: `passwordResetTokenHash`, `passwordResetExpires` (1-hour expiry).
- `POST /auth/forgot-password` always returns 200 regardless of whether the email exists, to prevent account enumeration.
- Resetting a password bumps `refreshTokenVersion`, invalidating every existing session — anyone logged in with the old password is logged out everywhere.
- New pages: `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, linked from `LoginPage.tsx`.

## ITEM C — PWA / offline (implemented)

- Added `vite-plugin-pwa`. Generates a manifest (using the existing `favicon-192x192.png`/`favicon-512x512.png`) and a service worker on `npm run build`.
- Runtime caching: API GETs use `NetworkFirst` (always tries the network first, falls back to a 24-hour-old cache when offline/slow — appropriate for data like vendor hours/prices that can change). Images (`/api/media/*`, vendor/menu photos) use `CacheFirst` with a 30-day expiry, since ITEM E's Media documents are immutable once created.
- `OfflineBanner.tsx` shows a small persistent banner when `navigator.onLine` is false.
- Service worker is disabled in local dev (`devOptions.enabled: false`) to avoid stale-cache confusion while developing — it only activates in a production build.

## ITEM D — FSSAI / hygiene display (implemented)

- New `Vendor` fields: `fssaiLicenseNumber` (owner-writable), `hygieneRating` (1–5) and `hygieneVerified` (both **admin-only** — set via the existing `PUT /vendors/:id` endpoint, which already allowlists fields per-role; no new endpoint was needed).
- Displayed on the public vendor profile only when present — an unlicensed/unverified vendor doesn't show a card full of "N/A" placeholders.
- Vendor dashboard: an input for the FSSAI number, and a read-only display of the current hygiene verification status.
- Admin dashboard: a "Verify" button per vendor opens a small modal to set the rating and mark verified (or remove verification).
- **No real FSSAI data exists** for the seed vendors — this is infrastructure only; actually verifying licenses is an operational process, not something the code can do for you.

## ITEM E — Media collection for image storage (implemented)

- New `Media` collection: `{ data: Buffer, mimeType, uploader, sizeBytes, createdAt }`.
- `POST /api/media` (authenticated) accepts a compressed `data:` URI and returns `{ id, url }`. `GET /api/media/:id` (public) serves it back with a 1-year immutable cache header.
- `ImageUploadField.tsx` now uploads to this endpoint immediately after client-side compression, instead of handing the raw base64 string back to the parent form. The parent form's `value` becomes the short `/api/media/:id` URL.
- **One-time migration script** for any images stored as inline base64 before this change: `backend/src/scripts/migrateImagesToMedia.ts`. Run with:
  ```bash
  cd backend
  npx ts-node src/scripts/migrateImagesToMedia.ts
  ```
  It scans `Vendor.image`, `Vendor.logo`, `MenuItem.image`, and `User.avatar` for `data:image/...;base64,...` values, moves the bytes into a new `Media` document, and replaces the field with the resulting URL. Safe to re-run — already-migrated fields (which no longer match the `data:` prefix) are skipped.
- **Known tradeoff, not fixed:** an image is uploaded to `/api/media` as soon as the user picks a file in `ImageUploadField`, before the surrounding form is saved. If the user then abandons the form without saving, that `Media` document is orphaned (unreferenced, but not deleted). There is no garbage-collection job for orphaned Media documents. At this project's scale this is a non-issue (a few unused images cost nothing meaningful); a production deployment with heavy image-upload-and-abandon traffic would want a periodic sweep job that deletes `Media` documents with no matching reference across `Vendor.image`/`Vendor.logo`/`MenuItem.image`/`User.avatar`.

## ITEM F — Vendor approval gate (implemented)

- New `Vendor` fields: `approvalStatus` (`'pending' | 'approved' | 'rejected'`, default `'pending'`), `rejectionReason`.
- `vendor.service.createVendor` forces `approvalStatus: 'pending'` on every new listing, regardless of what the client sends or who's creating it (including an admin using the same endpoint) — there is no way to self-approve.
- Public listing/detail endpoints filter to `approvalStatus === 'approved'`; a pending or rejected listing returns 404 to anyone but its owner or an admin (no leak of "this exists but isn't public yet").
- Admin dashboard gets a "Pending approval" tab with Approve / Reject (with a reason) actions.
- Vendor dashboard shows a banner explaining the pending/rejected state; owners can keep editing while pending or after rejection.
- **See "Backfill `approvalStatus`" above — this is the critical migration step for any database with existing vendors.**

## Configuration changes (environment variables)

Add to `backend/.env`:

```env
# Number of reverse-proxy hops (0 for direct access, 1 for most setups behind nginx/ALB)
TRUST_PROXY=0

# IANA timezone for open-now and offer expiry (default: Asia/Kolkata)
APP_TIMEZONE=Asia/Kolkata

# Optional rate-limit overrides
API_RATE_LIMIT=300
WRITE_RATE_LIMIT=30

# ITEM A/B: SMTP config — optional; emails log to console if SMTP_HOST is blank
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="StreetSide <no-reply@streetside.app>"

# ITEM B: used to build verification/reset links in emails
FRONTEND_URL=http://localhost:5173
```

Add to `frontend/.env` (optional):

```env
VITE_APP_TIMEZONE=Asia/Kolkata
```

## Dependency changes

- Backend: added `nodemailer` (+ `@types/nodemailer`). `npm audit`: 0 vulnerabilities.
- Frontend: upgraded `react-router-dom` to v7 (DECISION 2); added `vite-plugin-pwa` (ITEM C). `npm audit`: 2 remaining (moderate `esbuild`, high `vite`), both dev-server-only, requiring a Vite 7 major upgrade to fully resolve — see DECISION 2 above.

## Operational notes

- **CSRF and any external API integrations:** if you build a mobile app or third-party integration against this API, authenticate it with a `Bearer` token (there's currently no dedicated token-issuing endpoint for non-browser clients — the existing `/auth/login` sets cookies; you'd need to either extract the cookie manually or, better, ask for a dedicated API-token endpoint to be added). Do not attempt to send an `X-CSRF-Token` header from a non-browser client — it isn't necessary (Bearer auth is exempt) and you won't have a way to obtain a matching cookie value anyway.
- **Orphaned Media documents:** see ITEM E above.
- **SMTP not yet configured:** verification and password-reset emails currently only appear in the backend server's console log. Set the `SMTP_*` env vars to enable real delivery before relying on this in front of real users.

## Backward compatibility

- `POST /api/auth/register` no longer accepting `vendorId` was already backward compatible (the field was silently ignored server-side even before this — see the original FIX 3).
- **Breaking:** the removal of `accessToken` from login/register/refresh response bodies. Any external code — including a previous build of this same frontend, if deployed separately — that reads `res.data.accessToken` will break. This frontend has been fully updated; anything else consuming this API has not.
- All other API response shapes are additive (new optional fields) and backward compatible.
