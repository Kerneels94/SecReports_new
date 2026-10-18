# Review of opencode access-control findings — 18-10-2026

Scope: the opencode audit of admin, manager and senior surfaces (findings 1–7 and their PASS claims), checked against the code on branch `fix/admin-guard-downloads-seats-audit` (HEAD `eed207c`). Read-only check: no code was changed and no tests were run.

Result: 2 findings invalid, 3 valid as rated, 2 valid but under-rated (one real access-control gap, now MEDIUM).

## Findings

| # | Finding (opencode severity) | Outcome | Reason |
|---|---|---|---|
| 1 | `/admin/users` and `/admin/permissions` have no client permission gate (LOW) | Invalid | `layout.tsx` has no route entry, but each page gates itself. `admin/users/page.tsx:39,83` checks `hasPermission(user, "users.manage")` and skips the fetch. `admin/permissions/page.tsx:92-95` checks `user?.role !== "admin"`. A blocked user sees "Admin access required." with no API call and no broken state. The proposed fix would duplicate these gates. |
| 2 | `requirePermission` trusts the role from the 15-min access token (LOW) | Valid, accept as design | Role comes from the JWT (`app.ts` authenticate sets `request.user`; read at `requirePermission.ts:23`). TTL is `15m` (`jwt.ts:34`). The window is bounded: refresh re-reads the role from the DB, and `deleteUser` deletes refresh tokens (`auth.service.ts:853`). `authenticate` also does not check `status`, so a deleted user keeps access for up to 15 minutes. |
| 3 | `/subscription/billing` readable by any authenticated role (INFO) | Valid | No gate (`subscription.routes.ts:10`). Returns only the company's own subscription and plan, no payment secrets (`subscription.service.ts:282-293`). |
| 4 | Report emailing is an exfiltration channel by design (INFO) | Valid, raise to MEDIUM | `/reports/email` and `/reports/batch-email` are gated by `reports.view`, not `export.reports` (`report.routes.ts:17-24`). The catalog describes `export.reports` as "Yearly PDF and emailed report distribution" (`permissions.ts:63`), so an admin who revokes it does not stop emailing. The permissions page promises a control that does not exist. Rate limit (10/min) and audit log with recipient are correct (`export.controller.ts:718`). |
| 5 | Managers can rename any company user, including admins (LOW) | Valid | A name-only change needs only `users.update`; there is no check on the target's role. Actual lines are `auth.service.ts:797-805` (opencode cited 789-798). `deleteUser` protects admins (`:850`), so this is inconsistent. The manager UI cannot reach it, but the API can: user IDs are visible in audit logs, which managers can read. The change is audit-logged. |
| 6 | Seniors can open `/admin/users` and `/admin/permissions` directly (LOW) | Invalid | Same cause as #1. The page-level gates render "Admin access required." and send no request. |
| 7 | Seniors share the report-email channel (INFO) | Valid, raise to MEDIUM | Seniors are denied downloads: `/export/csv` and `/export/pdf` need `export.csv`, and `incidents/page.tsx:23` hides the PDF button. But `canEmail = reports.view` (`incidents/page.tsx:24`) lets them email the same CSV or PDF to any address, including their own. This bypasses `export.csv`. |

## Corrections to opencode's PASS claims

| Claim | Outcome | Reason |
|---|---|---|
| "Backend denies seniors from export.csv" | Partly false | The download routes deny seniors, but the same data is reachable by email (see #7). |
| "Profile page only touches self-scoped /auth/me/password" | Inaccurate | It also calls `PATCH /auth/users/:id` for the name (`profile/page.tsx:66`). Only shown to roles with `users.update` (`:43`). Not a vulnerability. |
| "CSV formula injection sanitized on every cell" | Mostly true | `sanitizeCsv` (`export.controller.ts:67-70`) runs on every cell but only catches a leading `= + - @`. It misses a leading tab (`\t`) and carriage return (`\r`), which OWASP also lists, and guards with a leading space instead of `'`. LOW gap. |
| Line refs `auth.service.ts:686,711,837` and `715-733` | Off by about 7 lines | Actual lines are `693/717/844` and `722-741`. The code behaviour described is correct. |
| Section 1 summary "1 MEDIUM-low, 2 INFO" | Wrong count | Section 1 lists 2 LOW and 1 INFO. |

## Confirmed PASS

- Admin API routes gated (`users.manage`, `users.update`, `auditLogs.view`, `billing.manage`, `requireRole("admin")` on the permission matrix, `requireRole("superadmin")` on invoices and ledger), all behind `authenticate`.
- User CRUD scoped by `findFirst({ id, companyId })`; no cross-company IDOR.
- Service layer re-checks role and email changes (admin-only).
- Permission matrix update rejects unknown keys and roles; `requirePermission` fails closed on unknown keys.
- Audit logs scoped by `performedByUser.companyId`; search `OR` branches are ANDed with that scope.
- Incidents, reports and exports scoped by `companyId`; incident create takes `companyId` from the JWT; no incident update or delete routes.
- HTML emails escape the user name through `greeting()` in `templates/layout.ts`.

## Recommended fix

Gate `/reports/email` and `/reports/batch-email` on `export.reports` (or on `export.csv` for CSV/PDF format) in `report.routes.ts`, and update the `reports.view` catalog description to drop "emailed reports". This closes #4 and #7. Not yet implemented.

## Not checked

- Superadmin invoice and ledger controllers beyond their route gates.
- Whether a leading space actually stops formula evaluation in Excel.
