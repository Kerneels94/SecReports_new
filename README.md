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
- **ORM:** Prisma 7 (with `@prisma/adapter-mariadb`)
- **Auth:** JWT (access + refresh tokens), bcrypt (12 rounds)
- **Validation:** Zod
- **Email:** Nodemailer (Ethereal SMTP for dev)
- **Testing:** Jest + ts-jest

### Database
- **Database:** MariaDB (via Prisma ORM)
- **Migrations:** Prisma Migrate
- **Seed:** TypeScript seed script (`prisma/seed.ts`)

### Deployment (Xneelo VPS)
- **Frontend:** Static files served via Nginx
- **Backend:** PM2-managed Node.js process
- **Database:** MariaDB local instance
- **File Uploads:** Local disk (`/uploads`)
- **SSL:** Let's Encrypt

---

## Authentication

Auth uses **JWT access + refresh token** flow:

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/register` | POST | No | Register a new company + owner user |
| `/auth/login` | POST | No | Login, returns access + refresh tokens |
| `/auth/refresh` | POST | No | Exchange refresh token for new token pair |
| `/auth/me` | GET | Bearer | Get current user profile |
| `/auth/me/password` | PATCH | Bearer | Change current user's password |
| `/auth/forgot-password` | POST | No | Sends password reset email |
| `/auth/reset-password` | POST | No | Reset password with token from email |
| `/auth/users` | GET/POST | Bearer | List / create users (owner only) |
| `/auth/users/:id` | GET/PATCH | Bearer | Get / update user (owner only) |

- **Access token:** 15-minute expiry, stored in `localStorage`
- **Refresh token:** 7-day expiry, exchanged for new pair via `/auth/refresh`
- **Password hashing:** bcrypt with 12 salt rounds
- **Rate limiting:** 100 requests/minute per IP via `@fastify/rate-limit`
- **Role-based authorization:** `requireRole("owner")` middleware on admin routes

### User Roles

| Role | Permissions |
|------|-------------|
| `owner` | Full access — manage users, edit profiles, all features |
| `manager` | Standard access — view all incidents, assign investigators, generate reports |
| `senior` | Standard access — create incidents, upload evidence, comment |

---

## API Overview

All authenticated endpoints require `Authorization: Bearer <token>` header.

### Incidents
| Method | Path | Description |
|--------|------|-------------|
| GET | `/incidents` | List incidents (paginated, filterable) |
| GET | `/incidents/:id` | Get incident detail |
| POST | `/incidents` | Create incident |
| PUT | `/incidents/:id` | Update incident |
| PATCH | `/incidents/:id/status` | Update incident status |
| DELETE | `/incidents/:id` | Delete incident |

### Reports
| Method | Path | Description |
|--------|------|-------------|
| GET | `/reports/summary` | Dashboard summary stats |

---

## Getting Started

### Prerequisites

- Node.js 20+
- MariaDB 10.6+ (or MySQL 8+)
- npm

### 1. Clone & Install

```bash
git clone <repo-url>
cd SecReportsNew

# Backend
cd backend
cp .env .env.local   # edit credentials as needed
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

**`backend/.env`:**
```
DATABASE_URL="mysql://root:password@localhost:3306/SecReports"
DATABASE_HOST=localhost
DATABASE_USER=root
DATABASE_PASSWORD=password
DATABASE_NAME=SecReports
DATABASE_PORT=3306
JWT_SECRET="change-this-in-production"
JWT_REFRESH_SECRET="change-this-too"
PORT=4000
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=<ethereal-user>
SMTP_PASS=<ethereal-pass>
SMTP_FROM="SecReports <noreply@secreports.com>"
APP_URL=http://localhost:3000
```

**`frontend/.env.local`:**
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Database Setup

Create the MariaDB database:
```sql
CREATE DATABASE SecReports;
```

Run migrations and seed:
```bash
cd backend
npx prisma migrate deploy
npx tsx prisma/seed.ts
```

### 4. Run Development Servers

```bash
# Terminal 1 — Backend (port 4000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Seed Users

All seed accounts use password `password123`:

| Email | Role |
|-------|------|
| admin@example.com | owner |
| manager@example.com | manager |
| investigator@example.com | senior |
| reporter@example.com | senior |

---

## Scripts

### Backend

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled server |
| `npm test` | Run Jest tests |
| `npm run db:migrate` | Create/apply Prisma migrations |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:seed` | Seed database |
| `npm run db:studio` | Open Prisma Studio GUI |

### Frontend

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Static export to `out/` |
| `npm run start` | Serve production build |
| `npm run lint` | Run ESLint |

---

## Database Export

To dump the MariaDB database to a `.sql` file you can open and inspect:

```bash
mysqldump -u root -p SecReports > secreports_dump.sql
```

Or with a full path:
```bash
mysqldump -u root -p SecReports > D:\path\to\secreports_dump.sql
```

This produces a plain-text `.sql` file with all `CREATE TABLE` and `INSERT` statements, viewable in any text editor or importable into another MariaDB/MySQL instance.

### Schema Only (no data)
```bash
mysqldump -u root -p --no-data SecReports > secreports_schema.sql
```

### Data Only (no schema)
```bash
mysqldump -u root -p --no-create-info SecReports > secreports_data.sql
```
