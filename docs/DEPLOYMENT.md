# Deploying Zolvex (dev / preview environment)

This repo is a two-app monorepo:

| App | What it is | Where it goes |
| --- | --- | --- |
| `apps/web` | Next.js 16 — the public site **and** the admin panel (it proxies every admin/API call server-side) | **Vercel** |
| `apps/api` | Express + Prisma — the real backend and the only thing that talks to Postgres | **Render** (long-lived Node server + managed Postgres) |

Vercel runs Next.js natively but is a poor fit for a long-lived Express server
(in-memory rate limiters, Prisma connection pooling, multipart uploads). So the
API and database live on Render, and the web app points at them with one
environment variable.

The browser only ever talks to Vercel. `apps/web` forwards what it needs to the
API from the server side, so there is **no CORS to configure** and the API URL
is never exposed to the client.

```
browser ──▶ Vercel (apps/web)  ──▶ Render (apps/api) ──▶ Render Postgres
                                        └──▶ Cloudinary (image uploads)
```

---

## 0. Before you start

Create free accounts:

- **Vercel** — https://vercel.com
- **Render** — https://render.com
- **Cloudinary** — https://cloudinary.com (admin image uploads go here; grab
  `Cloud name`, `API Key`, `API Secret` from the dashboard)

Push this branch and get it onto `master` (or deploy from a branch — both hosts
support that). All commands below assume the repo is on GitHub and both hosts
are connected to it.

Generate the one secret you have to make yourself:

```bash
openssl rand -hex 32     # → ADMIN_2FA_ENCRYPTION_KEY (64 hex chars)
```

---

## 1. API + database on Render

### 1a. Deploy the blueprint

1. Render dashboard → **New +** → **Blueprint**.
2. Pick this repo. Render reads [`render.yaml`](../render.yaml) and shows a
   plan: one **Postgres** (`zolvex-db`) and one **Web Service** (`zolvex-api`).
3. It will prompt for the env vars marked `sync: false`:

   | Variable | Value |
   | --- | --- |
   | `ADMIN_2FA_ENCRYPTION_KEY` | the `openssl rand -hex 32` output |
   | `SEED_SUPERADMIN_EMAIL` | your email — this becomes the first admin login |
   | `SEED_SUPERADMIN_NAME` | your name |
   | `CLOUDINARY_CLOUD_NAME` | from Cloudinary |
   | `CLOUDINARY_API_KEY` | from Cloudinary |
   | `CLOUDINARY_API_SECRET` | from Cloudinary |

   `DATABASE_URL` and `JWT_SECRET` are filled in automatically.
4. **Apply**. First build takes a few minutes. `render.yaml`'s `startCommand`
   runs `prisma migrate deploy` before booting, so the schema is created on the
   first deploy and updated on every deploy after.
5. When it's live, copy the service URL — something like
   `https://zolvex-api.onrender.com`. Check `https://zolvex-api.onrender.com/health`
   returns `{"status":"ok"}`.

### 1b. Create your admin login (run once)

The migrations create the tables but not the first user. Seed it from your
machine against the production database:

1. Render → `zolvex-db` → copy the **External Database URL**.
2. Locally:

   ```bash
   cd apps/api
   DATABASE_URL="<paste external database URL>" \
   SEED_SUPERADMIN_EMAIL="you@example.com" \
   SEED_SUPERADMIN_NAME="Your Name" \
   npm run db:seed
   ```

3. It prints a **temporary password** once. Save it — you'll set your own right
   after the first sign-in, and you'll set up 2FA then too.

> Free Postgres on Render is deleted after 90 days and the API sleeps after
> ~15 min idle (first request then takes ~30s). Fine for a preview env. For
> something longer-lived, move the DB to [Neon](https://neon.tech) (set
> `DATABASE_URL` on the API service to the Neon string) and/or bump the API to
> a paid instance.

---

## 2. Web app on Vercel

1. Vercel → **Add New** → **Project** → import this repo.
2. **Root Directory**: set to `apps/web`. Vercel auto-detects Next.js and keeps
   "Include source files outside of the Root Directory" on (needed for the npm
   workspace).
3. **Environment Variables** — add one, for all environments:

   | Variable | Value |
   | --- | --- |
   | `API_BASE_URL` | your Render API URL, e.g. `https://zolvex-api.onrender.com` (no trailing slash) |

4. **Deploy.** Build command / output are the Next.js defaults — leave them.
5. Open the Vercel URL. The public site loads; content is empty until you
   publish some from the admin panel.

### 2b. Sign in to the admin panel

- Go to `https://<your-vercel-url>/admin/login`.
- Email = `SEED_SUPERADMIN_EMAIL`, password = the temporary one from step 1b.
- You'll be asked to set a real password and scan a 2FA QR code.
- Then publish services, blog posts, testimonials, FAQ, and fill in the Hero /
  Footer / WhatsApp / Google Review page content. The public site picks changes
  up within ~90 seconds (ISR), no redeploy needed.

---

## 3. Environment variables — full reference

### `apps/api` (Render)

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string (auto from `render.yaml`) |
| `JWT_SECRET` | yes | long random string (auto-generated by `render.yaml`) |
| `ADMIN_2FA_ENCRYPTION_KEY` | yes | 64 hex chars — `openssl rand -hex 32` |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | yes | image uploads |
| `SEED_SUPERADMIN_EMAIL` / `_NAME` | seed only | used by `npm run db:seed` |
| `NODE_ENV` | yes | `production` (set by `render.yaml`) |
| `PORT` | no | Render sets it; `server.ts` reads it |
| `TRUST_PROXY` | **leave unset** | see the long note in `apps/api/.env.example` — unsafe for this layout |
| `DATABASE_URL_TEST` | no | tests only, never in deploy |

### `apps/web` (Vercel)

| Variable | Required | Notes |
| --- | --- | --- |
| `API_BASE_URL` | yes | the Render API URL, no trailing slash |

---

## 4. Updating

Both hosts auto-deploy on push to the connected branch:

- Push code that changes `apps/api` → Render rebuilds, runs `prisma migrate
  deploy`, restarts.
- Push code that changes `apps/web` → Vercel rebuilds.
- **New Prisma migration**: commit the generated folder under
  `apps/api/prisma/migrations/`. Render applies it automatically on the next
  deploy (via `start:prod` → `prisma migrate deploy`). Never run
  `prisma migrate dev` against the production database.

---

## 5. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Site loads but every section is empty | Expected until you publish content from `/admin`. Also check `API_BASE_URL` on Vercel points at the live Render URL with no trailing slash. |
| First request after a while is very slow / 502 | Render free tier cold start (~30s). Retry. Upgrade the instance to keep it warm. |
| `/admin` shows "could not…" everywhere right after deploy | The API is asleep or still booting — wait for `/health` to answer, then retry. |
| Admin image upload fails | Cloudinary env vars missing or wrong on Render. |
| Build fails on Render with a Prisma error | Make sure the migration folder for your latest schema change is committed. |
| Login says password is wrong | Re-run the seed (step 1b) against the right `DATABASE_URL`; the temp password is shown only once per seed. |

---

## Alternative: everything on Vercel

Possible but not recommended for this codebase. You'd need to:

- Wrap the Express app in a catch-all serverless function
  (`apps/web/app/api/[...]` re-exporting `createApp()`), or run `apps/api` as a
  separate Vercel project with `@vercel/node`.
- Use a serverless-friendly Postgres (Neon) — Render/local Postgres will
  exhaust connections from serverless.
- Accept that `express-rate-limit`'s in-memory store resets on every cold start,
  so the login/enquiry rate limits become close to meaningless. The per-account
  lockout (`Admin.lockedUntil`) still works.

Render for the API is simpler and behaves like the local setup, so start there.
