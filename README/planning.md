High-level architecture
Browser (React / Next.js frontend)
|
v
Node.js API (Express / Fastify)
|
v
MariaDB / PostgreSQL
|
v
File Storage (incident images / attachments)

Hosting on Xneelo:

Frontend: static build (npm run build) served by Nginx
Node.js backend: PM2-managed process
Database: MariaDB (likely easiest on Xneelo)
File uploads: local disk OR S3-compatible storage if scaling later

Planning Phase

Phase 1 — Frontend Planning

1.1 Site Map & Route Design
- Map every page: Login, Dashboard, Incident List, Incident Create, Incident Detail, Admin panel
- Define URL structure and navigation hierarchy
- Identify shared layouts (sidebar, header) vs standalone pages

1.2 Component Tree
- Break each page into reusable components (tables, forms, cards, modals, charts)
- Plan stateful vs presentational components
- Design the global component library (Button, Input, Modal, Toast, Table, Badge)

1.3 State Management
- Choose approach: React Context + useReducer vs Zustand vs Redux Toolkit
- Plan global state slices: auth, incidents, notifications, UI (sidebar, theme)
- Decide server state strategy: SWR vs TanStack Query vs plain fetch

1.4 UI/UX Flow
- Wireframe key user journeys:
  - Login → Dashboard overview
  - Create incident wizard (step-by-step form with validation)
  - Incident detail with tabs (Summary, Timeline, Evidence, Investigation)
- Design loading states, empty states, error boundaries
- Confirm responsive breakpoints (mobile-first or desktop-first)

1.5 Forms & Validation
- Map every form field and its validation rules
- Plan multi-step wizard for incident creation
- Choose form library: React Hook Form vs Formik

1.6 API Integration Layer
- Design service layer: /services/api.ts with typed fetch wrappers
- Plan interceptors for auth token injection and refresh
- Define TypeScript types/interfaces for every API response

1.7 Testing Strategy
- Unit tests for components and hooks
- Integration tests for page flows
- E2E tests for critical paths (login, create incident)

1.8 Build & Deployment
- Static export via Next.js
- Environment variables for API URL, upload size limits
- CI/CD lint + test + build pipeline

---

Phase 2 — Backend Planning

2.1 API Contract
- Finalize all routes, methods, request bodies, and response shapes
- Define pagination, filtering, and sorting conventions
- Document status workflow state machine

2.2 Middleware Stack
- Auth JWT verification + role guard
- Request validation (schema-based using Zod or Joi)
- Rate limiting, CORS, error handler

2.3 Service Layer
- Separate business logic from route handlers
- Plan service modules: AuthService, IncidentService, InvestigationService, CommentService, UploadService, AuditService

2.4 File Handling
- Multer config: size limits, allowed MIME types, destination paths
- Metadata extraction and checksum generation
- Cleanup strategy for orphaned uploads

---

Phase 3 — Database Planning

3.1 Finalize Schema
- Confirm all tables, columns, types, indexes, and relations
- Plan migrations strategy (Prisma migrate)
- Seed data for roles, categories, and admin user

3.2 Query Patterns
- Indexes on frequently queried columns (status, severity, date, assignee)
- Full-text search approach for incident titles/descriptions

---

Phase 4 — Infrastructure Planning

4.1 Xneelo VPS Setup
- Order Ubuntu VPS, configure SSH, firewall (UFW)
- Install Nginx, Node.js, PM2, MariaDB
- Set up SSL via Let's Encrypt

4.2 CI/CD
- GitHub Actions or manual deploy script
- Build frontend → rsync to Nginx static directory
- Pull backend → npm install → PM2 restart

4.3 Backup Strategy
- Daily MariaDB dump
- Uploads directory rsync to offsite/backup

---

Incident Report System – Tech Spec

1. Purpose

A web-based incident reporting platform where users can:

Report incidents
Attach evidence (images/documents)
Assign severity
Track status
Add comments/updates
Investigate incidents
Generate reports
Manage user roles

Use cases:

Workplace safety
Security incidents
IT incidents
Public reporting
Fleet / operational incidents 2. Tech Stack
Frontend

Use Next.js (recommended)

Why:

Front-end framework
Static export possible
Easy routing
Forms
Good DX
Xneelo can host frontend build

Alternative:

React + Vite
Backend

Use Node.js with:

Fastify (faster, cleaner than Express)
or
Express (if simpler)

Recommended: Fastify

Database

Use MariaDB

Why:

Xneelo friendly
cheap
SQL
relational data fits incidents well
ORM

Use Prisma

Auth

JWT auth with:

access token
refresh token
role permissions
File uploads

Use:

Multer
local /uploads
virus scan hook optional 3. User Roles
Reporter

Can:

create incident
upload evidence
view own incidents
add comments
Investigator

Can:

view assigned incidents
update findings
change severity
request more info
close incident
Manager

Can:

view all incidents
assign investigators
generate reports
dashboard access
export data
Admin

Can:

manage users
configure categories
audit logs
permissions 4. Core Modules
A. Authentication Module

Features:

Login

Fields:

email
password

Optional:

MFA later
Password reset
Session handling
Permissions middleware

API:

POST /auth/login
POST /auth/logout
POST /auth/refresh
POST /auth/reset
B. Incident Reporting Module

Main feature.

Incident Form Fields

Basic info:

Incident title
Description
Incident type
Severity
Category
Date/time
Location
Reporter

People involved:

injured persons
witnesses
departments

Optional:

asset involved
vehicle
equipment

Evidence:

photos
videos
documents
Status workflow
Draft
Submitted
Under Review
Assigned
Investigating
Resolved
Closed
Rejected

API:

POST /incidents
GET /incidents
GET /incidents/:id
PUT /incidents/:id
PATCH /incidents/:id/status
DELETE /incidents/:id
C. Investigation Module

Fields:

assigned investigator
findings
root cause
actions taken
recommendations
closure notes
Action Tracking

Create corrective actions:

description
owner
due date
completion state

API:

POST /incidents/:id/investigation
PUT /incidents/:id/investigation
POST /actions
PATCH /actions/:id
D. Evidence Management

Upload:

images
PDF
DOCX

Requirements:

file size limit
MIME validation
virus scanning hook
metadata stored

DB stores:

filename
original name
uploader
path
checksum

API:

POST /uploads
GET /uploads/:id
DELETE /uploads/:id
E. Comments / Timeline

Every incident should have an audit trail:

Examples:

Incident created
Severity changed
Assigned to investigator
Comment added
Evidence uploaded
Status changed
Closed

User comments:

threaded or simple flat comments

API:

POST /incidents/:id/comments
GET /incidents/:id/comments
F. Reporting Dashboard

Metrics:

open incidents
incidents by severity
incidents by department
average resolution time
monthly trends
overdue actions

Export:

CSV
PDF
G. Notifications

Basic:

email notification
status update emails
assignment emails

Optional later:

SMS
WhatsApp integration 5. Database Design
users
id
name
email
password_hash
role
department
status
created_at
updated_at
incidents
id
reference_number
title
description
type
severity
category
status
incident_date
location
reporter_id
assigned_to
created_at
updated_at
incident_people
id
incident_id
name
role
contact
notes
evidence
id
incident_id
file_name
original_name
mime_type
file_size
checksum
uploaded_by
created_at
comments
id
incident_id
user_id
message
created_at
investigations
id
incident_id
findings
root_cause
recommendations
closure_notes
completed_at
corrective_actions
id
incident_id
description
owner_id
due_date
status
completed_at
audit_logs
id
entity_type
entity_id
action
old_values
new_values
performed_by
created_at 6. Frontend Pages
Public
login
forgot password
Authenticated
Dashboard

cards:

Open incidents
Critical incidents
Assigned to me
Overdue actions

Charts:

trend graphs
Incident List

Features:

search
filters
pagination
export
Incident Create

Multi-step form:

Basic details
People involved
Evidence
Review submit
Incident Detail

Sections:

summary
timeline
comments
evidence
investigation
actions
Admin
users
categories
settings
audit logs 7. Security Requirements

Mandatory:

Auth
bcrypt password hashing
JWT
refresh token rotation
API
rate limiting
input validation
CORS
CSRF if cookie auth
Uploads
MIME validation
rename files
no executable uploads
DB
prepared queries via ORM
Infra
HTTPS
firewall
PM2 restart policies
Audit
immutable activity logs 8. Non-functional Requirements

Performance:

<500ms average API response

Scalability:

support 5k–20k incidents

Availability:

daily backups

Logging:

app logs
error logs
audit logs

Monitoring:

uptime checks 9. Suggested Folder Structure
frontend/
├── app/
├── components/
├── lib/
├── hooks/
├── services/

backend/
├── src/
│ ├── routes/
│ ├── controllers/
│ ├── services/
│ ├── middleware/
│ ├── validators/
│ ├── prisma/
│ ├── utils/
│ └── jobs/ 10. Deployment on Xneelo
VPS route (recommended)

Install:

Ubuntu
Nginx
Node.js
PM2
MariaDB

Flow:

Nginx -> Next.js static frontend
Nginx reverse proxy -> Node API
MariaDB local
uploads on disk
SSL via Let's Encrypt 11. What I would change from a practical perspective

A lot of people overbuild these systems.

For a first production version, I’d do:

Keep
auth
incidents
uploads
comments
status workflow
dashboard
audit logs

Delay
MFA
threaded comments
SMS
virus scanning
fancy analytics
real-time sockets

That gets you a deployable system fast.

My actual recommendation stack

Best stack for your hosting pain requirement:

Next.js frontend (static build)
Fastify API
Prisma
MariaDB
PM2
Nginx
Ubuntu VPS on Xneelo

That avoids serverless lock-in and weird deployment complexity.
