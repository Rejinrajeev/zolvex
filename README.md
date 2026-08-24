# Zolvex

Platform for Zolvex, a cleaning-service company: a public marketing site plus an
admin back-office with an approval workflow and a full audit trail. This repo is
an npm-workspaces monorepo; the only workspace so far is the Express + Prisma +
Postgres API at `apps/api`.

## Prerequisites

- **Node.js 20+** (and npm 10+, which ships with it)
- **PostgreSQL 16** — either Docker, or a local Postgres install

## Setup

### 1. Clone and configure environment

```bash
git clone <repo-url> zolvex
cd zolvex
cp apps/api/.env.example apps/api/.env
```

`apps/api/.env` is auto-loaded via `dotenv` by both the dev server and the test
runner. Edit it if your Postgres credentials differ from the defaults:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zolvex?schema=public"
DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5432/zolvex_test?schema=public"
PORT=4000
```

### 2. Start Postgres

With Docker:

```bash
docker run -d --name zolvex-pg \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16
```

Or use an existing local Postgres — just make sure `DATABASE_URL` matches it.

### 3. Create both databases

The suite uses a **separate test database** so running tests never touches dev
data. Create both:

```bash
docker exec zolvex-pg psql -U postgres -c 'CREATE DATABASE zolvex;'
docker exec zolvex-pg psql -U postgres -c 'CREATE DATABASE zolvex_test;'
```

(Without Docker: `createdb zolvex && createdb zolvex_test`.)

### 4. Install dependencies

```bash
npm install
npm run prisma:generate --workspace=apps/api
```

Re-run `prisma:generate` any time `prisma/schema.prisma` changes.

### 5. Run migrations against **both** databases

`db:migrate:test` is a plain `prisma migrate deploy` — it applies existing
migrations to whatever `DATABASE_URL` resolves to. It is deliberately *not*
hardcoded to the test URL, so you point it at each database in turn.

The **dev** database is the `DATABASE_URL` already in `.env`, so no override is
needed:

```bash
npm run db:migrate:test --workspace=apps/api
```

For the **test** database, override `DATABASE_URL` in the shell:

```bash
# macOS / Linux
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zolvex_test?schema=public" \
  npm run db:migrate:test --workspace=apps/api

# Windows PowerShell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zolvex_test?schema=public"
npm run db:migrate:test --workspace=apps/api
```

An explicit shell environment variable takes precedence over the value in
`.env`, so this targets `zolvex_test` without editing any file.

### 6. Run the tests

```bash
npm run test --workspace=apps/api
```

The tests connect to `DATABASE_URL_TEST` and require the test database to be
migrated (step 5).

## Everyday commands

| Command | What it does |
| --- | --- |
| `npm run dev --workspace=apps/api` | Start the API with hot reload on `PORT` (default 4000) |
| `npm run test --workspace=apps/api` | Run the full test suite against `DATABASE_URL_TEST` |
| `npm run typecheck --workspace=apps/api` | Type-check everything, tests included, no emit |
| `npm run build --workspace=apps/api` | Compile `src` to `dist` (test files excluded) |
| `npm run prisma:migrate --workspace=apps/api` | Create + apply a new migration in development |
| `npm run db:migrate:test --workspace=apps/api` | Apply existing migrations to whatever `DATABASE_URL` points at |

## Health endpoints

- `GET /health` — liveness. Touches nothing external; always `200 {"status":"ok"}`
  while the process is up.
- `GET /ready` — readiness. Runs `SELECT 1` through the Prisma singleton;
  `200 {"status":"ready"}` when Postgres answers, `503` when it does not.

## Notes for contributors

- **Never write to `Service` / `BlogPost` / `Testimonial` / `Faq` directly via
  Prisma from a route handler.** All mutations must go through
  `ApprovableResourceService` (`apps/api/src/lib/services/approvable-resource.ts`),
  which is what writes the audit-log row and enforces the approval workflow.
  Reads are fine — use the exported `publicVisibilityWhere` for public reads.
- **Always validate and allowlist request bodies (Zod) before calling
  `create()`/`update()`.** The service strips workflow fields with a denylist,
  not an allowlist.
- **Read the MIGRATION HAZARD comment above `Service.slug`** in
  `apps/api/prisma/schema.prisma` before generating any migration.
- Known deferred work and hazards live in [`TODOS.md`](./TODOS.md).
