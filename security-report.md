# Security Audit — OWASP Top 10 2026

**Target:** Incident Report System (`SecReportsNew`)
**Branch:** `staging` vs `main`
**Date:** 2026-10-12
**Auditor:** security-audit-agent
**Source of truth:** `README/memory.md` (golden rules — non-negotiable)

## Scope

`git diff main...staging` — 23 commits, 40 changed files. Reviewed files
(non-test, non-generated, non-lockfile code was read in full; lockfiles checked
for supply-chain changes):

**Backend:** `app.ts`, `controllers/{auth,auditLog,invoice,export}.controller.ts`,
`services/{auth,auditLog,incident}.service.ts`, `templates/{layout,contact,invoice}.ts`,
`validators/invoice.schema.ts`, `prisma/seed.ts`, `package-lock.json`.
**Frontend:** `netlify.toml`, `next.config.ts`, `package-lock.json`, and the changed
`app/**/page.tsx` + `components/header/Header.tsx`.
Context read for reachability: `routes/*.ts`, `middleware/{requireRole,requirePermission}.ts`,
`lib/{jwt,permissions,app-url}.ts`, `templates/{report,new-company,escape}.ts`,
`services/invoice.service.ts`, `validators/auth.schema.ts`.

Not in scope (unchanged vs `main`): all `development...staging`-only files
(e.g. `plugins`, apiKey/guard/patrol modules, `email.service.ts`, `new-company.ts`).

## Method

Every changed file was read end to end, then cross-checked against the 14 audit
sections and golden rules in `README/memory.md`. Findings below are verified against
the actual source, not assumed.

---

## Findings

## [1] [MEDIUM] Inconsistent audit logging on incident data egress

**File:** `backend/src/controllers/export.controller.ts:470, 550, 628` (vs audit at `:537`)
**Status:** FAIL
**Details:** The change added `AuditLogService.create(...)` to `responseTimePdf()` with the
comment "Data egress: a report leaving the system is worth an audit trail", but `csv()`,
`pdf()` and `yearlyPdf()` — which export the full incident set as CSV/PDF — create no audit
entry. Same data class, inconsistent trail.
**Fix:** Add an `await AuditLogService.create({ action: "report_*_exported", ... })` call to
`csv()`, `pdf()` and `yearlyPdf()` mirroring `responseTimePdf()`.
**Tests:** `cd backend && npx jest export.controller`

## [2] [MEDIUM] `deleteUser` lacks service-layer authorization (defense in depth)

**File:** `backend/src/services/auth.service.ts:832`
**Status:** FAIL
**Details:** Golden rule #19 requires the service layer to re-verify authorization, not rely
on the controller/route. `updateUser()` was hardened this change (admin-only role/email
checks), but `deleteUser(companyId, userId, performedBy)` only blocks self-deletion. A
non-admin granted `users.manage` via a company permission override could delete other users.
**Fix:** Pass the actor's role into `deleteUser` and reject unless `actorRole === "admin"`,
matching `updateUser`.
**Tests:** `cd backend && npx jest auth.service`

## [3] [LOW] Ad-hoc body validation instead of Zod on new/adjacent endpoints

**File:** `backend/src/controllers/export.controller.ts:661-676, 776`; `backend/src/controllers/auth.controller.ts:78`
**Status:** OPEN
**Details:** `batchEmail`/`email` validate `email`/`type`/`format` with inline regex and `as`
casts rather than a Zod schema (golden rule §5 / memory "Input is validated at the boundary").
`email()` never validates `incidentId`; if omitted, Prisma drops the `id` filter and an
arbitrary in-company incident is emailed. `verifyEmail` destructures `request.body as {token}`
with no schema.
**Fix:** Add Zod schemas for these bodies (email, enum `format`, required `incidentId`), as was
just done for `createInvoice`.
**Tests:** `cd backend && npx jest invoice.schema`

## [4] [LOW] `any` type escapes (golden rule #33)

**File:** `backend/src/controllers/export.controller.ts:632`; `frontend/src/app/(admin)/portal/companies/detail/page.tsx:18`
**Status:** OPEN
**Details:** `const where: any = { companyId: ... }` in `pdf()`, and `useState<any>` /
`map((u: any) => ...)` in the company detail page. Rule #33 forbids `any` casts that collapse
type safety. (Note: this change *removed* `any` in `app.ts`, `auditLog.service.ts` and
`incident.service.ts` — these two remain.)
**Fix:** Type `where` as `Prisma.IncidentWhereInput`; type the company/user state shapes.
**Tests:** `cd backend && npx jest export.controller`

## [5] [LOW] Login timing side-channel for locked/unverified accounts

**File:** `backend/src/services/auth.service.ts:211-215`
**Status:** OPEN
**Details:** The unknown-email path deliberately runs `comparePassword()` against
`DUMMY_BCRYPT_HASH` to equalize timing, but `authDenied(user)` (unverified or locked) throws
`throwGenericAuthError()` *before* any bcrypt work. Response time therefore differs between
"account exists but unverified/locked" and "no account", a residual enumeration channel
(A10). Message text is correctly generic (golden rule #2).
**Fix:** Run the dummy `comparePassword()` before the `authDenied` throw so every failure path
costs one bcrypt round. Lockout ordering itself is correct (checked before real compare).
**Tests:** `cd backend && npx jest auth.service`

## [6] [INFO] Netlify build secret-scanning disabled

**File:** `frontend/netlify.toml:5`
**Status:** OPEN (pre-existing line; file changed this branch)
**Details:** `SECRETS_SCAN_ENABLED = "false"` turns off Netlify's build-time secret scanner.
Considered supply-chain / misconfiguration hygiene (A02/A03).
**Fix:** Re-enable the scan unless a documented false positive forces otherwise.

## [7] [INFO] `SameSite=Strict` cookie vs cross-site deployment

**File:** `backend/src/controllers/auth.controller.ts:23`
**Status:** PASS (secure posture) — verify deployment
**Details:** The cookie changed `none → strict`, which satisfies golden rule #28 and closes
CSRF on `/auth/refresh` + `/auth/logout`. The removed test comment warned that if the static
frontend (Netlify) and API live on different registrable sites, a `Strict` cookie is not sent
cross-site and refresh/logout will fail. Security-wise correct; confirm the frontend/API are
same-site or a reverse proxy fronts them.
**Tests:** `cd backend && npx jest auth.controller`

---

## Out-of-scope / pre-existing (not counted toward this branch)

These files are identical to `main` (outside `main...staging`) but are directly reachable from
changed code, so they are flagged as follow-ups, not this audit's result.

## [X] [HIGH] HTML injection in `new-company` notification email (pre-existing)

**File:** `backend/src/templates/new-company.ts:16-19`
**Details:** `detailCard([])` does **not** escape `row.value`, and this template passes
`companyName` / `adminName` / `adminEmail` straight from the public `register()` payload
(`auth.service.ts:455`). `contact.ts` and `report.ts` correctly wrap values in `escapeHtml()`;
this one does not — a direct violation of golden rule #25 (`companyName`, `name`).
**Fix:** Wrap each value in `escapeHtml(...)` before passing to `detailCard`. Consider escaping
inside `detailCard`/`greeting` by default to remove the footgun for all callers.

---

## OWASP Top 10 2026 Coverage

| OWASP 2026 | Category | Result | Notes |
| ---------- | -------- | ------ | ----- |
| A01 | Broken Access Control | PASS | All invoice routes `superadmin`-only; exports/incidents scope by `companyId`; `updateUser` email/role gate added. Finding #2 (service-layer depth). |
| A02 | Security Misconfiguration | PASS | `SameSite=Strict`, `secure`, `httpOnly`; CORS allowlist; helmet CSP `default-src 'self'`. Finding #6 (secrets scan off). |
| A03 | Software Supply Chain | PASS | `handlebars` bumped 4.7.9→4.7.10 (exists on npm, verified); lockfiles committed; no new deps, no postinstall scripts. |
| A04 | Cryptographic Failures | PASS | Refresh tokens signed JWTs (jti/aud/iss) + hashed in DB; `randomBytes(32)` verification/reset tokens; bcrypt via env. |
| A05 | Injection | PASS* | CSV formula-injection sanitized; contact/invoice templates escaped; no raw SQL. Findings #3, and out-of-scope #X. |
| A06 | Insecure Design | PASS | Lockout backoff, trial gates, unverified-forgotPassword blocked; reset/change clear refresh cookie. |
| A07 | Authentication Failures | PASS | Generic auth errors, dummy-hash timing guard, server-side logout, refresh reuse invalidation by `userId`, token stripped from body. Finding #5 (timing). |
| A08 | Software/Data Integrity | PASS | Zod enum for role; `any` removed in app/auditLog/incident services. Finding #4. |
| A09 | Logging & Alerting | FAIL | Finding #1 — inconsistent export audit. |
| A10 | Exceptional Conditions | PASS | `AppError` mapping, validation→400, generic 500 (no stack traces), fail-closed auth. |

## Summary

- **CRITICAL:** 0 findings
- **HIGH:** 0 findings (changed files) — 1 pre-existing, out-of-scope (see #X)
- **MEDIUM:** 2 findings
- **LOW:** 3 findings
- **INFO:** 2 findings
- **Overall: PASS** (no CRITICAL/HIGH in changed files)

The `staging` diff is overwhelmingly security-positive: it removes `any` casts, adds Zod
validation to invoice creation, tightens the refresh cookie to `SameSite=Strict`, gates
other-user email changes to admins, stops logging the super-admin password, and bumps a
vulnerable transitive dependency. The two MEDIUM items are consistency/defense-in-depth gaps,
not exploitable bypasses. The out-of-scope `new-company.ts` injection is the single item worth
scheduling promptly.
