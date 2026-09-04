# Deploying Zolvex — $0 dev / preview environment

Everything below is free and stays free. Three hosts, one env var to connect
them:

| Piece | Host | Free tier reality |
| --- | --- | --- |
| `apps/web` — public site **and** admin panel | **Vercel** Hobby | always fast; a preview URL per PR |
| `apps/api` — Express/Prisma backend | **Render** free web service | sleeps after ~15 min idle → first request then takes ~30s |
| Postgres | **Neon** free | permanent, 0.5 GB, wakes in ~0.5s |

Vercel runs Next.js natively but is a poor fit for a long-lived Express server
(in-memory rate limiters, Prisma pooling, multipart uploads), so the API lives
on Render. The database is on Neon rather than Render's free Postgres because
Render deletes free databases after 90 days; Neon's free tier is permanent.

The browser only ever talks to Vercel. `apps/web` forwards what it needs to the
API from the server side, so there is **no CORS to configure** and the API URL
is never exposed to the client.

```
browser ──▶ Vercel (apps/web) ──▶ Render (apps/api) ──▶ Neon (Postgres)
                                       └──▶ Cloudinary (image uploads)
```

**The Render cold start barely matters here.** Public pages are served by
Vercel from cache (ISR, 90s) even while the API sleeps — a visitor sees the
site instantly. The API only wakes for an enquiry submission or admin-panel
use, so the ~30s hit lands on *you* opening `/admin` after a break, not on
visitors. There's an optional keep-warm cron at the end if it bugs you.

---

## 0. Before you start

Create free accounts (no card required for any of these):

- **Vercel** — https://vercel.com
- **Render** — https://render.com
- **Neon** — https://neon.tech
- **Cloudinary** — https://cloudinary.com (admin image uploads go here; grab
  `Cloud name`, `API Key`, `API Secret` from the dashboard)

Get the repo onto GitHub and connect Vercel + Render to it. Deploy from
`master`, or from any branch — both hosts support branch deploys.

Generate the one secret you have to make yourself:

```bash
openssl rand -hex 32     # → ADMIN_2FA_ENCRYPTION_KEY (64 hex chars)
```

---

## 1. Database on Neon

1. Neon → **New Project** (name it `zolvex`, pick the region nearest you —
   Singapore for India).
2. From the project dashboard, copy the **connection string**. Use the
   **direct** one (not the `-pooler` host) — the API is a long-lived server,
   not serverless, and Prisma migrations need the direct connection. It looks
   like `postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`.
3. Keep it handy for the next step and for seeding.

## 2. API on Render

### 2a. Deploy the blueprint

1. Render dashboard → **New +** → **Blueprint**.
2. Pick this repo. Render reads [`render.yaml`](../render.yaml) and shows a
   plan: one **Web Service** (`zolvex-api`).
3. It will prompt for the env vars marked `sync: false`:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | the Neon connection string from step 1 |
   | `ADMIN_2FA_ENCRYPTION_KEY` | the `openssl rand -hex 32` output |
   | `SEED_SUPERADMIN_EMAIL` | your email — this becomes the first admin login |
   | `SEED_SUPERADMIN_NAME` | your name |
   | `CLOUDINARY_CLOUD_NAME` | from Cloudinary |
   | `CLOUDINARY_API_KEY` | from Cloudinary |
   | `CLOUDINARY_API_SECRET` | from Cloudinary |

   `JWT_SECRET` is generated automatically.
4. **Apply**. First build takes a few minutes. `render.yaml`'s `startCommand`
   runs `prisma migrate deploy` before booting, so the schema is created on the
   first deploy and updated on every deploy after.
5. When it's live, copy the service URL — something like
   `https://zolvex-api.onrender.com`. Check `https://zolvex-api.onrender.com/health`
   returns `{"status":"ok"}`.

### 2b. Create your admin login (run once)

The migrations create the tables but not the first user. Seed it from your
machine against the Neon database:

```bash
cd apps/api
DATABASE_URL="<your Neon connection string>" \
SEED_SUPERADMIN_EMAIL="you@example.com" \
SEED_SUPERADMIN_NAME="Your Name" \
npm run db:seed
```

It prints a **temporary password** once. Save it — you'll set your own right
after the first sign-in, and you'll set up 2FA then too.

---

## 3. Web app on Vercel

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

### 3b. Sign in to the admin panel

- Go to `https://<your-vercel-url>/admin/login`.
- Email = `SEED_SUPERADMIN_EMAIL`, password = the temporary one from step 2b.
- You'll be asked to set a real password and scan a 2FA QR code.
- Then publish services, blog posts, testimonials, FAQ, and fill in the Hero /
  Footer / WhatsApp / Google Review page content. The public site picks changes
  up within ~90 seconds (ISR), no redeploy needed.

---

## 4. Environment variables — full reference

### `apps/api` (Render)

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon connection string (direct, not `-pooler`) |
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

## 5. Updating

Both hosts auto-deploy on push to the connected branch:

- Push code that changes `apps/api` → Render rebuilds, runs `prisma migrate
  deploy`, restarts.
- Push code that changes `apps/web` → Vercel rebuilds.
- **New Prisma migration**: commit the generated folder under
  `apps/api/prisma/migrations/`. Render applies it automatically on the next
  deploy (via `start:prod` → `prisma migrate deploy`). Never run
  `prisma migrate dev` against the Neon database.

---

## 6. Optional: stop the API sleeping

Render free services sleep after 15 min idle. If the ~30s wake on `/admin` is
annoying, ping `/health` every ~10 min. One free service pinged 24/7 still fits
inside Render's 750 free hours/month. Easiest: a scheduled GitHub Action in
this repo —

```yaml
# .github/workflows/keep-warm.yml
name: keep-warm
on:
  schedule:
    - cron: "*/10 * * * *"
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl -fsS https://zolvex-api.onrender.com/health
```

or a free monitor at https://cron-job.org or https://uptimerobot.com pointed at
the same URL.

---

## 7. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Site loads but every section is empty | Expected until you publish content from `/admin`. Also check `API_BASE_URL` on Vercel points at the live Render URL with no trailing slash. |
| First request after a while is very slow / 502 | Render free tier cold start (~30s). Retry, or add the keep-warm cron (section 6). |
| `/admin` shows "could not…" everywhere right after deploy | The API is asleep or still booting — wait for `/health` to answer, then retry. |
| Admin image upload fails | Cloudinary env vars missing or wrong on Render. |
| Build fails on Render with a Prisma error | Make sure the migration folder for your latest schema change is committed. |
| Prisma can't reach the database / SSL error | The Neon string must end with `?sslmode=require`; use the direct host, not `-pooler`. |
| Login says password is wrong | Re-run the seed (step 2b) against the Neon `DATABASE_URL`; the temp password is shown only once per seed. |

---

## Why not everything on Vercel

Also $0, but not worth it for this codebase:

- The Express app has to be wrapped as a serverless function, either a separate
  Vercel project with `@vercel/node` or a catch-all route in `apps/web`.
- Postgres must be the Neon **pooled** (`-pooler`) string or serverless
  invocations exhaust connections.
- `express-rate-limit` keeps its counters in memory, which resets on every cold
  start — the login and enquiry rate limits become close to meaningless. The
  per-account lockout (`Admin.lockedUntil` after repeated failed logins) still
  works, so it's not a hole, just weaker.

Render for the API is the same code that runs locally, deployed as-is. Start
there.
