# CHANGELOG-FIXES.md — StreetSide Defect Fix Pass

All 29 defects addressed. Format: **#N — Title | Severity | Files | Status**

---

## PHASE 1 — Security and data integrity

### #1 — Mass assignment on vendor create/update | HIGH | FIXED
**Root cause:** `createVendor` and `updateVendor` called `Object.assign(vendor, req.body)` with no field filtering.  
**Files:** `backend/src/services/vendor.service.ts`, `backend/src/controllers/vendor.controller.ts`  
**Fix:** `sanitizeVendorUpdate()` explicit allowlist. Protected fields (`rating`, `reviewCount`, `popularity`, `views`, `isActive`, `owner`, `location.point`) are stripped for all callers. Only admins can set `isActive`. Non-admins cannot edit deactivated listings.  
**Tests:** See `backend/src/tests/security.test.ts` (mass assignment section).

### #2 — Offer/menu can be re-parented to another vendor | HIGH | FIXED
**Root cause:** `updateOffer` and `updateMenuItem` assigned raw body including `vendor`.  
**Files:** `backend/src/services/offer.service.ts`, `backend/src/services/menu.service.ts`  
**Fix:** `sanitizeOfferInput()` and `sanitizeMenuInput()` whitelists strip `vendor`, `_id`, and timestamps.  
**Tests:** See security tests — cross-vendor reassignment.

### #3 — Unvalidated vendorId on registration | MEDIUM | FIXED
**Root cause:** `register()` accepted `vendorId` from untrusted input, linking an arbitrary vendor to any new account.  
**Files:** `backend/src/services/auth.service.ts`, `backend/src/routes/auth.routes.ts`, `backend/src/controllers/auth.controller.ts`, `frontend/src/services/authService.ts`, `frontend/src/contexts/AuthContext.tsx`  
**Fix:** `vendorId` removed from the register payload on both sides. Ownership is created only inside `createVendor()`.

### #4 — Suspension not immediate; stale role in token | HIGH | FIXED
**Root cause:** `authenticate` only verified the JWT signature — it never checked the DB for current `status` or `role`.  
**Files:** `backend/src/middleware/auth.middleware.ts`, `backend/src/controllers/admin.controller.ts`, `backend/src/services/auth.service.ts`  
**Fix:** `authenticate` now does a lightweight DB read (`select('status role vendor')`) on every request. Suspended users get 403 immediately. Admin suspend also `$inc refreshTokenVersion`. Self-suspend and last-admin-suspend blocked.  
**Tests:** See `security.test.ts` — suspension tests.

### #5 — Deleted vendor locks out owner | MEDIUM | FIXED
**Root cause:** Soft-delete set `isActive=false` but left `user.vendor` pointing at the dead listing.  
**Files:** `backend/src/services/vendor.service.ts`, `backend/src/controllers/admin.controller.ts`  
**Fix:** `deleteVendor()` unsets `user.vendor` when deactivating. `createVendor()` only blocks on active linked vendors.  
**Tests:** See `vendor.test.ts` — delete-and-recreate test.

### #6 — Self-review; report abuse | MEDIUM | FIXED
**Root cause:** No check that the reviewer wasn't the vendor owner. Reports had no duplicate prevention.  
**Files:** `backend/src/services/review.service.ts`, `backend/src/controllers/report.controller.ts`, `backend/src/models/Report.model.ts`  
**Fix:** `createReview` throws 403 if `vendor.owner === userId`. `createReport` verifies the target exists and rejects duplicate pending reports from the same reporter.

---

## PHASE 2 — API correctness

### #7 — Client mistakes return 500 | HIGH | FIXED
**Root cause:** `errorHandler` had no branch for body-parser `SyntaxError` or `entity.*` errors; CORS passed an `Error` object but handler fell through to 500.  
**Files:** `backend/src/middleware/errorHandler.ts`, `backend/src/app.ts`  
**Fix:** Explicit `isCorsError`, `isBodyParserError`, and `SyntaxError` branches. Malformed JSON → 400, body too large → 413, CORS denied → 403.  
**Tests:** Supertest cases in `security.test.ts`.

### #8 — Health endpoint returns 200 when DB disconnected | MEDIUM | FIXED
**Root cause:** Health route always called `sendSuccess`.  
**Files:** `backend/src/routes/health.routes.ts`  
**Fix:** Returns 503 with `status: 'degraded'` when `mongoose.connection.readyState !== 1`.

### #9 — Rate limiter broken behind proxy; no write limiter; refresh loop | HIGH | FIXED
**Root cause:** No `trust proxy` setting; failed logins triggered an extra `/auth/refresh` call; concurrent 401s spawned multiple refresh requests.  
**Files:** `backend/src/app.ts`, `backend/src/middleware/rateLimiter.ts`, `backend/src/config/env.ts`, `frontend/src/services/api.ts`  
**Fix:** `TRUST_PROXY` env var; write limiter on mutation routes keyed by user id; auth paths skip refresh-and-retry; single-flight refresh promise prevents concurrent refresh races.

---

## PHASE 3 — Data and pagination

### #10 — Vendors beyond 50 never appear; unstable sort | MEDIUM | FIXED
**Root cause:** Frontend fetched `limit=50` once; no deterministic `_id` tiebreaker in sort.  
**Files:** `backend/src/services/vendor.service.ts`  
**Fix:** `IN_MEMORY_FILTER_CAP` raised to 2000; all sorts append `_id: 1` tiebreaker; frontend `DataContext` loops pages until `pagination.totalPages`.  
**Note:** Frontend DataContext page-loop change is documented in NEEDS-DECISION.md (it increases initial load).

### #11 — Open-now uses server/browser timezone, not IST | HIGH | FIXED
**Root cause:** Both `vendorHours.ts` and `format.ts` called `new Date().getHours()` which uses the server/browser OS timezone.  
**Files:** `backend/src/utils/vendorHours.ts`, `backend/src/utils/timezone.ts` (new), `frontend/src/lib/format.ts`  
**Fix:** Both files now use `Intl.DateTimeFormat` to extract local IST time. Overnight schedules fixed by checking yesterday's day-range when `now < closeTime`.

### #12 — Offer codes can't reuse after soft-delete; early IST expiry | MEDIUM | FIXED
**Root cause:** Old index was a full unique index (not partial); date-only expiry stored at UTC midnight.  
**Files:** `backend/src/models/Offer.model.ts`, `backend/src/services/offer.service.ts`, `backend/src/utils/timezone.ts`  
**Fix:** Partial unique index (`partialFilterExpression: { isActive: true }`); duplicate-key error now throws a clear message. `endOfDayInTimezone()` normalizes date-only expiry to 23:59:59 IST.

---

## PHASE 4 — Frontend correctness

### #13 — Distance always shows "0.0 km" | HIGH | FIXED
**Root cause:** Frontend never sent `userLat`/`userLng`; backend attached `_distanceKm` via `Object.assign` on a Mongoose doc, which `toJSON()` dropped.  
**Files:** `backend/src/services/vendor.service.ts`, `frontend/src/hooks/useUserLocation.ts` (new), `frontend/src/lib/distance.ts` (new)  
**Fix:** Backend spreads `{ ...doc.toJSON(), distanceKm }` when coords are present. Frontend `useUserLocation` hook computes distance client-side with haversine. Distance label hidden when location is unknown.

### #14 — Saving vendor settings wipes menu in UI | HIGH | FIXED
**Root cause:** `PUT /vendors/:id` response didn't include the `menu` virtual; `DataContext` replaced the vendor object, wiping `menu: []`.  
**Files:** `backend/src/services/vendor.service.ts`, `frontend/src/contexts/DataContext.tsx`  
**Fix:** `updateVendor` calls `vendor.populate('menu')` before returning. `DataContext.updateVendorSettings` falls back to existing `menu` if the response omits it.

### #15 — Login shows wrong error for every failure case | MEDIUM | FIXED
**Root cause:** `AuthContext.login` caught all errors and returned `false`.  
**Files:** `frontend/src/contexts/AuthContext.tsx`, `frontend/src/pages/LoginPage.tsx`, `frontend/src/pages/RegisterPage.tsx`, `frontend/src/pages/VendorRegisterPage.tsx`  
**Fix:** `login` and `register` now return `{ ok: boolean; error?: string }`. Status-specific messages: 401 → wrong credentials, 403 → suspended, 429 → rate-limited, network → connection error.

### #16 — Points toast shows +100, server awards 50 | MEDIUM | FIXED
**Root cause:** `VendorProfilePage` hard-coded `addPoints(100)` locally.  
**Files:** `frontend/src/contexts/AuthContext.tsx`, `frontend/src/pages/VendorProfilePage.tsx`, `backend/src/services/reward.service.ts`  
**Fix:** `addPoints` removed from `AuthContext`. After a review, `refreshUser()` is called to get the server-authoritative balance. `getMyRewards` now exposes `pointValues` so UI can read them.

### #17 — Menu editing is delete-then-create | MEDIUM | FIXED
**Root cause:** `VendorDashboardPage` deleted the item and created a new one instead of calling `PUT /menu/:id`.  
**Files:** `frontend/src/contexts/DataContext.tsx`, `backend/src/services/menu.service.ts`  
**Fix:** `DataContext.updateMenuItem` now calls the existing `PUT /menu/:id` endpoint. Edit is atomic and preserves the item's `_id`. Error toast keeps the modal open on failure.

### #18 — Admin dashboard only sees active vendors | MEDIUM | FIXED
**Root cause:** Admin dashboard called the public list endpoint (capped at 50 active vendors).  
**Files:** `backend/src/controllers/admin.controller.ts`, `backend/src/routes/admin.routes.ts`, `frontend/src/services/adminService.ts`, `frontend/src/pages/AdminDashboardPage.tsx`  
**Fix:** `/admin/vendors` now returns all vendors (active + inactive) via `Vendor.find()` with no filter. New `PATCH /admin/vendors/:id/status` endpoint for activate/deactivate. Counts derived from the admin list.

### #19 — Geolocation denial silently fakes city-center position | MEDIUM | FIXED
**Root cause:** Geolocation error callback set location to a hardcoded lat/lng.  
**Files:** `frontend/src/hooks/useUserLocation.ts`, `frontend/src/components/GoogleMapView.tsx`, `frontend/src/components/MapView.tsx`  
**Fix:** On denial or failure, `location` stays `null` and `status` becomes `'denied'`. No fake "you are here" marker is shown. A non-blocking notice appears instead.

---

## PHASE 5 — Rewards and ranking

### #20 — Points can be farmed (unfavorite/refavorite, delete/re-review) | HIGH | FIXED
**Root cause:** `awardPoints` had no check for whether the award had already been given for this user+action+vendor.  
**Files:** `backend/src/models/RewardActivity.model.ts`, `backend/src/services/reward.service.ts`, `backend/src/services/favorite.service.ts`, `backend/src/services/review.service.ts`  
**Fix:** `RewardActivity` gains a `target` (vendor ObjectId) field and a partial unique index on `(user, action, target)`. `awardPoints` checks existence before inserting. Points are NOT reversed on delete/unfavorite.

### #21 — Popularity never updates; views inflate from bots/owners | MEDIUM | FIXED
**Root cause:** `popularity` was set only in the seed script; `views` incremented on every GET.  
**Files:** `backend/src/services/vendor.service.ts`, `backend/src/services/review.service.ts`, `backend/src/services/favorite.service.ts`  
**Fix:** `recomputeVendorPopularity()` produces a 0–100 score from rating, reviewCount, favorites count, and views. Called after review and favorite changes. View deduplication: at most once per (hashed IP, vendor) per 30 minutes; owners and admins exempt.

---

## PHASE 6 — Images

### #22 — PNG transparency → black; GIF size not limited; review list carries 900 KB avatars | MEDIUM | FIXED
**Root cause:** Canvas re-encoded all images as JPEG without filling the background; GIFs bypassed compression; review populate included full base64 avatar.  
**Files:** `frontend/src/lib/imageUpload.ts`, `backend/src/services/review.service.ts`  
**Fix:** JPEG output fills white background first; WebP used for PNG with alpha when browser supports it; GIFs over 500 KB rejected with a friendly message; iterative quality reduction until output ≤ 350 KB; review list strips avatars > 20 KB (returns `null`, UI falls back to initials).

---

## PHASE 7 — Maps and search

### #23 — Google Maps loader hangs if script tag already exists | LOW | FIXED
**Root cause:** Loader injected the script again even if it had already run; no timeout.  
**Files:** `frontend/src/lib/googleMapsLoader.ts`  
**Fix:** Immediate resolve if `window.google?.maps` already present. 10-second timeout rejects and clears `loaderPromise` so `SmartMap` shows its fallback. Failure resets `loaderPromise` to allow retry.

### #24 — Single-letter search returns all 20 vendors | LOW | FIXED
**Root cause:** `searchVendors` tokenized and matched single characters.  
**Files:** `frontend/src/lib/searchVendors.ts`  
**Fix:** Tokens shorter than 2 characters are filtered out; a query with no tokens ≥ 2 chars returns `[]`.

---

## PHASE 8 — Dead code

### #25 — `data/vendors.ts` and `data/content.ts` are dead code | LOW | NOTED
**Root cause:** Files were never imported anywhere (only referenced in seed.ts comments).  
**Files:** `frontend/src/data/vendors.ts`, `frontend/src/data/content.ts`  
**Action:** Both files marked with a dead-code header comment. Safe to delete in a future cleanup PR; retained here to avoid breaking validate-seed.ts comments.

---

## PHASE 9 — Dependencies

### #26 — Dependency vulnerabilities | LOW | PARTIALLY FIXED
**Fix:** `npm audit fix` run on both packages (no `--force`).  
- Backend: 0 vulnerabilities remaining.  
- Frontend: 4 remaining (3 moderate, 1 high) all in `react-router-dom` — require a major version upgrade (v7). See NEEDS-DECISION.md.

---

## PHASE 10 — Hygiene

### #27 — Missing .gitignore; dist ships tests; package named wrong; ts-jest deprecated config; no graceful Mongo shutdown | LOW | FIXED
**Files:** `.gitignore` (new), `backend/tsconfig.build.json` (new), `backend/package.json`, `frontend/package.json`, `backend/src/server.ts`  
**Fix:**
- `.gitignore` at project root covering `node_modules`, `dist`, `.env`, `coverage`
- `tsconfig.build.json` excludes `src/tests` from the production build
- Build script updated to use `tsconfig.build.json`
- `ts-jest` migrated from deprecated `globals` to `transform` config
- Frontend package renamed from `vite-react-typescript-starter` to `streetside-frontend`
- `server.ts` graceful shutdown: HTTP close → `mongoose.disconnect()` → 10-second force-exit

---

## Extra fixes included

### #28 — AuditLog model (new)
Admin actions (suspend user, activate/deactivate vendor, resolve report) are now written to an `AuditLog` collection with `actor`, `action`, `target`, and `meta`.

### #29 — AdminDashboardPage data source
Admin overview totals now come from `/admin/vendors` (all vendors), not the public 50-cap list.

---

# Round 2 — Decisions Implemented + Previously-Deferred Items

Following up on `NEEDS-DECISION.md` from Round 1, the three decisions
were made and implemented, and all six previously-"intentionally not
implemented" items were built out. Full design rationale and migration
steps for every item below are in the updated `MIGRATION-NOTES.md` and
`SECURITY-AUDIT.md` — this changelog entry summarizes what changed and
where.

## DECISION 1 — Full httpOnly cookie auth + CSRF protection | STATUS: Implemented

**Files:** `backend/src/utils/cookies.ts`, `backend/src/middleware/csrf.middleware.ts` (new), `backend/src/middleware/auth.middleware.ts`, `backend/src/controllers/auth.controller.ts`, `backend/src/app.ts`, `frontend/src/services/api.ts`, `frontend/src/services/authService.ts`, `frontend/src/contexts/AuthContext.tsx`

The access token moved from the response body (previously stored client-side in `localStorage`) into a second httpOnly cookie, matching how the refresh token already worked. A new non-httpOnly CSRF cookie is issued alongside it; the frontend echoes its value back as an `X-CSRF-Token` header on every mutating request, and the backend verifies the two match (double-submit pattern) — but **only for requests actually authenticated via the cookie**. A `Bearer`-header request (API clients, this project's test suite) is exempt, correctly, since it was never vulnerable to CSRF in the first place.

**Test suite impact (see TEST-REPORT.md for full detail):** `auth.test.ts` was rewritten to exercise the real cookie+CSRF flow instead of asserting on a body token that no longer exists. `reward.test.ts` needed a one-line fix for the same reason.

## DECISION 2 — react-router-dom v7 upgrade | STATUS: Implemented

**Files:** `frontend/package.json`

Upgraded `react-router-dom` from `^6.30.4` to `^7.18.4`, resolving the moderate open-redirect CVE. Zero application code changes were needed — verified with a full `tsc --noEmit` and `vite build` — because this codebase only used the stable declarative API that v7 kept backward compatible.

## DECISION 3 — Server-side pagination + infinite scroll | STATUS: Implemented (scoped)

**Files:** `frontend/src/hooks/useInfiniteVendors.ts` (new), `frontend/src/pages/ExplorePage.tsx` (rewritten)

The Explore page now fetches vendors from the server one page at a time (20 per page), filtering and sorting server-side (category, veg, open-now, sort order, distance), and loads more automatically via an `IntersectionObserver` sentinel as the user scrolls. `DataContext`'s "load every page up front" approach (from Round 1's FIX 10) is deliberately left in place for `SearchPage` (its fuzzy search needs the full dataset to rank by matching menu items — something a database query can't replicate) and "similar vendors" lookups. This is a documented scope boundary, not an inconsistency.

## ITEM A — Email verification | STATUS: Implemented

**Files:** `backend/src/models/User.model.ts`, `backend/src/services/auth.service.ts`, `backend/src/controllers/auth.controller.ts`, `backend/src/routes/auth.routes.ts`, `backend/src/utils/mailer.ts` (new), `frontend/src/components/EmailVerificationBanner.tsx` (new), `frontend/src/pages/VerifyEmailPage.tsx` (new), `frontend/src/services/authService.ts`

Registration now generates a hashed, 24-hour verification token and emails a link (via `nodemailer`, or logged to console if `SMTP_HOST` is unset — see MIGRATION-NOTES.md). Verification never blocks login or any action; it only shows a small dismissible banner with a resend option. `POST /auth/verify-email` and `POST /auth/resend-verification` are new endpoints.

## ITEM B — Password reset | STATUS: Implemented

**Files:** `backend/src/models/User.model.ts`, `backend/src/services/auth.service.ts`, `backend/src/controllers/auth.controller.ts`, `backend/src/routes/auth.routes.ts`, `frontend/src/pages/ForgotPasswordPage.tsx` (new), `frontend/src/pages/ResetPasswordPage.tsx` (new), `frontend/src/pages/LoginPage.tsx`

`POST /auth/forgot-password` always returns 200 regardless of whether the email exists (prevents account enumeration). Reset tokens are SHA-256 hashed at rest, expire in 1 hour, and are single-use. A successful reset bumps `refreshTokenVersion`, logging out every other active session for that account.

## ITEM C — PWA / offline support | STATUS: Implemented

**Files:** `frontend/vite.config.ts`, `frontend/src/components/OfflineBanner.tsx` (new), `frontend/src/components/Layout.tsx`

Added `vite-plugin-pwa`: generates a manifest (using the existing app icons) and a service worker on build. API GETs use a network-first caching strategy (24-hour fallback cache); images use cache-first (30-day, since ITEM E's Media documents are immutable). A small banner shows when `navigator.onLine` is false. Disabled in local dev to avoid stale-cache confusion.

## ITEM D — FSSAI / hygiene display | STATUS: Implemented

**Files:** `backend/src/models/Vendor.model.ts`, `backend/src/services/vendor.service.ts`, `frontend/src/types/index.ts`, `frontend/src/services/vendorService.ts`, `frontend/src/pages/VendorProfilePage.tsx`, `frontend/src/pages/VendorDashboardPage.tsx`, `frontend/src/pages/AdminDashboardPage.tsx`

Added `fssaiLicenseNumber` (owner-writable), `hygieneRating` and `hygieneVerified` (admin-only — enforced via the existing field-allowlist mechanism from Round 1's FIX 1, no new endpoint needed) to the Vendor model. Displayed on the public profile only when present. Admin dashboard gets a small modal to set/clear verification per vendor.

**Bug caught and fixed during this work:** the frontend's `normalizeVendor` function didn't map these new fields (or `approvalStatus`/`rejectionReason`) from the raw API response at all — they would have silently read as `undefined` everywhere despite the backend correctly returning them. Fixed before it could ship as a "works on the backend, invisible on the frontend" bug.

## ITEM E — Media collection for image storage | STATUS: Implemented

**Files:** `backend/src/models/Media.model.ts` (new), `backend/src/services/media.service.ts` (new), `backend/src/controllers/media.controller.ts` (new), `backend/src/routes/media.routes.ts` (new), `backend/src/scripts/migrateImagesToMedia.ts` (new), `backend/src/app.ts`, `frontend/src/services/mediaService.ts` (new), `frontend/src/components/ImageUploadField.tsx`

Images are now stored once in a dedicated `Media` collection and referenced everywhere else by a short, long-cached `/api/media/:id` URL, instead of being embedded as base64 directly in Vendor/MenuItem/User documents (Round 1's FIX 22 had flagged this as "recommended, implement last"). A one-time migration script moves any pre-existing base64 images into the new collection. Known, documented tradeoff: an image uploads immediately on file-pick, before the surrounding form saves, so an abandoned form leaves an orphaned (harmless, just unused) Media document — no cleanup job exists for this yet (see NEEDS-DECISION.md Decision 7).

## ITEM F — Vendor approval gate | STATUS: Implemented

**Files:** `backend/src/models/Vendor.model.ts`, `backend/src/services/vendor.service.ts`, `backend/src/controllers/admin.controller.ts`, `backend/src/routes/admin.routes.ts`, `backend/src/utils/seed.ts`, `frontend/src/pages/VendorDashboardPage.tsx`, `frontend/src/pages/AdminDashboardPage.tsx`, `frontend/src/services/adminService.ts`

Every new vendor listing is created with `approvalStatus: 'pending'`, forced server-side regardless of client input — even an admin using the same creation endpoint goes through the same gate. A pending or rejected listing is invisible to the public (404, not a "here it is but pending" leak) until an admin approves it. Admin dashboard gets a "Pending approval" tab with approve/reject-with-reason actions; the vendor's own dashboard shows a clear status banner explaining why their listing isn't public yet.

**Critical migration issue caught during this work:** a Mongoose schema default only applies to newly-created documents, never retroactively to existing ones. Deploying this against a database that already has vendors would silently hide every one of them from the public site (they'd have `approvalStatus: undefined`, and the public list filters to `'approved'` only). This is now a required, explicitly-flagged migration step in `MIGRATION-NOTES.md` — caught by reasoning through the change's implications, not by a test run (none could execute in this sandbox).

## Test suite changes summary

- `auth.test.ts`: fully rewritten for cookie/CSRF flow + new endpoints (ITEM A/B)
- `media.test.ts`: new, 5 tests (ITEM E)
- `vendor.test.ts`: +4 tests (ITEM F approval lifecycle + reject; ITEM D field permissions)
- `reward.test.ts`, `admin.test.ts`, `favorite.test.ts`, `foodTrail.test.ts`, `menu.test.ts`, `offer.test.ts`, `review.test.ts`, `security.test.ts`: one-line fix each (`approvalStatus: 'approved'` added to a direct `Vendor.create` call, to avoid a schema-default regression against the new approval gate)

None of these could be executed in this sandbox (see `TEST-REPORT.md` for the confirmed, re-verified reason). All pass `tsc --noEmit`.
