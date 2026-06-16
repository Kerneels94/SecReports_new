# Guard Account Removal & Auth Restructuring

## Overview

Removed guard user-account creation (guards no longer log in), added email-domain validation via DNS MX records, restricted `/auth/login` to owner/manager roles, updated login form labels, and removed usage limits on free/trial plans.

---

## Changes

### 1. Guard Account Removal

**Why:** Guards are assigned to sites but should not be able to log into the application. Previously each guard created a linked `User` record with email/password — this has been removed.

**What changed:**
- `backend/prisma/schema.prisma` — Removed `email`, `userId` fields from `Guard`; removed `user` relation from `Guard` and `guard` relation from `User`
- `backend/src/validators/guard.schema.ts` — Removed `email` and `password` from create/update schemas
- `backend/src/validators/guardingSite.schema.ts` — Removed `email` and `password` from inline guard schema
- `backend/src/services/guard.service.ts` — Stripped out user-account creation/sync/deletion, password hashing, email checks
- `backend/src/services/guardingSite.service.ts` — Stripped out user-account creation for bulk guard creation
- `backend/src/controllers/entryLog.controller.ts` — Removed guard-by-userId lookups (dead code)
- `backend/prisma/seed.ts` — Removed guard user accounts, email fields from guard records
- `frontend/src/services/index.ts` — Removed `password` from guard create payload type

---

### 2. Email Domain MX Validation

**Why:** Prevents registration with fake/non-deliverable email addresses (e.g. `example@gmail.com`) without maintaining a blocklist.

**What changed:**
- `backend/src/lib/email.ts` — New helper; performs DNS MX lookup on the email domain with 1-hour in-memory caching
- `backend/src/services/auth.service.ts` — MX check added to `register()`, `createUser()`, and `updateUser()`; throws `ValidationError("Email domain does not accept mail")` if no MX records exist
- `backend/src/services/auth.service.test.ts` — Added mock and tests for MX validation (`146 tests pass`)

---

### 3. Login Role Restriction

**Why:** Senior users should not access the admin/manager dashboard via `/auth/login`.

**What changed:**
- `backend/src/services/auth.service.ts` — `login()` now rejects users without `"owner"` or `"manager"` role (returns `"Invalid email or password"`)

---

### 4. Login Form Label Updates

**Why:** Tabs and button text now match actual roles more clearly.

**What changed:**
- `frontend/src/app/(auth)/login/page.tsx` — Tab: `"Company"` → `"Owner/Manager"`, `"Employee"` → `"Senior"`; Button: `"Sign In as Company"` → `"Sign In as Admin/Manager"`, `"Sign In as Employee"` → `"Sign In as Senior"`
- `frontend/src/app/(auth)/login/LoginPage.test.tsx` — Updated assertions to match new labels; fixed mock returning `undefined` for user object

---

### 5. Free/Trial Plan Limit Removal

**Why:** Companies on the free plan or trial should have unrestricted access to all functionality so they can fully evaluate the application.

**What changed:**
- `backend/src/services/subscription.service.ts` — `canAddUser()` and `canAddSite()` now return early (no limit) when `plan.price === 0`; only paid plans enforce their configured limits

---

## Files Changed

| File | Action |
|------|--------|
| `backend/prisma/schema.prisma` | Modified |
| `backend/prisma/seed.ts` | Modified |
| `backend/src/lib/email.ts` | **Added** |
| `backend/src/services/auth.service.ts` | Modified |
| `backend/src/services/auth.service.test.ts` | Modified |
| `backend/src/services/guard.service.ts` | Modified |
| `backend/src/services/guardingSite.service.ts` | Modified |
| `backend/src/services/subscription.service.ts` | Modified |
| `backend/src/validators/guard.schema.ts` | Modified |
| `backend/src/validators/guardingSite.schema.ts` | Modified |
| `backend/src/controllers/auth.controller.ts` | Modified |
| `backend/src/controllers/entryLog.controller.ts` | Modified |
| `frontend/src/app/(auth)/login/page.tsx` | Modified |
| `frontend/src/app/(auth)/login/LoginPage.test.tsx` | Modified |

---

## Regression Tests

All existing tests pass. New tests added:
- `auth.service.test.ts` — 3 new tests verifying MX validation throws for `register()`, `createUser()`, and `updateUser()` when the email domain has no MX records
- `LoginPage.test.tsx` — Fixed mock to return a valid user object; updated label assertions

**Test results:** `13 suites, 146 tests — all passing` (backend) / `1 suite, 10 tests — all passing` (frontend login)
