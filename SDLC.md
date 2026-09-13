# Draftone Dashboard — SDLC & Project Documentation

**Version:** 1.0.0  
**Organization:** Draftone  
**Document Type:** Software Development Life Cycle Master Document  
**Last Updated:** 2026-09-13  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Requirements Engineering](#2-requirements-engineering)
3. [System Architecture](#3-system-architecture)
4. [Data Models & RBAC Design](#4-data-models--rbac-design)
5. [Technology Stack](#5-technology-stack)
6. [Git Workflow & Branching Strategy](#6-git-workflow--branching-strategy)
7. [Development Phases & Sprint Plan](#7-development-phases--sprint-plan)
8. [Folder Structure](#8-folder-structure)
9. [API Design Standards](#9-api-design-standards)
10. [Testing Strategy](#10-testing-strategy)
11. [Security Checklist](#11-security-checklist)
12. [Deployment & DevOps](#12-deployment--devops)
13. [Claude AI Prompt Engineering Playbook](#13-claude-ai-prompt-engineering-playbook)

---

## 1. Project Overview

### 1.1 Product Statement

**Draftone Dashboard** is a production-grade internal SaaS platform for Draftone's media production and digital agency operations. It replaces fragmented tools (spreadsheets, WhatsApp, email threads) with a unified system covering:

- Client onboarding and relationship management
- Project lifecycle tracking (pre-production → production → post → delivery)
- Team task assignment and workload visibility
- Asset management and file approvals
- Financial tracking (quotations, invoices, payments)
- Analytics and reporting

### 1.2 Stakeholders

| Role | Name/Team | Involvement |
|------|-----------|-------------|
| Product Owner | Draftone Management | Vision, priorities, final acceptance |
| Admin Users | Operations team | Full system access |
| Project Managers | PM team | Project + team management |
| Creative Staff | Editors, designers, shooters | Task execution, file uploads |
| Finance | Accounts team | Invoices, payments, reports |
| Clients | External | Read-only portal (Phase 2) |

### 1.3 Success Metrics

- Time to onboard a new client: < 15 minutes
- Project status visibility: real-time, zero manual sync
- Staff daily login rate: > 80%
- Invoice generation time: < 5 minutes

---

## 2. Requirements Engineering

### 2.1 Functional Requirements

#### Module 1: Authentication & RBAC
- FR-AUTH-01: Email/password login with JWT
- FR-AUTH-02: Role-based access (Super Admin, Admin, PM, Creative, Finance, Viewer)
- FR-AUTH-03: Permission gates on every route and API endpoint
- FR-AUTH-04: Session timeout after 8 hours inactivity
- FR-AUTH-05: Audit log of all login events

#### Module 2: Client Management (CRM)
- FR-CRM-01: Create, view, edit, archive client profiles
- FR-CRM-02: Client contact persons with multiple contacts per client
- FR-CRM-03: Attach notes, files, and activity history per client
- FR-CRM-04: Client status tags (Lead, Active, On-hold, Completed, Churned)
- FR-CRM-05: Search and filter clients by status, industry, PM

#### Module 3: Project Management
- FR-PROJ-01: Create projects linked to clients
- FR-PROJ-02: Project stages: Brief → Quotation → Pre-Production → Shoot → Post → Review → Delivery → Invoiced
- FR-PROJ-03: Assign PM and team members
- FR-PROJ-04: Project timeline with start/due dates
- FR-PROJ-05: Project-level file repository
- FR-PROJ-06: Internal notes and activity feed

#### Module 4: Task Management
- FR-TASK-01: Create tasks within projects
- FR-TASK-02: Assign tasks to one or more team members
- FR-TASK-03: Task status: Todo → In Progress → Review → Done
- FR-TASK-04: Task priority: Low / Medium / High / Urgent
- FR-TASK-05: Due date and time estimate per task
- FR-TASK-06: Sub-tasks (one level deep)
- FR-TASK-07: Task comments and @mentions

#### Module 5: Finance Module
- FR-FIN-01: Create and send quotations
- FR-FIN-02: Convert approved quotations to invoices
- FR-FIN-03: Track invoice status: Draft → Sent → Partially Paid → Paid → Overdue
- FR-FIN-04: Record payments against invoices
- FR-FIN-05: Revenue reports by client, project, month

#### Module 6: Team / HR Module
- FR-HR-01: Staff profiles with roles and departments
- FR-HR-02: Workload view — tasks per person per week
- FR-HR-03: Attendance / check-in log (Phase 2)

#### Module 7: Asset / File Management
- FR-ASSET-01: Upload files to projects or tasks
- FR-ASSET-02: File versioning (v1, v2…)
- FR-ASSET-03: Approval workflow: Pending → Approved / Rejected with comments
- FR-ASSET-04: Link assets to deliverables

#### Module 8: Notifications
- FR-NOTIF-01: In-app notifications for assignments, comments, approvals
- FR-NOTIF-02: Email notifications for key events (configurable per user)
- FR-NOTIF-03: Notification center with read/unread state

### 2.2 Non-Functional Requirements

| NFR | Requirement |
|-----|-------------|
| Performance | Page load < 2s on LTE; API response < 300ms p95 |
| Scalability | Support 100 concurrent users without degradation |
| Availability | 99.5% uptime (downtime < 44h/year) |
| Security | OWASP Top 10 compliant; encrypted data at rest and in transit |
| Responsive | Mobile-first; works on screens 375px–2560px |
| Accessibility | WCAG 2.1 AA |
| Browser support | Chrome 100+, Firefox 100+, Safari 15+, Edge 100+ |
| Audit | All data mutations logged with user + timestamp |

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT TIER                          │
│  React SPA (Vite) — Deployed on Vercel / Cloudflare      │
│  TailwindCSS + Shadcn/UI + React Query                   │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS / REST + WebSocket
┌──────────────────────▼──────────────────────────────────┐
│                    API GATEWAY TIER                       │
│  Node.js + Express (or Fastify) — Deployed on Railway    │
│  JWT Auth Middleware → RBAC Middleware → Route Handlers  │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
┌───────────┐  ┌──────────────┐  ┌───────────────┐
│ PostgreSQL │  │  Redis Cache │  │  File Storage │
│ (Primary  │  │  (Sessions + │  │  (Cloudflare  │
│  DB)      │  │   BullMQ     │  │   R2 / S3)    │
│           │  │   queues)    │  │               │
└───────────┘  └──────────────┘  └───────────────┘
```

### 3.2 Core Principles

- **Monorepo** with `/apps/web` (frontend) and `/apps/api` (backend)
- **REST API** — versioned at `/api/v1/`
- **JWT** — short-lived access token (15min) + refresh token (7 days) in httpOnly cookie
- **Row-level security** — every query scoped by `organization_id`
- **Soft deletes** — records marked `deleted_at`, never hard-deleted
- **Pagination** — all list endpoints use cursor-based pagination
- **WebSockets** — real-time notifications via Socket.io

---

## 4. Data Models & RBAC Design

### 4.1 RBAC Roles and Permissions Matrix

| Permission | Super Admin | Admin | PM | Creative | Finance | Viewer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Manage users | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View all clients | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Create/edit clients | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View all projects | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Create/edit projects | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage own tasks | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| View finances | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Create invoices | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| System settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 4.2 Core Database Schema (PostgreSQL)

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin','admin','pm','creative','finance','viewer')),
  department VARCHAR(100),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Clients
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  status VARCHAR(50) DEFAULT 'lead' CHECK (status IN ('lead','active','on_hold','completed','churned')),
  assigned_pm_id UUID REFERENCES users(id),
  website TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  stage VARCHAR(50) DEFAULT 'brief' CHECK (stage IN ('brief','quotation','pre_production','shoot','post_production','review','delivery','invoiced','completed','cancelled')),
  pm_id UUID REFERENCES users(id),
  start_date DATE,
  due_date DATE,
  budget NUMERIC(12,2),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) NOT NULL,
  parent_task_id UUID REFERENCES tasks(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'todo' CHECK (status IN ('todo','in_progress','review','done')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  assignee_id UUID REFERENCES users(id),
  due_date DATE,
  estimated_hours NUMERIC(5,2),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  client_id UUID REFERENCES clients(id) NOT NULL,
  project_id UUID REFERENCES projects(id),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft','sent','partially_paid','paid','overdue','cancelled')),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_percent NUMERIC(5,2) DEFAULT 18,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date DATE,
  issued_date DATE DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Audit Log
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Technology Stack

### Frontend
| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | React 18 + TypeScript | Component model, ecosystem |
| Build tool | Vite | Fast HMR, ESM native |
| Styling | TailwindCSS v3 | Utility-first, design token support |
| UI Components | shadcn/ui | Accessible, unstyled primitives |
| State | Zustand (global) + React Query (server) | Simple + powerful |
| Forms | React Hook Form + Zod | Validation schema colocated |
| Routing | React Router v6 | File-based routes |
| Charts | Recharts | Lightweight, composable |
| Icons | Lucide React | Consistent outline icon set |

### Backend
| Layer | Choice | Reason |
|-------|--------|--------|
| Runtime | Node.js 20 LTS | Stable, wide ecosystem |
| Framework | Express 4 + TypeScript | Familiar, flexible |
| ORM | Prisma | Type-safe DB client |
| Auth | jsonwebtoken + bcrypt | Battle-tested |
| Validation | Zod | Schema-first |
| Queue | BullMQ + Redis | Background jobs (email, notifications) |
| File upload | Multer → Cloudflare R2 | S3-compatible, cost-efficient |
| WebSockets | Socket.io | Real-time notifications |

### Infrastructure
| Layer | Choice |
|-------|--------|
| Database | PostgreSQL 15 (Railway or Supabase) |
| Cache | Redis 7 (Railway) |
| Frontend host | Vercel |
| Backend host | Railway |
| File storage | Cloudflare R2 |
| CI/CD | GitHub Actions |
| Monitoring | Sentry (errors) + UptimeRobot |

---

## 6. Git Workflow & Branching Strategy

### 6.1 Branch Model (Git Flow)

```
main            ← production; protected; only from release/* or hotfix/*
├── develop     ← integration branch; all features merge here
│   ├── feature/AUTH-01-login-page
│   ├── feature/CRM-01-client-list
│   ├── feature/PROJ-01-project-board
│   └── feature/FIN-01-invoice-form
├── release/1.0.0   ← created from develop when sprint complete
└── hotfix/fix-auth-token   ← emergency fix from main
```

### 6.2 Branch Naming Convention

```
feature/<TICKET-ID>-<short-description>
bugfix/<TICKET-ID>-<short-description>
hotfix/<TICKET-ID>-<short-description>
release/<version>
chore/<description>
docs/<description>

Examples:
feature/TASK-14-kanban-board
bugfix/AUTH-09-refresh-token-loop
hotfix/INV-03-gst-calculation
```

### 6.3 Commit Message Convention (Conventional Commits)

```
<type>(<scope>): <description>

[optional body]

[optional footer: BREAKING CHANGE or closes #TICKET]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`

Examples:
```
feat(auth): add JWT refresh token rotation
fix(projects): correct stage transition validation
docs(api): add endpoint documentation for /projects
refactor(tasks): extract task status component
test(clients): add unit tests for client filter logic
chore(deps): update react-query to v5
```

### 6.4 Pull Request Rules

- Minimum 1 reviewer approval required
- All CI checks must pass (lint, test, build)
- PR description must include: What / Why / How / Screenshots (for UI)
- Link to ticket/issue
- No direct commits to `main` or `develop`

### 6.5 Complete Git Setup Commands

```bash
# ── 1. Initialize the monorepo ──────────────────────────────
git init draftone-dashboard
cd draftone-dashboard
git checkout -b main

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
.env.local
.env.*.local
*.log
.DS_Store
coverage/
.turbo/
EOF

# Initial commit
git add .
git commit -m "chore: initialize draftone dashboard monorepo"

# ── 2. Set up develop branch ────────────────────────────────
git checkout -b develop
git push -u origin develop

# ── 3. Start a feature ──────────────────────────────────────
git checkout develop
git pull origin develop
git checkout -b feature/AUTH-01-login-page

# ... make changes ...
git add .
git commit -m "feat(auth): add login page with email/password form"
git push -u origin feature/AUTH-01-login-page
# → open PR to develop on GitHub

# ── 4. After PR merged, clean up ────────────────────────────
git checkout develop
git pull origin develop
git branch -d feature/AUTH-01-login-page

# ── 5. Create a release ─────────────────────────────────────
git checkout develop
git pull origin develop
git checkout -b release/1.0.0
# bump version, final QA
git commit -m "chore(release): bump version to 1.0.0"
git checkout main
git merge --no-ff release/1.0.0
git tag -a v1.0.0 -m "Release 1.0.0 — MVP"
git push origin main --tags
git checkout develop
git merge --no-ff release/1.0.0
git branch -d release/1.0.0

# ── 6. Hotfix ───────────────────────────────────────────────
git checkout main
git checkout -b hotfix/AUTH-critical-fix
# fix bug
git commit -m "fix(auth): resolve token expiry edge case"
git checkout main
git merge --no-ff hotfix/AUTH-critical-fix
git tag -a v1.0.1 -m "Hotfix 1.0.1"
git checkout develop
git merge --no-ff hotfix/AUTH-critical-fix
git branch -d hotfix/AUTH-critical-fix
```

---

## 7. Development Phases & Sprint Plan

### Phase 0 — Foundation (Week 1–2)
- [ ] Monorepo setup (Turborepo or pnpm workspaces)
- [ ] Frontend scaffolding (Vite + React + TS + Tailwind + shadcn)
- [ ] Backend scaffolding (Express + TS + Prisma)
- [ ] DB setup + schema migration
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Design system tokens and base components
- [ ] Auth module (register, login, logout, refresh)
- [ ] RBAC middleware

### Phase 1 — MVP Core (Week 3–6)
- [ ] Client management (CRUD, list, search, filter)
- [ ] Project management (CRUD, stages, team assignment)
- [ ] Task management (CRUD, Kanban, assignee)
- [ ] Dashboard home (KPI cards, recent activity)
- [ ] Staff management (list, create, roles)

### Phase 2 — Finance & Files (Week 7–10)
- [ ] Quotation builder
- [ ] Invoice generation (PDF export)
- [ ] Payment tracking
- [ ] File upload and management
- [ ] File approval workflow

### Phase 3 — Notifications & Polish (Week 11–12)
- [ ] In-app notifications (Socket.io)
- [ ] Email notifications (BullMQ + Nodemailer)
- [ ] Analytics dashboard (charts)
- [ ] Mobile responsiveness pass
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] UAT and bug fixes

### Phase 4 — Client Portal (Week 13–16)
- [ ] Read-only client portal (separate login)
- [ ] Project status view for clients
- [ ] File approval by client
- [ ] Client-facing invoice view

---

## 8. Folder Structure

```
draftone-dashboard/
├── apps/
│   ├── web/                          # React SPA
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── assets/
│   │   │   ├── components/
│   │   │   │   ├── ui/               # shadcn base components
│   │   │   │   ├── layout/           # Sidebar, Header, PageWrapper
│   │   │   │   └── shared/           # DataTable, Modal, StatusBadge
│   │   │   ├── features/             # Feature-sliced modules
│   │   │   │   ├── auth/
│   │   │   │   ├── clients/
│   │   │   │   ├── projects/
│   │   │   │   ├── tasks/
│   │   │   │   ├── finance/
│   │   │   │   └── team/
│   │   │   ├── hooks/                # Custom React hooks
│   │   │   ├── lib/                  # axios instance, queryClient
│   │   │   ├── pages/                # Route-level page components
│   │   │   ├── store/                # Zustand stores
│   │   │   ├── types/                # TypeScript types/interfaces
│   │   │   ├── utils/                # Date formatters, validators
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── .env.example
│   │   ├── index.html
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   │
│   └── api/                          # Node.js API
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       ├── src/
│       │   ├── config/               # DB, Redis, env config
│       │   ├── middleware/           # auth, rbac, errorHandler, rateLimiter
│       │   ├── modules/              # Feature modules
│       │   │   ├── auth/
│       │   │   │   ├── auth.controller.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   ├── auth.routes.ts
│       │   │   │   └── auth.schema.ts
│       │   │   ├── clients/
│       │   │   ├── projects/
│       │   │   ├── tasks/
│       │   │   ├── finance/
│       │   │   └── team/
│       │   ├── shared/               # Pagination, response helpers
│       │   ├── jobs/                 # BullMQ job processors
│       │   ├── sockets/              # Socket.io handlers
│       │   ├── utils/
│       │   └── app.ts
│       ├── .env.example
│       └── tsconfig.json
│
├── packages/
│   └── shared/                       # Shared Zod schemas & TS types
│       ├── src/
│       │   ├── schemas/
│       │   └── types/
│       └── package.json
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── .gitignore
├── package.json                      # pnpm workspace root
├── pnpm-workspace.yaml
├── turbo.json
└── SDLC.md
```

---

## 9. API Design Standards

### 9.1 URL Conventions

```
GET    /api/v1/clients              list (paginated)
POST   /api/v1/clients              create
GET    /api/v1/clients/:id          get one
PATCH  /api/v1/clients/:id          update (partial)
DELETE /api/v1/clients/:id          soft delete

GET    /api/v1/projects/:id/tasks   nested resource
```

### 9.2 Pagination Response Shape

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 143,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 9.3 Error Response Shape

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

### 9.4 Success Response Shape

```json
{
  "data": { ... },
  "message": "Client created successfully"
}
```

---

## 10. Testing Strategy

### 10.1 Testing Pyramid

```
         /\
        /  \  E2E Tests (Playwright) — 5%
       /----\  Critical user flows only
      /      \
     /--------\ Integration Tests (Supertest) — 25%
    / API      \ All endpoints, auth, RBAC
   /------------\
  /              \ Unit Tests (Vitest) — 70%
 / Services,      \ Business logic, validators, utils
/------------------\
```

### 10.2 Coverage Targets

| Layer | Target |
|-------|--------|
| API services | 80% |
| React components | 60% |
| Utilities | 90% |
| E2E critical flows | 100% of defined flows |

### 10.3 E2E Test Flows (Playwright)

1. Login → Dashboard → Logout
2. Create client → Create project → Assign PM → Change stage
3. Create task → Assign → Change status → Mark done
4. Create quotation → Convert to invoice → Record payment
5. Upload file → Approve file

---

## 11. Security Checklist

- [ ] All endpoints behind JWT authentication
- [ ] RBAC checked server-side (never trust client)
- [ ] Passwords hashed with bcrypt (cost factor 12)
- [ ] Refresh tokens rotated on use
- [ ] httpOnly, Secure, SameSite=Strict cookies
- [ ] Rate limiting: 100 req/min per IP on auth routes
- [ ] Input validation with Zod on all API inputs
- [ ] SQL injection: Prisma parameterized queries
- [ ] XSS: React escapes by default; CSP headers
- [ ] CORS: whitelist only known origins
- [ ] Secrets in environment variables, never in code
- [ ] File upload: type validation, size limits (50MB), virus scan
- [ ] HTTPS enforced everywhere
- [ ] Dependency audit in CI (`pnpm audit`)
- [ ] No sensitive data in logs

---

## 12. Deployment & DevOps

### 12.1 Environment Variables

```env
# API — apps/api/.env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://user:pass@host:5432/draftone
REDIS_URL=redis://default:pass@host:6379
JWT_ACCESS_SECRET=<32-char-random>
JWT_REFRESH_SECRET=<32-char-random>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CLOUDFLARE_R2_BUCKET=draftone-assets
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_ACCESS_KEY_ID=...
CLOUDFLARE_SECRET_ACCESS_KEY=...
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=<api-key>
SMTP_FROM=noreply@draftone.in
FRONTEND_URL=https://dashboard.draftone.in

# Web — apps/web/.env
VITE_API_URL=https://api.draftone.in
VITE_SOCKET_URL=https://api.draftone.in
VITE_APP_NAME=Draftone Dashboard
```

### 12.2 GitHub Actions CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [develop, main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

---

## 13. Claude AI Prompt Engineering Playbook

This section defines how to use Claude (via Anthropic API or claude.ai) as an AI coding assistant to build this dashboard efficiently.

### 13.1 Claude as Prompt Engineer + Orchestrator

Use Claude in VS Code (via Claude Code extension) with the following prompting patterns:

### 13.2 Scaffold Prompt Templates

#### Generate a Full Feature Module

```
Context: I'm building the Draftone Dashboard — a SaaS for a media production agency.
Stack: React 18 + TypeScript + TailwindCSS + shadcn/ui + React Query
       Node.js + Express + Prisma + PostgreSQL

Task: Generate the complete CLIENTS feature module with:
- Frontend: ClientList page with DataTable (sortable, filterable, paginated), 
  ClientDetail page, ClientForm (create/edit) modal
- Backend: clients.controller.ts, clients.service.ts, clients.routes.ts, clients.schema.ts
- RBAC: only admin, super_admin, pm can create/edit; all roles can view
- Zod validation schema
- React Query hooks for all CRUD operations
- TypeScript types in packages/shared/src/types/client.types.ts

Follow the folder structure in our SDLC.md. Use our API conventions:
- Pagination response shape: { data, pagination }
- Error shape: { error: { code, message, details } }
- Soft deletes (deleted_at field)
```

#### Generate a Prisma Migration

```
Context: Draftone Dashboard. DB: PostgreSQL via Prisma.

Add to the schema:
- Table: project_members (junction between projects and users)
  - id UUID PK
  - project_id FK projects
  - user_id FK users
  - role: 'lead' | 'member'
  - joined_at TIMESTAMPTZ default now
  - Unique constraint: (project_id, user_id)

Generate:
1. The Prisma schema addition
2. The migration SQL
3. Updated TypeScript types
4. The Prisma query in projects.service.ts to fetch project with members
```

#### Fix a Bug

```
Context: Draftone Dashboard. React 18 + TypeScript + React Query v5.

Bug: When I navigate away from the ProjectDetail page and come back, 
the task list shows stale data for 30 seconds.

Code:
[paste relevant code]

Expected: Tasks should refetch on page focus or when the component mounts.
Diagnose and fix.
```

#### Generate a Component

```
Context: Draftone Dashboard. React + TailwindCSS + shadcn/ui.

Generate a <StatusBadge> component that:
- Accepts: status (string), size ('sm' | 'md')
- Maps these statuses to colors:
  - todo → gray
  - in_progress → blue
  - review → amber
  - done → green
  - urgent → red
  - cancelled → gray with strikethrough text
- Uses shadcn Badge component underneath
- Exports TypeScript types
- Includes a Storybook story
```

### 13.3 Antigravity Mode: Claude Builds, You Review

For rapid development, use this workflow:

1. Open VS Code with Claude Code extension (or use claude.ai in Projects)
2. Add SDLC.md to the project context
3. Use the prompt templates above
4. Claude generates the full file(s)
5. You review, test, and commit

This "Prompt → Generate → Review → Commit" loop should produce 3–5 features per day once the foundation is set.

### 13.4 Prompt for This Exact Setup in VS Code

After setting up the repo, run in Claude Code:

```
I've initialized the Draftone Dashboard monorepo per our SDLC. 
Read SDLC.md, then:

1. Set up the monorepo with pnpm workspaces + Turborepo
2. Scaffold apps/web with Vite + React + TS + TailwindCSS + shadcn/ui + React Query
3. Scaffold apps/api with Express + TS + Prisma
4. Create packages/shared with base Zod schemas and types
5. Set up Prisma schema with all tables from SDLC.md Section 4.2
6. Create the auth module (login, register, refresh, logout) end-to-end
7. Create the RBAC middleware
8. Set up GitHub Actions CI

Do this step by step, creating all files. Ask me before each major step.
```
