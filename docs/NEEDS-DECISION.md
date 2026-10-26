# NEEDS-DECISION.md

## Resolved this round

The three decisions from the previous round have been implemented as
directed. See `MIGRATION-NOTES.md` for full implementation details of
each:

1. **Access token storage → Option 3 (full httpOnly cookie scheme).** Implemented with CSRF double-submit protection.
2. **react-router-dom → Option 2 (upgrade to v7).** Done — no code changes needed, fully backward compatible for this codebase's usage.
3. **Vendor pagination → Option 2 (server-side pagination + infinite scroll).** Implemented for the Explore page; Search and "similar vendors" deliberately kept on the full-list approach (see MIGRATION-NOTES.md DECISION 3 for why).

The six previously-"intentionally not implemented" items (email
verification, password reset, PWA/offline, FSSAI/hygiene display, a
Media collection for image storage, and a vendor approval gate) have
also all been implemented — see `MIGRATION-NOTES.md` for each.

## New decisions surfaced by this round

### Decision 4 — SMTP provider for real email delivery

**Issue:** Email verification and password reset are fully implemented and testable, but with no `SMTP_HOST` configured, emails are only logged to the backend console — nothing is actually delivered to real inboxes.

**This isn't something I can decide for you:** it requires an account with a real email provider (SendGrid, Mailgun, AWS SES, Postmark, or your own SMTP server) and its credentials.

**What's needed:** pick a provider, get its SMTP host/port/username/password, and set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` in `backend/.env`. No code changes required — the mailer already supports standard SMTP.

---

### Decision 5 — Should email verification ever be enforced?

**Issue:** Verification currently only shows a dismissible banner; it never blocks any action. An unverified account can do everything a verified one can.

**Options:**
1. **Keep it advisory-only (current behavior).** Simplest; no risk of locking out legitimate users if email delivery has a problem.
2. **Gate specific actions** (e.g., require verification before creating a vendor listing, or before an offer/review counts toward reward points) — reduces fake-account abuse but adds a hard dependency on email delivery working correctly.
3. **Require verification for login entirely** — strongest anti-abuse stance, highest risk if SMTP ever has an outage (could lock out real users).

**Decision needed:** stay advisory-only, or pick a specific gate? If gating, which actions?

---

### Decision 6 — Media storage: local MongoDB documents vs. object storage

**Issue:** ITEM E stores uploaded images as `Buffer` fields inside MongoDB documents. This works and is simple, but every image inflates your MongoDB storage/backup size, and MongoDB isn't really designed as a blob store at scale.

**Options:**
1. **Keep MongoDB storage (current).** Fine at this project's current scale (a few hundred vendors/menu items/avatars). No extra infrastructure needed.
2. **Move to object storage** (S3, Cloudflare R2, Google Cloud Storage, etc.) — `Media.data` becomes a stored object key instead of the bytes themselves, `GET /api/media/:id` redirects or proxies to the object store. Better at scale, adds a cloud storage dependency and its own credentials/cost.

**Decision needed:** only relevant once image volume becomes large enough that MongoDB storage/backup cost becomes a real concern — not urgent now.

---

### Decision 7 — Orphaned Media documents cleanup

**Issue:** An image is uploaded to `/api/media` as soon as the user picks a file in the upload widget, before the surrounding form is saved. Abandoning the form leaves an orphaned, unreferenced `Media` document behind. There's no cleanup job.

**Options:**
1. **Do nothing.** At this project's scale, a handful of orphaned images cost nothing meaningful.
2. **Add a periodic sweep job** that deletes `Media` documents with no matching reference across `Vendor.image`/`logo`, `MenuItem.image`, and `User.avatar`.

**Decision needed:** only worth doing once upload volume is high enough to matter — flagged for awareness, not urgent.

---

### Decision 8 — A dedicated API-token endpoint for non-browser clients

**Issue:** With auth tokens now cookie-based (DECISION 1), there's no clean way for a mobile app or third-party integration to authenticate — they can't use browser cookies, and there's no endpoint that issues a plain Bearer token.

**Options:**
1. **Do nothing** until you actually need a non-browser client.
2. **Add a dedicated endpoint** (e.g. `POST /auth/api-token`) that issues a long-lived Bearer token for programmatic use, separate from the cookie-based browser flow.

**Decision needed:** only relevant if/when a mobile app or external integration is actually planned.

## Database migration that must be run before deploy

Two required steps now (see `MIGRATION-NOTES.md` for full detail on each):

```js
// 1. Offer code index (from the original fix pass)
db.offers.dropIndex('vendor_1_code_1');

// 2. Vendor approval backfill (from this round — CRITICAL, see
//    MIGRATION-NOTES.md for why existing vendors will otherwise
//    silently disappear from the public site)
db.vendors.updateMany(
  { approvalStatus: { $exists: false } },
  { $set: { approvalStatus: 'approved' } }
);
```

## Items still not implemented (genuinely out of scope)

- **CI/CD pipeline** — not requested, not added.
- **A garbage-collection job for orphaned Media documents** — see Decision 7 above.
- **Real FSSAI registry integration** — ITEM D is display/verification-tracking infrastructure only; there's no automated way to confirm a license number against India's actual FSSAI database from this codebase.
- **CAPTCHA on register/login** — not requested.
- **Vite 7 upgrade** — would resolve the last 2 dev-only dependency vulnerabilities, but is a separate breaking change from what was asked (react-router only). Flagged in SECURITY-AUDIT.md and MIGRATION-NOTES.md.
