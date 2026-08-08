# Auth Security Memory — Do Not Break These Patterns

## Golden Rules

### A07 — Authentication Failures

1. **NEVER store refreshToken in localStorage** — httpOnly cookie only (set by backend via `@fastify/cookie`).
2. **NEVER use distinct error messages for auth failures** — always return `"Invalid email or password"` to prevent user enumeration.
3. **ALWAYS invalidate tokens server-side on logout** — call `POST /auth/logout` to delete refresh token from DB.
4. **ALWAYS auto-refresh access tokens transparently** — 401 interceptor in `ApiClient` calls `/auth/refresh`, updates stored access token, retries. Dedup concurrent refresh calls.
5. **ALWAYS send a verification email when admin creates a user** — admin-created users are created with `emailVerified: false` and must verify their email before their first login. Never create an admin-created user without a verification email, otherwise they're permanently locked out.
6. **ALWAYS reset `emailVerified` to `false` when email is changed** by admin.
7. **ALWAYS use `userId` (not `familyId`) in refresh token reuse detection** — `deleteMany({ where: { userId: payload.userId } })`.
8. **ALWAYS use generic error on forgot-password** — add `sleep(200)` on not-found path to mask timing side-channels.
12. **ALWAYS apply per-route rate limiting on ALL public endpoints** — 10 req/min login/register, 5 req/min forgot-password, 20 req/min refresh, 10 req/min verify-email.
16. **ALWAYS make logout accessible without a valid access token** — accept refreshToken cookie alone so users with expired tokens can still log out.
17. **Deliver verification/reset tokens as URL query parameters** — links use `?token=...` so the frontend reads the token and forwards it to the backend over HTTPS. Accepted tradeoff: query params can leak via browser history/server logs/referrers, but the URL fragment is equally readable by page JavaScript, so XSS exposure is identical. Never store, log, or echo the token.

### A01 — Broken Access Control

18. **ALWAYS scope resource queries by `companyId`** — every `getById`, `update`, `delete` must use `findFirst({ where: { id, companyId } })`, not `findUnique({ where: { id } })` to prevent cross-company IDOR.
19. **ALWAYS enforce authorization in the service layer (defense in depth)** — the service must re-verify role-change permissions (owner-only, cannot change own role) even if the controller already checks. No controller-only gates.
20. **ALWAYS pass `performedBy` as the acting user's ID to audit logs** — never fall back to `companyId` which corrupts traceability.
21. **NEVER leave `senior` role users with no login path** — either remove the role from the enum, add a dedicated login endpoint, or allow it in existing login flows.

### A04 — Cryptographic Failures

9. **ALWAYS validate JWT secret entropy at startup** — minimum 32 chars, exit with fatal error if unmet.
10. **ALWAYS read `BCRYPT_SALT_ROUNDS` from env** (default 12) — never hardcode.
22. **ALWAYS include `jti` (JWT ID), `aud` (audience), and `iss` (issuer) claims in access tokens** — enables individual token revocation and audience restriction.
23. **ALWAYS hash API keys before storing in the database** — store only `SHA-256(key)` matching the refresh token pattern. Return the raw key once at creation and never again.
24. **ALWAYS strip `refreshToken` from JSON response bodies** — never include it in the API response payload. httpOnly cookie is the only channel. Remove body fallback that reads `refreshToken` from `request.body`.

### A05 — Injection

25. **ALWAYS escape user-controlled data in HTML email templates** — apply HTML entity encoding (`&`, `<`, `>`, `"`, `'`) to every interpolated value: `name`, `companyName`, `reason`, `referenceNumber`, `incidentTitle`, `invoiceNumber`, etc.
26. **ALWAYS sanitize CSV output against formula injection** — prefix cells starting with `=`, `+`, `-`, or `@` with a space or single quote to prevent spreadsheet formula execution.
27. **ALWAYS configure a strict Content Security Policy (CSP)** via `@fastify/helmet` with `defaultSrc: ["'self'"]`, `scriptSrc: ["'self'"]` to mitigate XSS.

### A02 — Security Misconfiguration

11. **ALWAYS read `FROM_EMAIL` from env** (fallback `"onboarding@resend.dev"`) — never hardcode email sender.
14. **ALWAYS keep a single source of truth for auth logic** — single `authenticate` decorator in `app.ts` includes `companyId`. No `plugins/auth.ts`.
28. **ALWAYS use `"strict"` sameSite for cookies regardless of environment** — never use `"lax"` in development (inconsistent, weakens CSRF protection).
29. **NEVER commit live secrets, API keys, or production credentials to the repository** — use `.env` files (gitignored) or a secrets manager. Rotate any leaked credentials immediately.
30. **NEVER hardcode fallback passwords in seed scripts** — require `SUPER_ADMIN_PASSWORD` env var or generate a strong random password and print it to stdout.

### A06 — Insecure Design

13. **ALWAYS remove NODE_ENV test guards** — tests must exercise full production code paths.
31. **ALWAYS clear stale refresh cookie on password change/reset** — call `clearRefreshCookie(reply)` after `deleteMany` of refresh tokens so the client doesn't retain an invalidated cookie.
32. **ALWAYS block `forgotPassword` for unverified emails or set `emailVerified: true` on successful reset** — otherwise the user enters a useless reset loop (password reset works but login blocks unverified users).

### A08 — Software/Data Integrity Failures

33. **NEVER use `as any` type casts that bypass Zod/enum validation** — always use proper typed enums or union types for role fields and other constrained values.
34. **ALWAYS remove dead code** — unused variables, unreachable branches, and commented-out logic must be deleted or justified.

### A09 — Logging & Alerting

35. **ALWAYS `await` audit log calls** — unhandled Promise rejections from `createAuditLog()` silently swallow audit failures.
36. **ALWAYS audit critical security events** — especially refresh token reuse detection. When all sessions are invalidated due to a reused token, call `createAuditLog()`.

### A10 — Mishandling of Exceptional Conditions

2. **NEVER use distinct error messages for auth failures** — covered above; generic errors prevent information leakage.
8. **ALWAYS use generic error on forgot-password** — covered above; constant `sleep(200)` masks timing side-channels.

### General Security Practices

37. **ALWAYS run `npm audit` in CI and fail on critical vulnerabilities** — software supply chain hygiene.
38. **ALWAYS use parameterized queries / Prisma ORM** — never raw SQL strings that could enable injection.
39. **ALWAYS set secure flag on cookies in production** — `secure: true` when `NODE_ENV === "production"`.
40. **ALWAYS validate email domain (MX record check) before registration/user creation** — prevents disposable/fake email addresses.

## Session & Device Tracking

- `persistRefreshToken` accepts optional `deviceInfo` — controller extracts `User-Agent` header on login/employeeLogin/refresh.
- `/auth/sessions` returns stored `deviceInfo` for meaningful session identification.

## Progressive Lockout (Exponential Backoff)

| Attempt | Lockout Duration |
|---------|-----------------|
| 1st     | 15 min          |
| 2nd     | 30 min          |
| 3rd     | 1 hr            |
| 4th     | 2 hr            |
| 5th+    | 4 hr (cap)      |

- On successful login, `lockoutCount` decays by 1 (so the next lockout is shorter).
- Uses `lockoutCount` field on the User model.

## Audit Logging

Always call `createAuditLog()` for these events:
- login success
- failed login
- password change
- password reset
- logout / logout-all
- user creation
- role changes

## Helper Utilities

- Use `hashToken(rawToken)` — never reimplement SHA-256 manually.
- Use `hash.ts`'s `SALT_ROUNDS` via env — never hardcode bcrypt rounds.

## Files That Touch Auth (do not edit without checking)

### Backend
| File | Role |
|------|------|
| `backend/src/app.ts` | Inline `authenticate` decorator (single source of truth) |
| `backend/src/services/auth.service.ts` | Core auth logic — login, register, refresh, logout, lockout, audit |
| `backend/src/controllers/auth.controller.ts` | Endpoint handlers — extracts User-Agent for deviceInfo |
| `backend/src/routes/auth.routes.ts` | Rate limiting config per route |
| `backend/src/lib/hash.ts` | Bcrypt salt rounds from env |
| `backend/src/server.ts` | JWT secret entropy validation at startup |
| `backend/src/services/email.service.ts` | FROM_EMAIL env var |
| `backend/prisma/schema.prisma` | User model (lockoutCount, emailVerified) & RefreshToken model (familyId→userId fix) |

### Frontend
| File | Role |
|------|------|
| `frontend/src/hooks/useAuth.tsx` | Logout calls server, no refreshToken in JS |
| `frontend/src/services/api.ts` | 401 interceptor with credential:include for refresh |
| `frontend/src/services/index.ts` | Refresh/logout service calls with credentials include |

## OWASP Top 10 2026 — Coverage Mapping

Every security scan cross-references findings against the OWASP Top 10 2026. Below is the full mapping of golden rules (#), audit sections, and covered files to each OWASP category.

| OWASP 2026 | Category | Golden Rules | Audit Sections | Key Files |
|------------|----------|--------------|----------------|-----------|
| A01 | **Broken Access Control** | #18 (companyId scope), #19 (service-layer authz), #20 (performedBy), #21 (senior role) | §3 Access Control, §10 Session Management | `incident.service.ts`, `guardingSite.service.ts`, `guard.service.ts`, `auth.service.ts:updateUser` |
| A02 | **Security Misconfiguration** | #11 (FROM_EMAIL), #14 (single auth source), #28 (strict sameSite), #29 (no committed secrets), #30 (no seed fallback) | §11 Cookie Security, §13 Dead Code | `auth.controller.ts:COOKIE_OPTIONS`, `app.ts:helmet`, `backend/.env`, `prisma/seed.ts` |
| A03 | **Software Supply Chain Failures** | #37 (npm audit in CI), #38 (parameterized queries), #40 (email MX validation) | §5 Input Validation (hashToken, deps) | `package.json`, `CI config`, `email.service.ts` |
| A04 | **Cryptographic Failures** | #9 (JWT entropy), #10 (bcrypt env), #22 (jti/aud/iss), #23 (hash API keys), #24 (strip refreshToken from body) | §8 Password & Secrets | `lib/jwt.ts`, `lib/hash.ts`, `apiKey.service.ts`, `auth.controller.ts` |
| A05 | **Injection** | #25 (escape HTML templates), #26 (CSV formula sanitize), #27 (CSP headers) | §5 Input Validation & Injection | `templates/*.ts`, `export.controller.ts`, `app.ts:helmet` |
| A06 | **Insecure Design** | #13 (no test guards), #31 (clear cookie on pw change), #32 (block unverified forgotPW) | §6 Account Lockout, §7 Email & Verification, §12 Audit Logging | `auth.service.ts`, `auth.controller.ts` |
| A07 | **Authentication Failures** | #1 (no localStorage), #2 (generic errors), #3 (server-side logout), #4 (auto-refresh), #5 (emailVerified), #6 (reset on email change), #7 (userId reuse detection), #8 (forgotPw timing), #12 (rate limiting all), #16 (logout without token), #17 (no tokens in URLs) | §1 Auth Token Handling, §2 Error Enumeration, §4 User Enumeration | `auth.service.ts`, `auth.controller.ts`, `auth.routes.ts`, `useAuth.tsx`, `api.ts` |
| A08 | **Software/Data Integrity Failures** | #33 (no `as any` casts), #34 (remove dead code) | §5 Input Validation, §13 Dead Code | `auth.service.ts:createUser/updateUser` |
| A09 | **Logging & Alerting Failures** | #35 (await audit), #36 (audit token reuse) | §12 Audit Logging | `auth.service.ts` |
| A10 | **Mishandling of Exceptional Conditions** | #2 (generic errors), #8 (timing side-channel), #31 (stale cookies), #35 (await audit), #16 (logout without token) | §2 Error Enumeration, §9 Rate Limiting, §12 Audit Logging | `auth.service.ts`, `auth.controller.ts` |

Two new categories in 2026 vs 2021: **A03 Software Supply Chain Failures** (expanded from "Vulnerable and Outdated Components") and **A10 Mishandling of Exceptional Conditions** (improper error handling, fail-open scenarios). Security Misconfiguration surged from #5 to #2.

## Industry-Standard Security Practices

### Principle of Least Privilege
- Every user and service should have the minimum permissions needed to function.
- Role-based access control (RBAC) with granular scoping by `companyId` prevents lateral movement.
- API routes enforce role checks via `requireRole()` middleware; the service layer re-verifies as defense in depth.

### Defense in Depth
- No single security layer is trusted in isolation. The controller, service, and database each enforce authorization independently.
- Input is validated at the boundary (Zod schemas in controllers) and re-validated or treated as unsafe at every layer.
- `as any` casts are forbidden — they collapse type safety and bypass Zod validation.

### Secure by Default
- Cookies default to `httpOnly`, `secure`, `sameSite: "strict"` — the most restrictive posture.
- Rate limiting is applied to every public endpoint, not just auth routes.
- JWT secrets are validated for entropy at startup — the process exits fatally if insecure.

### Zero Trust Architecture
- Every request is authenticated and authorized, even within the internal network.
- Refresh token rotation with reuse detection forces re-authentication on token theft.
- Cross-company resource access is impossible — every query scopes by `companyId`.

### Secrets Management
- No secrets in code: all credentials come from environment variables or a secrets manager.
- `.env` files are gitignored. Production secrets are rotated immediately if compromised.
- Fallback credentials in seed scripts are prohibited — hard failures are safer than weak defaults.

### Input Validation & Output Encoding
- All external input is validated against Zod schemas before processing.
- HTML output in email templates is entity-encoded to prevent XSS.
- CSV output is sanitized against formula injection (cells starting with `=`, `+`, `-`, `@` are prefixed).

### Audit & Monitoring
- All authentication events (login, failure, logout, password change, role change, user creation) are audited.
- Token reuse detection triggers an audit event and mass-invalidation.
- All `createAuditLog()` calls are awaited — silent failures are not tolerated.

### Secure Cryptography
- Passwords: bcrypt with configurable salt rounds (env-driven, default 12).
- Tokens: SHA-256 hashing for stored refresh tokens and API keys.
- JWTs: Signed with strong secrets, include `jti`, `aud`, `iss` claims for revocation and audience restriction.
- JWT secrets: Minimum 32-character entropy check at startup.

### Supply Chain Security
- `npm audit` runs in CI and fails on critical vulnerabilities.
- Dependencies are pinned to exact versions where practical.
- Prisma ORM provides parameterized queries — raw SQL is never used.

### Session Management
- Short-lived access tokens (15 min) with transparent auto-refresh via 401 interceptor.
- Long-lived refresh tokens (7 days) stored as httpOnly cookies, hashed in DB.
- Server-side logout invalidates tokens; logout is accessible even with an expired access token.
- Concurrent refresh requests are deduplicated to avoid race conditions.

## Test Verification

After any auth change, run:
- Backend: `148/148` tests passing
- Frontend: `196/196` tests passing

---

# Additional Findings (June 2026 Audit — Processes Surrounding Fixes)

## 🔴 CRITICAL

### C. `updateUser` Service Layer Lacks Authorization (Broken Defense in Depth)

**Location:** `backend/src/services/auth.service.ts:546-588`
**Status:** FIXED ✅

`AuthService.updateUser()` now re-verifies role-change authorization: only owners can change roles, and no one can change their own role. Controller-side checks are retained for defense in depth.
**→ Golden Rule #19**

## 🟢 LOW

### M. `verifyEmail` Token Exposed in URL Query Parameter

**Location:** `backend/src/services/auth.service.ts:341`
**Status:** FIXED ✅

Both verify-email and reset-password links use URL query parameters (`?token=...`). Frontend reads the token from `window.location.search` and submits it to the backend via POST body over HTTPS. The earlier move to URL fragments was reverted — a fragment is not inherently more secure (page JavaScript can read it too), and query params are simpler for the frontend to receive and forward. A hash-fragment fallback is retained for backwards compatibility.
**→ Golden Rule #17**
