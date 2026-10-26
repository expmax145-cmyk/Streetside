# SECURITY-AUDIT.md — StreetSide Security Review

## Areas reviewed

Authentication, authorization, role-based access control, privilege escalation, input validation, output handling, injection risks, session/token handling, rate limiting, error handling, security headers, file upload security, dependency vulnerabilities, client-side trust issues.

## Vulnerabilities discovered and fixed

| # | Vulnerability | Severity | Fixed |
|---|---|---|---|
| 1 | Mass assignment — owners could set `rating`, `isActive`, `owner` via API | HIGH | ✅ Yes |
| 2 | Offer/menu re-parenting — `vendor` field accepted in update body | HIGH | ✅ Yes |
| 3 | `vendorId` accepted on public registration | MEDIUM | ✅ Yes |
| 4 | Suspended user's access token valid for up to 15 min after suspension | HIGH | ✅ Yes |
| 4b | Admin could suspend themselves or the last admin | HIGH | ✅ Yes |
| 5 | Vendor soft-delete left stale `user.vendor` reference | MEDIUM | ✅ Yes |
| 6 | Vendor owner could review their own listing | MEDIUM | ✅ Yes |
| 6b | No duplicate report prevention | LOW | ✅ Yes |
| 7 | Malformed JSON / oversized body / CORS rejection all returned 500 | HIGH | ✅ Yes |
| 9 | Rate limiter keyed to shared proxy IP | HIGH | ✅ Yes |
| 9b | Failed login triggered an extra `/auth/refresh` call | MEDIUM | ✅ Yes |
| 20 | Points farming via unfavorite/refavorite, delete/re-review | HIGH | ✅ Yes |
| 22 | No server-side avatar size validation | MEDIUM | ✅ Yes |

## Security controls confirmed in place (pre-existing)

- `helmet()` — security headers (CSP, HSTS, X-Frame-Options, etc.)
- `cors` with explicit allowlist of origins
- `express-mongo-sanitize` — blocks MongoDB operator injection
- `bcryptjs` — password hashing at configurable cost rounds
- JWT access token (short-lived 15 min) + httpOnly refresh cookie (7 days)
- Refresh token versioning — logout invalidates all outstanding refresh tokens
- `express-validator` — input validation on all public routes
- Mongo schema `enum`, `maxlength`, `min/max` validators

## Security controls added by this fix pass

- DB role/status verification on every authenticated request (`authenticate` middleware)
- Write limiter (30/min, keyed by user id) on mutation routes
- General API limiter (300/min/IP) on all routes
- `TRUST_PROXY` environment variable (default 0)
- Explicit field allowlists on vendor, offer, and menu update paths
- Partial unique index on offer codes (active only)
- Idempotent reward awards — partial unique index on `(user, action, target)`
- Admin audit log for sensitive actions
- `refreshTokenVersion` bump on suspend
- Self-suspend and last-admin-suspend blocked
- Report target-existence verification and duplicate detection
- GIF upload size limit (500 KB) with clear rejection message
- Iterative compression enforces ≤ 350 KB final output
- Base64 avatar > 900 KB rejected at both validation layer and service layer
- Review list strips oversized avatars (> 20 KB returns null)

## Security controls added by the decisions + deferred-items round

- **DECISION 1 — access token moved out of localStorage entirely**, into a second httpOnly cookie (`streetside_access_token`). No longer readable by JS at all, closing the XSS-can-steal-the-token gap listed below as a "remaining limitation" in the previous round. See MIGRATION-NOTES.md for the full design.
- **CSRF protection (double-submit cookie)** — new for any request now authenticated via the cookie (see `backend/src/middleware/csrf.middleware.ts`). Scoped correctly to cookie-authenticated requests only; `Bearer`-header requests (API clients, this project's test suite) are exempt because they were never vulnerable to CSRF in the first place.
- **Password reset invalidates all existing sessions** — `refreshTokenVersion` is bumped on every successful reset, so a compromised account's other active sessions are logged out the moment the legitimate owner resets their password.
- **Password reset tokens are single-use and time-boxed** — SHA-256 hashed at rest (the raw token only ever exists in the emailed link and briefly in memory), 1-hour expiry, cleared after use.
- **Email verification tokens** follow the same hash-at-rest, time-boxed pattern (24-hour expiry).
- **Account enumeration prevention** — `/auth/forgot-password` always returns 200 regardless of whether the email exists.
- **Vendor approval gate** — a newly registered vendor listing is invisible to the public (and returns a plain 404, not a "this exists but is pending" response, to anyone but its owner or an admin) until an admin approves it. Closes the "any listing goes live instantly with zero review" gap.
- **Media upload validation** — the `/api/media` endpoint re-validates the decoded image's mime type and enforces a 2 MB ceiling server-side, independent of whatever the client-side compression already did (defense in depth against a client that skips or tampers with the compression step).

## Remaining security limitations

- **No email verification enforcement** — email verification (ITEM A) now exists, but is advisory only (a dismissible banner); it does not gate any action. This was a deliberate choice, not an oversight — the alternative (blocking unverified users from using the site) would need product input on which actions to gate, and risks locking out legitimate users if SMTP delivery has issues. Revisit if abuse from unverified accounts becomes a real problem.
- **No CAPTCHA** — rate limiter is the only bot protection on register/login.
- **No CSP nonce on inline scripts** — Helmet sets a broad CSP; tightening requires build tooling changes.
- **No penetration test** has been performed beyond this code review.
- **FSSAI / hygiene data (ITEM D)** — display infrastructure now exists, but no real FSSAI license verification happens automatically; an admin manually marking a vendor "hygiene verified" is trusting their own offline judgment, not validating against any government registry. This is inherent to the feature (StreetSide has no integration with FSSAI's systems), not a bug.
- **Media collection has no per-user storage quota** — a malicious authenticated user could upload many 2 MB images to run up storage costs. The write limiter (30 writes/min) bounds the rate but not the total; a dedicated per-user quota was out of scope for this pass.
- **Orphaned Media documents** — see MIGRATION-NOTES.md ITEM E. Not a security issue (no data leak — Media documents require the resulting URL to retrieve, and are never listed), but worth knowing about for storage-cost planning.
- **react-router-dom open-redirect** — RESOLVED. Upgraded to v7 (DECISION 2).
- **vite/esbuild dev-server vulnerability** — still open; the patch requires a Vite 7 major upgrade, deferred (see MIGRATION-NOTES.md DECISION 2). Dev-server-only impact, not present in a production build.

## Never-exposed

- Real secrets are not present in any committed file.
- Passwords are always stored as bcrypt hashes.
- Stack traces are suppressed in production (`isProduction` check in `errorHandler`).
