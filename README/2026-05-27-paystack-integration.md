# Paystack Payment Integration — 27 May 2026

## What was built

### Database

- **4 new models**: `SubscriptionPlan`, `CompanySubscription`, `PaymentHistory`, `ApiKey`
- **3 seeded plans**: Starter (Free, 20 reports, 1 user), Professional (R800/mo, 50 reports, 5 users), Enterprise (R1,500/mo, unlimited)
- Plans are feature-flagged via JSON: evidence_uploads, export_csv_pdf, full_lifecycle, api_access

### Backend (16 new files)

| Layer             | Files                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| **Payments**      | `paystack.service.ts`, `paystack.controller.ts`, `paystack.routes.ts`, `webhook.routes.ts`             |
| **Subscriptions** | `subscription.service.ts` — activate, upgrade, cancel, feature gating, usage checks                    |
| **Evidence**      | `evidence.controller.ts`, `evidence.routes.ts` — upload/delete (gated)                                 |
| **Export**        | `export.controller.ts`, `export.routes.ts` — CSV download (gated, PDF stub)                            |
| **Lifecycle**     | `investigation.controller.ts`, `investigation.routes.ts` — investigations + corrective actions (gated) |
| **API Keys**      | `apiKey.service.ts`, `apiKey.controller.ts`, `apiKey.routes.ts`, `apiKeyAuth.ts` (gated)               |
| **Middleware**    | `requireSubscription.ts` — reusable `preHandler` for feature gating                                    |

### Frontend

- **`/settings/billing`** — Current plan card with usage bars, plan comparison grid with upgrade buttons (redirects to Paystack checkout), payment history table, cancel subscription modal
- **Billing link** added to sidebar
- **Landing page pricing** updated to R800/R1,500

### Feature Gating

| Feature          | Starter | Professional | Enterprise |
| ---------------- | ------- | ------------ | ---------- |
| Report limit     | 20      | 50           | Unlimited  |
| User limit       | 1       | 5            | Unlimited  |
| Evidence uploads | ❌      | ✅           | ✅         |
| CSV/PDF export   | ❌      | ✅           | ✅         |
| Full lifecycle   | ❌      | ❌           | ✅         |
| API access       | ❌      | ❌           | ✅         |

### Tests

- **335 total** (139 backend + 196 frontend) — all passing
- Backend: updated Prisma mocks in `auth.service.test.ts` for new subscription models
- Seed script: updated to delete new model tables and insert subscription plans

### Required `.env` additions (backend)

Add these 3 variables to `backend/.env`:

```ini
# Paystack (South Africa)
PAYSTACK_SECRET_KEY=sk_test_xxxx           # from Paystack dashboard → Settings → API Keys & Webhooks
PAYSTACK_PUBLIC_KEY=pk_test_xxxx           # same page — used if you add inline.js checkout later
PAYSTACK_WEBHOOK_SECRET=whsec_xxxx          # from Paystack dashboard → Settings → API Keys & Webhooks → Webhook URL
```

**Where to find them:**

1. Log in to [dashboard.paystack.co](https://dashboard.paystack.co)
2. Go to **Settings → API Keys & Webhooks**
3. Copy your **Secret Key** (starts with `sk_`) and **Public Key** (starts with `pk_`)
4. Under **Webhook URL**, set it to `https://your-server.com/webhooks/paystack` (or generate a webhook secret)

**Test mode:** Use `sk_test_` keys for development. Switch to `sk_live_` when going live.

### Required database steps after pull

If deploying to production for the **first time after this commit**:

```bash
cd backend

# Apply the new migration (creates subscription_plans, company_subscriptions, etc.)
npx prisma migrate deploy

# Seed the 3 subscription plans
npx tsx prisma/seed.ts
```

> **Note:** The old 3 migration files were squashed into 1 combined migration (`20260527181032_initial`). If your production DB already has those old migrations applied, run `prisma migrate deploy` — it will detect they're applied and only apply the new model changes. If you get a migration conflict, run `prisma migrate resolve` to mark the old ones as applied.

### New API endpoints

| Method | Path                           | Auth | Description                                           |
| ------ | ------------------------------ | ---- | ----------------------------------------------------- |
| GET    | `/payments/subscription`       | JWT  | Current subscription + usage                          |
| POST   | `/payments/upgrade`            | JWT  | Initiate plan upgrade (returns Paystack redirect URL) |
| POST   | `/payments/cancel`             | JWT  | Cancel subscription                                   |
| GET    | `/payments/history`            | JWT  | Payment history                                       |
| GET    | `/payments/callback`           | JWT  | Paystack redirect callback                            |
| POST   | `/webhooks/paystack`           | HMAC | Paystack webhook events                               |
| POST   | `/incidents/:id/evidence`      | JWT  | Upload evidence file                                  |
| DELETE | `/incidents/:id/evidence/:eid` | JWT  | Delete evidence                                       |
| GET    | `/export/csv`                  | JWT  | Export incidents as CSV                               |
| GET    | `/export/pdf`                  | JWT  | Export incidents as PDF (stub)                        |
| GET    | `/incidents/:id/investigation` | JWT  | Get investigation                                     |
| POST   | `/incidents/:id/investigation` | JWT  | Create/update investigation                           |
| GET    | `/incidents/:id/actions`       | JWT  | List corrective actions                               |
| POST   | `/incidents/:id/actions`       | JWT  | Create corrective action                              |
| PATCH  | `/actions/:id`                 | JWT  | Update corrective action                              |
| GET    | `/api-keys`                    | JWT  | List API keys                                         |
| POST   | `/api-keys`                    | JWT  | Generate API key                                      |
| DELETE | `/api-keys/:id`                | JWT  | Revoke API key                                        |
