# Deployment Guide: PermitPro PMS

Permit processing and document management for permit coordination companies. This is a **single Next.js 15 application** (not a monorepo) with Prisma ORM, NextAuth v5, and TailwindCSS.

**Database:** SQLite for local development; PostgreSQL is supported for production by changing the Prisma datasource.

---

## 1. Quick Local Development

### Prerequisites

- Node.js 18+ (Node 24 LTS recommended — matches CI/Docker)
- npm

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env — set NEXTAUTH_SECRET (openssl rand -base64 32)

# Apply migrations and generate Prisma client
npx prisma generate
npx prisma migrate dev

# Seed sample data (optional)
export DATABASE_URL="file:///$PWD/prisma/dev.db"
npm run db:seed

# Start dev server
export DATABASE_URL="file:///$PWD/prisma/dev.db"
npm run dev
```

The app runs at **http://localhost:3000** and redirects to `/login` when unauthenticated.

**Demo credentials** (after seeding):

| Role  | Email               | Password  |
|-------|---------------------|-----------|
| Admin | admin@permitco.com  | admin123  |
| User  | user@permitco.com   | user123   |

> **Cloud Agent note:** Prisma's schema engine cannot create SQLite databases in some sandboxed environments. Apply migrations manually with `sqlite3` if `prisma migrate dev` fails with permission errors. See `AGENTS.md` for the manual migration steps.

### Automated first-time setup

```bash
./setup-db.sh
# or
npm run db:setup
```

This script is interactive (`read -p` prompts) and handles `.env` creation, migrations, seeding, and storage directory setup.

---

## 2. Production Build (Node)

```bash
# Build
npm run build

# Run migrations against production database
npx prisma migrate deploy

# Start
npm start
```

### Required environment variables

| Variable          | Description                                      |
|-------------------|--------------------------------------------------|
| `DATABASE_URL`    | SQLite (`file:./prod.db`) or PostgreSQL URL      |
| `NEXTAUTH_URL`    | Public URL of the app (must match deployment)    |
| `NEXTAUTH_SECRET` | JWT signing secret (`openssl rand -base64 32`)   |
| `STORAGE_ROOT`    | Directory for uploaded documents (default `./storage`) |
| `CRON_SECRET`     | Auth token for `/api/cron/snapshot`              |

---

## 3. Docker Deployment (Recommended)

The repo includes a multi-stage `Dockerfile` and `docker-compose.yml` with Traefik reverse proxy and optional Cloudflare Tunnel.

### Quick start

```bash
cp .env.example .env
# Edit .env with production values

docker compose up -d --build
```

Migrations run automatically on container start via `docker-entrypoint.sh`.

### Volumes

| Host path   | Container path | Purpose              |
|-------------|----------------|----------------------|
| `./data`    | `/app/data`    | SQLite database file |
| `./storage` | `/app/storage` | Uploaded documents   |
| `./prisma`  | `/app/prisma`  | Schema (read-only)   |

### Optional services (docker-compose profiles)

```bash
# Guacamole remote desktop stack
docker compose --profile guacamole up -d

# n8n workflow automation and cloudflared tunnel are included by default
```

See **[DOCKER.md](./DOCKER.md)** for Traefik labels, health checks, and troubleshooting.

### Standalone Docker image

```bash
docker build -t permitpro-pms:latest .

docker run -p 3000:3000 \
  -e DATABASE_URL="file:/app/data/prod.db" \
  -e NEXTAUTH_URL="https://your-domain.com" \
  -e NEXTAUTH_SECRET="your-secret" \
  -e STORAGE_ROOT="/app/storage" \
  -v ./data:/app/data \
  -v ./storage:/app/storage \
  permitpro-pms:latest
```

---

## 4. Cloudflare Tunnel

For exposing the app without opening firewall ports, see **[cloudflare-tunnel-setup.md](./cloudflare-tunnel-setup.md)**.

Set `NEXTAUTH_URL` to your public tunnel URL before starting the app.

---

## 5. Migrating to PostgreSQL

1. Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Set `DATABASE_URL` in `.env`:

```env
DATABASE_URL="postgresql://user:password@host:5432/permitdb"
```

3. Run migrations:

```bash
npx prisma migrate deploy
```

---

## 6. Standard Scripts

| Script              | Description                        |
|---------------------|------------------------------------|
| `npm run dev`       | Development server                 |
| `npm run build`     | Production build                   |
| `npm start`         | Start production server            |
| `npm run lint`      | ESLint                             |
| `npm run typecheck` | TypeScript check                   |
| `npm test`          | Run invariant/unit tests           |
| `npm run db:seed`   | Seed database                      |
| `npm run db:migrate`| Run Prisma migrations (dev)        |
| `npm run db:generate` | Regenerate Prisma client         |
| `npm run db:studio` | Open Prisma Studio                 |

---

## 7. REST API Endpoints

All endpoints below require authentication unless noted.

### Authentication

- `POST /api/auth/signin` — Sign in
- `POST /api/auth/signout` — Sign out
- `GET /api/auth/session` — Current session

### Permits

- `GET /api/permits` — List permits (search, filter, pagination)
- `POST /api/permits` — Create permit
- `GET /api/permits/[id]` — Get permit details
- `PATCH /api/permits/[id]` — Update permit
- `DELETE /api/permits/[id]` — Delete permit
- `POST /api/permits/[id]/submit` — Submit to county
- `PATCH /api/permits/[id]/status` — Update permit status
- `GET /api/permits/[id]/readiness` — Readiness checklist status
- `GET /api/permits/[id]/checklist` — Permit checklist items
- `PATCH /api/permits/[id]/checklist/[itemId]` — Update checklist item
- `POST /api/permits/[id]/documents` — Upload document
- `GET /api/permits/[id]/documents/download-all` — Download all documents as ZIP
- `POST /api/permits/bulk` — Bulk permit operations

### Documents

- `GET /api/documents/[id]` — Get document metadata
- `GET /api/documents/[id]/download` — Download document
- `GET /api/documents/[id]/preview` — Preview document
- `PATCH /api/documents/[id]/verify` — Verify document
- `DELETE /api/documents/[id]` — Delete document

### Customers & Contractors

- `GET|POST /api/customers` — List / create customers
- `GET|PATCH|DELETE /api/customers/[id]` — Customer CRUD
- `GET|POST /api/contractors` — List / create contractors
- `GET|PATCH|DELETE /api/contractors/[id]` — Contractor CRUD
- `GET|POST /api/contractors/[id]/documents` — Contractor documents

### Tasks

- `GET|PATCH|DELETE /api/tasks/[id]` — Task CRUD
- `GET|POST /api/permits/[id]/tasks` — Permit tasks

### Jurisdictions & Requirements

- `GET|POST /api/jurisdictions` — List / create jurisdictions
- `GET|PATCH|DELETE /api/jurisdictions/[id]` — Jurisdiction CRUD
- `GET|POST /api/jurisdictions/[id]/requirements` — Jurisdiction requirements
- `GET|PATCH|DELETE /api/requirements/[id]` — Requirement CRUD

### Reports

- `GET /api/reports/pipeline` — Pipeline report
- `GET /api/reports/stalled` — Stalled permits report
- `GET /api/reports/contractor-compliance` — Contractor compliance
- `GET /api/reports/review-performance` — Review performance
- `GET|POST /api/reports/saved` — Saved reports
- `GET|PATCH|DELETE /api/reports/saved/[id]` — Saved report CRUD

### Review Queue

- `GET /api/review-queue` — Review queue
- `POST /api/review-assignments/[id]/comments` — Add review comment
- `PATCH|DELETE /api/review-comments/[id]` — Review comment CRUD

### Admin

- `GET|POST /api/admin/permit-types` — Permit type management
- `GET|PATCH|DELETE /api/admin/permit-types/[id]` — Permit type CRUD
- `POST /api/admin/counties/seed` — Seed county data

### Cron (requires `CRON_SECRET` header)

- `POST /api/cron/snapshot` — Scheduled snapshot job

---

## What This Project Is Not

This repository does **not** include:

- A Turbo/npm workspaces monorepo (`apps/*`, `packages/*`)
- An Electron desktop app
- An Expo/React Native mobile app

Those were aspirational in earlier drafts. The production path is the Next.js web app deployed via Docker or Node directly.

For full feature documentation, see **[README.md](./README.md)**.
