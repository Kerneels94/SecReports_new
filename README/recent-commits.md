# Recent Commits — Development Branch

## 1. `02a417b` — feat: add superadmin portal with invoicing and revenue dashboard

**Author:** kerneels94 <corriebotha64@gmail.com>
**Date:** 2026-06-14 08:38:50 +0200

- Add Invoice model to Prisma schema, make User.companyId optional
- Add PaymentHistory.invoiceId relation to Invoice
- Seed superadmin from SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD env vars
- Create InvoiceService with CRUD, monthly bulk generation, revenue stats
- Create InvoiceController and /admin/* routes protected by superadmin role
- Build admin portal layout with auth guard and sidebar navigation
- Build revenue dashboard with KPI cards, 12-month bar chart, recent invoices
- Build companies list and detail pages with subscription & invoice history
- Build invoices list with status filters and mark-paid/send/overdue actions
- Build new invoice form with bulk monthly generation button
- Redirect superadmin users to /portal on login instead of /dashboard

---

## 2. `b9fe4d4` — Remove evidence upload, report limits, API access from tiers; reprice plans with site-based limits

**Author:** kerneels94 <corriebotha64@gmail.com>
**Date:** 2026-06-14 07:56:26 +0200

No detailed description provided.

---

## 3. `fde92b9` — Commented the codebase

**Author:** kerneels94 <corriebotha64@gmail.com>
**Date:** 2026-06-14 07:22:21 +0200

No detailed description provided.
