# Auth Security Improvements

## Overview

A set of security enhancements addressing identified vulnerabilities in the authentication system. All changes are implemented in the `development` branch.

---

## Changes

### 1. Refresh Token Rotation

**Files:**
- `backend/prisma/schema.prisma` — Added `RefreshToken` model
- `backend/src/services/auth.service.ts` — Rotation logic in `refresh()`

**How it works:**
- On login/register, a random 64-byte refresh token is generated and its SHA-256 hash stored in the `refresh_tokens` collection alongside a `familyId`.
- On `/auth/refresh`, the presented token is hashed and looked up. If found, the record is **deleted** and a new token (same `familyId`) is created.
- If the token hash is **not found** (reuse detected — attacker stole it), the entire family is deleted, forcing the legitimate user to re-login on all devices.
- On password reset or password change, **all** refresh tokens for that user are deleted.

**Threat mitigated:** Stolen refresh token cannot be used indefinitely. Rotation limits the window of compromise.

---

### 2. Account Lockout

**Files:**
- `backend/prisma/schema.prisma` — Added `loginAttempts` and `lockedUntil` fields to `User`
- `backend/src/services/auth.service.ts` — Lockout logic in `login()` and `employeeLogin()`

**How it works:**
- Each failed login increments `loginAttempts`.
- After **3 consecutive failures**, `lockedUntil` is set to `now + 15 minutes`.
- Subsequent attempts during lockout return `"Account locked. Try again in N minute(s)."`.
- A successful login resets `loginAttempts` to `0` and clears `lockedUntil`.

**Threat mitigated:** Brute-force and credential stuffing attacks are slowed to 3 attempts per 15 minutes per account.

---

### 3. JWT Secret Startup Guard

**Files:**
- `backend/src/lib/jwt.ts` — Removed `|| "dev-secret"` fallback
- `backend/src/server.ts` — Added startup validation

**How it works:**
- The server now **refuses to start** if `JWT_SECRET` or `JWT_REFRESH_SECRET` are not set:
  ```
  FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be set in environment
  ```
- No hardcoded fallback secrets exist. An attacker cannot forge tokens with a known `"dev-secret"`.

**Threat mitigated:** Prevents accidental production deployment with weak/known JWT signing keys.

---

### 4. Consistent Authorization (Route-Level)

**Files:**
- `backend/src/routes/auth.routes.ts` — Added `requireRole("owner")` to user CRUD routes
- `backend/src/controllers/auth.controller.ts` — Removed inline `request.user!.role !== "owner"` checks

**How it works:**
- All owner-only routes (`createUser`, `listUsers`, `getUserById`, `updateUser`) now use `requireRole("owner")` as a `preHandler` in the route definition — the same pattern used by `invoice.routes.ts` for `requireRole("superadmin")`.
- Controllers no longer perform ad-hoc role checks, eliminating the risk of a developer forgetting one.

**Threat mitigated:** Eliminates inconsistent authorization — privilege escalation bugs from missed inline checks are no longer possible.

---

### 5. Session Management (Logout & Listing)

**Files:**
- `backend/src/services/auth.service.ts` — Added `logout()`, `logoutAll()`, `listSessions()`
- `backend/src/controllers/auth.controller.ts` — Added `logout`, `logoutAll`, `listSessions` handlers
- `backend/src/routes/auth.routes.ts` — Added `/auth/logout`, `/auth/logout-all`, `/auth/sessions`

**Endpoints:**

| Method | Path              | Auth   | Description                          |
| ------ | ----------------- | ------ | ------------------------------------ |
| POST   | `/auth/logout`    | Bearer | Delete a specific refresh token      |
| POST   | `/auth/logout-all`| Bearer | Delete all refresh tokens (all sessions) |
| GET    | `/auth/sessions`  | Bearer | List active sessions with timestamps |

**Threat mitigated:** Users and admins can revoke individual sessions or all sessions, useful after a device is lost or compromised.

---

### 6. Schema Changes

**New model — `RefreshToken`:**
```
refresh_tokens
├── _id            ObjectId
├── user_id        ObjectId  (indexed)
├── token_hash     String    (unique)
├── device_info    String?   (for future use)
├── family_id      String    (indexed)
├── expires_at     DateTime  (7 days from creation)
└── created_at     DateTime
```

**Updated model — `User`:**
```
login_attempts     Int       @default(0)
locked_until       DateTime?
```

---

## Files Changed

| File | Action |
|------|--------|
| `backend/prisma/schema.prisma` | Modified |
| `backend/src/server.ts` | Modified |
| `backend/src/lib/jwt.ts` | Modified |
| `backend/src/services/auth.service.ts` | Modified |
| `backend/src/controllers/auth.controller.ts` | Modified |
| `backend/src/routes/auth.routes.ts` | Modified |
| `backend/src/validators/auth.schema.ts` | Modified |
| `backend/src/controllers/auth.controller.test.ts` | Modified |
| `backend/src/services/auth.service.test.ts` | Modified |
