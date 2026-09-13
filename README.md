# Draftone Dashboard

Draftone Dashboard is a production-grade internal SaaS platform designed for Draftone's media production and digital agency operations. The system unifies client relationship management (CRM), project lifecycle tracking (pre-production, shoot, post, delivery), team task assignment, asset management, and financial operations into a single secure platform with strict role-based access control and tenant data isolation.

## Architecture Overview

The repository is organized as a monorepo utilizing pnpm workspaces and Turborepo:
- **Frontend (`apps/web`):** React 18 SPA built with Vite, TypeScript, TailwindCSS v3, shadcn/ui, Zustand, and TanStack React Query.
- **Backend (`apps/api`):** REST API built with Node.js, Express 4, TypeScript, Prisma ORM, PostgreSQL, Redis, BullMQ, and Socket.io.
- **Shared (`packages/shared`):** Colocated TypeScript types, RBAC permission definitions, and Zod validation schemas shared between client and server.

## Repository Structure

```
draftone-dashboard/
├── apps/
│   ├── web/               # React 18 SPA frontend
│   └── api/               # Express 4 + Prisma API backend
├── packages/
│   └── shared/            # Shared types, Zod schemas, RBAC contracts
├── .github/
│   └── workflows/         # CI/CD pipelines
├── .editorconfig
├── .gitignore
├── .nvmrc
├── package.json           # Monorepo root configuration
├── pnpm-workspace.yaml    # Workspace definition
├── turbo.json             # Turborepo task pipeline configuration
├── README.md              # Project documentation
└── SDLC.md                # Master Software Development Life Cycle specification
```

## Prerequisites

- **Node.js:** Node.js 20 LTS (see `.nvmrc`)
- **Package Manager:** `pnpm` (>= 9.0.0, configured for v11)
- **Database:** PostgreSQL 15+
- **Cache & Queue:** Redis 7+

## Development Commands

All commands are orchestrated via Turborepo across the workspaces:

```bash
# Install dependencies
pnpm install

# Start all applications in development mode
pnpm dev

# Build all applications and packages
pnpm build

# Run typechecks across the monorepo
pnpm typecheck

# Run linting across the monorepo
pnpm lint

# Run test suites across the monorepo
pnpm test

# Clean build outputs and caches
pnpm clean
```

## Specification Reference

The authoritative architectural, functional, security, and design specifications are maintained in [SDLC.md](./SDLC.md).

## Git Workflow Summary

The project adheres to Git Flow:
- `main`: Production-ready branch. Protected.
- `develop`: Integration branch where features are merged.
- `feature/<TICKET-ID>-<description>`: Topic branches branching off `develop`.
- `bugfix/<TICKET-ID>-<description>`: Non-urgent bug fixes branching off `develop`.
- `release/<version>`: Release preparation branches from `develop` merged to `main` and `develop`.
- `hotfix/<TICKET-ID>-<description>`: Emergency production fixes branching off `main`.

All commits follow Conventional Commits format (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`).
