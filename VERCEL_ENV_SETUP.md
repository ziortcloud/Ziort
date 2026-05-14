# Ziort — Production Deployment Guide

## Monorepo Structure

Everything lives inside `ziort/`:
```
ziort/
  src/           ← Next.js 15 API (backend)
  supabase/      ← DB migrations
  web/           ← Vite React SPA (frontend) — was ziort-web/
  mobile/        ← Flutter app — was ziort-mobile/
  .claude/memory/← Project memory files (copy to new machine — see Step 0)
  vercel.json    ← API cron config
  package.json   ← Next.js package
```

Two Vercel projects:
- **ziort-api** → `api.ziort.com` (Next.js backend — root dir: `/`)
- **ziort-web** → `ziort.com` + `app.ziort.com` (Vite frontend — root dir: `web/`)

---

## STEP 0 — New Machine Setup

1. Copy the entire `ziort/` folder to the new machine (or `git clone` if pushed to GitHub)
2. Restore Claude memory: copy `ziort/.claude/memory/` → `C:\Users\<you>\.claude\projects\<project-id>\memory\`
   - The project-id folder is named after the path: replace `\` with `-` and `:` with `-`, e.g. `c--Users-sakth-Downloads-Bala-stunning-winner`
3. `cd ziort && npm install`
4. `cd ziort/web && npm install`
5. Copy `.env.local` to `ziort/` and `ziort/web/` (gitignored — keep a secure backup)
6. Start API: `cd ziort && npm run dev` (port 3000)
7. Start Web: `cd ziort/web && npm run dev` (port 5173)
8. VS Code: open `ziort/` as workspace root

---

## STEP 1 — Run Database Migrations in Supabase

1. Go to **https://supabase.com/dashboard/project/jzkkxsvzunarysvurmtd**
2. Click **SQL Editor** → **New Query**
3. Open file `ziort/supabase/RUN_ALL_MIGRATIONS.sql`, copy the **entire contents**
4. Paste into the SQL Editor → click **Run**
5. Should complete with no errors — all tables, RLS policies, RPCs created

> If any migration was already run before, the `CREATE TABLE IF NOT EXISTS` and
> `CREATE OR REPLACE FUNCTION` statements are safe to re-run.

---

## STEP 2 — Supabase Auth Settings

In Supabase Dashboard → **Authentication → URL Configuration**:

| Setting | Value |
|---|---|
| Site URL | `https://ziort.com` |
| Redirect URLs | `https://ziort.com/**` `https://app.ziort.com/**` `http://localhost:5173/**` |

In **Authentication → Email Templates** — update every template (Confirm signup, Reset password, Magic Link):
- Replace any `ZiOrbit` → `Ziort`
- Replace any `ziorbit.com` → `ziort.com`

In **Authentication → SMTP Settings** (if using custom SMTP / Resend):
- From email: `noreply@ziort.com`
- From name: `Ziort`

---

## STEP 3 — Deploy the API (ziort → Vercel Project 1)

### 3a. Push to GitHub
```bash
cd ziort
git init           # skip if already a git repo
git add .
git commit -m "feat: Ziort API — production build"
git remote add origin https://github.com/YOUR_ORG/ziort-api.git
git push -u origin main
```

### 3b. Create Vercel Project
1. Go to **https://vercel.com/new**
2. Import your **ziort-api** GitHub repo
3. Settings:
   - Framework: **Next.js** (auto-detected)
   - Root Directory: `/` (the repo root IS the Next.js project)
   - Build Command: `npm run build`
   - Output Directory: `.next`

### 3c. Add Environment Variables
Go to **Project → Settings → Environment Variables** and add:

| Variable | Value | Sensitive |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://jzkkxsvzunarysvurmtd.supabase.co` | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(from .env.local)* | No |
| `SUPABASE_SERVICE_ROLE_KEY` | *(from .env.local)* | **Yes** |
| `R2_ACCOUNT_ID` | `73f201c58abe31064cb5c657ca13c16a` | No |
| `R2_ENDPOINT` | `https://73f201c58abe31064cb5c657ca13c16a.r2.cloudflarestorage.com` | No |
| `R2_ACCESS_KEY_ID` | `a58a2ca35d188662285432473b4857c3` | No |
| `R2_SECRET_ACCESS_KEY` | *(from .env.local)* | **Yes** |
| `R2_BUCKET_NAME` | `Ziort1` | No |
| `R2_PUBLIC_URL` | `https://pub-90125e37d4424a689ad51a7f84b21916.r2.dev` | No |
| `RESEND_API_KEY` | *(from .env.local)* | **Yes** |
| `RESEND_FROM_EMAIL` | `noreply@ziort.com` | No |
| `RESEND_FROM_NAME` | `Ziort` | No |
| `NEXT_PUBLIC_APP_URL` | `https://api.ziort.com` | No |
| `NEXT_PUBLIC_APP_NAME` | `Ziort` | No |
| `APP_SECRET` | *(from .env.local)* | **Yes** |
| `CRON_SECRET` | *(from .env.local)* | **Yes** |

### 3d. Add Custom Domain
- Vercel → Project → **Domains** → Add `api.ziort.com`
- In your DNS (ziort.com registrar / Cloudflare):
  - Add `CNAME api → cname.vercel-dns.com`

### 3e. Deploy
Click **Deploy** — Vercel will build and deploy. Takes ~2 minutes.

---

## STEP 4 — Deploy the Frontend (ziort/web → Vercel Project 2)

### 4a. Push to GitHub
```bash
cd ziort
git init           # skip if already a git repo
git add .
git commit -m "feat: Ziort monorepo — API + web + mobile"
git remote add origin https://github.com/YOUR_ORG/ziort.git
git push -u origin main
```

### 4b. Create Vercel Project
1. Go to **https://vercel.com/new**
2. Import your **ziort** GitHub repo (same repo as the API)
3. Settings:
   - Framework: **Vite** (auto-detected)
   - **Root Directory: `web`** ← critical, not `/`
   - Build Command: `npm run build`
   - Output Directory: `dist`

### 4c. Add Environment Variables

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://jzkkxsvzunarysvurmtd.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *(from .env.local)* |
| `VITE_API_URL` | `https://api.ziort.com` |

### 4d. Add Custom Domains
- Vercel → Project → **Domains** → Add `ziort.com`
- Vercel → Project → **Domains** → Add `app.ziort.com`
- In your DNS:
  - Add `A @ 76.76.21.21` (Vercel's IP for apex domain)
  - Add `CNAME www → cname.vercel-dns.com`
  - Add `CNAME app → cname.vercel-dns.com`

### 4e. Deploy
Click **Deploy**.

---

## STEP 5 — DNS Summary (at your domain registrar / Cloudflare)

| Type | Name | Value |
|---|---|---|
| `A` | `@` (ziort.com) | `76.76.21.21` |
| `CNAME` | `www` | `cname.vercel-dns.com` |
| `CNAME` | `app` | `cname.vercel-dns.com` |
| `CNAME` | `api` | `cname.vercel-dns.com` |

For **Resend email sending** — verify your domain:
1. Go to **https://resend.com** → Domains → Add domain → `ziort.com`
2. Add the TXT/MX/DKIM records Resend gives you to your DNS
3. Once verified, `noreply@ziort.com` will send correctly

---

## STEP 6 — Post-Deploy Checklist

- [ ] `https://ziort.com` — landing page loads
- [ ] `https://app.ziort.com` or `https://ziort.com/login` — login works
- [ ] Register a new account → verify email arrives from `noreply@ziort.com`
- [ ] Complete setup → hub loads with product cards
- [ ] Start a free trial for ZiPawn → redirects to `/zipawn`
- [ ] `https://api.ziort.com/api/v1/auth/session` returns 401 (API is live)
- [ ] Vercel Dashboard → **Cron Jobs** → billing cron shows at `31 18 * * *`
- [ ] Check Vercel function logs for any startup errors

---

## Values from .env.local (keep these secret)

Copy these exact values when setting Vercel env vars:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the long JWT starting with `eyJ...`
- `SUPABASE_SERVICE_ROLE_KEY` — the service role JWT (mark Sensitive in Vercel)
- `R2_SECRET_ACCESS_KEY` — `5191bbb3...`
- `RESEND_API_KEY` — `re_2hmv4kvv_...`
- `APP_SECRET` — `f60d52f899c40bae...`
- `CRON_SECRET` — `9cf8ab6331950758...`
