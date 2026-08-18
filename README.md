# SecReports — Incident Report System

A web-based incident reporting platform for workplace safety, security, IT incidents, and operational events. Built for deployment on Xneelo Ubuntu VPS.

---

## Tech Stack

### Frontend

- **Framework:** Next.js 16.2.6 (App Router, static export via `output: "export"`)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 (zinc-800 dark palette, `#86efac` green accent, glassmorphism, gradient cards)
- **Forms & Validation:** React Hook Form + Zod
- **Testing:** Jest + React Testing Library
- **Linting:** ESLint (Next.js config)

### Backend

- **Runtime:** Node.js (TypeScript, compiled via `tsc`)
- **Framework:** Fastify 5 (with `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit`, `@fastify/multipart`)
- **ORM:** Prisma 7 (with MongoDB adapter)
- **Auth:** JWT (access + refresh tokens), bcrypt (12 rounds)
- **Validation:** Zod
- **Email:** Resend (transactional emails with dynamic HTML templates)
- **Testing:** Jest + ts-jest

### Database

- **Database:** MongoDB (via Prisma ORM)
- **Migrations:** Prisma Migrate
- **Seed:** TypeScript seed script (`prisma/seed.ts`)

### Deployment (Xneelo VPS)

- **Frontend:** Static files served via Nginx
- **Backend:** PM2-managed Node.js process
- **Database:** MongoDB local instance
- **File Uploads:** Local disk (`/uploads`)
- **SSL:** Let's Encrypt

---

## Authentication

Auth uses **JWT access + refresh token** flow:

| Endpoint                | Method    | Auth   | Description                               |
| ----------------------- | --------- | ------ | ----------------------------------------- |
| `/auth/register`        | POST      | No     | Register a new company + owner user       |
| `/auth/login`           | POST      | No     | Login, returns access + refresh tokens    |
| `/auth/refresh`         | POST      | No     | Exchange refresh token for new token pair |
| `/auth/me`              | GET       | Bearer | Get current user profile                  |
| `/auth/me/password`     | PATCH     | Bearer | Change current user's password            |
| `/auth/forgot-password` | POST      | No     | Sends password reset email                |
| `/auth/reset-password`  | POST      | No     | Reset password with token from email      |
| `/auth/users`           | GET/POST  | Bearer | List / create users (owner only)          |
| `/auth/users/:id`       | GET/PATCH | Bearer | Get / update user (owner only)            |

- **Access token:** 15-minute expiry, stored in `localStorage`
- **Refresh token:** 7-day expiry, exchanged for new pair via `/auth/refresh`
- **Password hashing:** bcrypt with 12 salt rounds
- **Rate limiting:** 100 requests/minute per IP via `@fastify/rate-limit`
- **Role-based authorization:** `requireRole("owner")` middleware on admin routes

### User Roles

| Role          | Permissions                                                                  |
| ------------- | ---------------------------------------------------------------------------- |
| `superadmin`  | Platform-wide admin — manage all companies, invoices, revenue dashboard      |
| `owner`       | Full company access — manage users, subscriptions, all features              |
| `manager`     | Standard access — view all incidents, assign investigators, generate reports |
| `senior`      | Standard access — create incidents, comment                                  |

---

## API Overview

All authenticated endpoints require `Authorization: Bearer <token>` header.

### API Key Authentication

Alternatively, endpoints can be accessed via API key using the `x-api-key` header. API-key-authenticated requests receive a synthetic `"api"` role that is **not** included in any route's `requireRole()` allow-list. This means API key access is effectively **read-only** — only endpoints that use `authenticate` without `requireRole()` are accessible (e.g., GET list/detail routes).

API keys are scoped to a single company and can be generated/revoked by owners and managers via `/api-keys`.

### Incidents

| Method | Path                    | Description                            |
| ------ | ----------------------- | -------------------------------------- |
| GET    | `/incidents`            | List incidents (paginated, filterable) |
| GET    | `/incidents/:id`        | Get incident detail                    |
| POST   | `/incidents`            | Create incident                        |
| PUT    | `/incidents/:id`        | Update incident                        |
| PATCH  | `/incidents/:id/status` | Update incident status                 |
| DELETE | `/incidents/:id`        | Delete incident                        |

### Reports

| Method | Path               | Description             |
| ------ | ------------------ | ----------------------- |
| GET    | `/reports/summary` | Dashboard summary stats |

---

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB 7+
- npm

### 1. Clone & Install

```bash
git clone <repo-url>
cd SecReportsNew

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Database Setup

Run Prisma generate and seed:

```bash
cd backend
npx prisma generate
npx tsx prisma/seed.ts
```

### 3. Run Development Servers

```bash
# Terminal 1 — Backend (port 4000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

### Backend

| Script               | Description                                  |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | Start dev server with hot reload (tsx watch) |
| `npm run build`      | Compile TypeScript to `dist/`                |
| `npm run start`      | Run compiled server                          |
| `npm test`           | Run Jest tests                               |
| `npm run db:sync`    | Push schema to MongoDB (Prisma db push)      |
| `npm run db:seed`    | Seed database                                |
| `npm run db:studio`  | Open Prisma Studio GUI                       |

### Frontend

| Script          | Description             |
| --------------- | ----------------------- |
| `npm run dev`   | Next.js dev server      |
| `npm run build` | Static export to `out/` |
| `npm run start` | Serve production build  |
| `npm run lint`  | Run ESLint              |

---


