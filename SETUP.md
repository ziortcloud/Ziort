# Ziort — New Environment Setup Guide

Complete step-by-step guide for provisioning a **new** Supabase project, Cloudflare R2 bucket, and running the Prisma auto-setup for Ziort.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Ziort Monorepo (Turborepo)                         │
│                                                     │
│  ├── apps/                                          │
│  │   ├── server  (Next.js 15 — api.ziort.com)       │
│  │   ├── web     (Vite React — app.ziort.com)        │
│  │   └── mobile  (Flutter — iOS/Android)            │
│  │                                                  │
│  └── packages/                                      │
│      ├── db      (Prisma schema + migrations + seed)│
│      └── shared  (types, constants, permissions)    │
│                                                     │
│  Infrastructure:                                    │
│  ├── Database  → Supabase PostgreSQL                │
│  ├── Auth      → Supabase Auth                      │
│  ├── Storage   → Cloudflare R2                      │
│  ├── Email     → Resend                             │
│  └── Deploy    → Vercel                             │
└─────────────────────────────────────────────────────┘
```

---

## Step 1 — Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New project**
3. **Name**: `ziort-prod` (or `ziort-staging` for staging)
4. **Database password**: generate a strong password — save it securely
5. **Region**: `ap-south-1` (Mumbai) for India-first; choose nearest region
6. Click **Create new project**

### Get connection strings

After the project is ready (2-3 min):

1. Go to **Settings → Database → Connection string**
2. Copy **Transaction** (pooler, port 6543) → `DATABASE_URL`
3. Copy **Session** (direct, port 5432) → `DIRECT_URL`
4. Go to **Settings → API**
5. Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
6. Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
7. Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### Auth settings

1. Go to **Authentication → URL Configuration**
2. Set **Site URL**: `https://app.ziort.com` (or localhost for dev)
3. Add **Redirect URLs**: `https://app.ziort.com/auth/callback`, `http://localhost:5173/auth/callback`
4. Go to **Authentication → Email Templates** — customize if needed

---

## Step 2 — Create Cloudflare R2 Bucket

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. In the sidebar → **R2 Object Storage** → **Create bucket**
3. **Bucket name**: `ziort-prod`
4. **Region**: auto (Cloudflare picks nearest)
5. Click **Create bucket**

### Enable public access (for images)

1. Open the bucket → **Settings** tab
2. **R2.dev subdomain** → click **Allow Access**
3. Copy the public URL (e.g. `https://pub-XXXX.r2.dev`) → `R2_PUBLIC_URL`

### Create API token

1. R2 sidebar → **Manage R2 API Tokens** → **Create API Token**
2. **Token name**: `ziort-prod`
3. **Permissions**: Object Read & Write
4. **Bucket**: specific bucket → `ziort-prod`
5. Click **Create API Token**
6. Copy **Access Key ID** → `R2_ACCESS_KEY_ID`
7. Copy **Secret Access Key** → `R2_SECRET_ACCESS_KEY`
8. Copy **Account ID** (shown on R2 overview) → `R2_ACCOUNT_ID`

---

## Step 3 — Set Up Resend

1. Go to [resend.com](https://resend.com) → Create account
2. **Domains** → **Add Domain** → enter `ziort.com`
3. Add the DNS records shown (SPF, DKIM) to your DNS provider
4. Wait for verification (usually 5-30 min)
5. **API Keys** → **Create API Key**
6. Copy the key → `RESEND_API_KEY`

---

## Step 4 — Configure Environment

```bash
cd /path/to/ziort
cp .env.example .env.local
```

Fill in `.env.local` with all values from Steps 1-3.

---

## Step 5 — Run Database Setup

```bash
cd packages/db
npm install
npx prisma generate
npx prisma db push        # pushes full schema (55 tables) to fresh DB
npx tsx prisma/seed.ts    # seeds: countries, code prefixes, roles, permissions, configs
```

Expected seed output:
```
🌱 Seeding Ziort database...
  ✓ National ID configs
  ✓ Code sequences
  ✓ Permissions
  ✓ System roles
  ✓ Role-permission mappings
  ✓ Platform app configs

✅ Seed complete.
```

**Verification** — 55 tables, 6 countries, 31 code prefixes, 31 permissions, 5 roles, 7 configs.

For subsequent fresh environments (migrations already tracked):
```bash
cd packages/db && npx tsx scripts/setup.ts
```

---

## Step 6 — Start Development

From the monorepo root:

```bash
# Install all packages
npm install

# Generate Prisma client (after first setup)
npm run db:generate

# Start Next.js server (port 3000)
npm run dev:server

# In another terminal — start Vite SPA (port 5173)
cd ziort-web && npm run dev
```

---

## Step 7 — Deploy to Vercel

### API / Server (ziort-prod-server)

1. Go to [vercel.com](https://vercel.com) → Import project → `ziort/` directory
2. **Framework**: Next.js
3. **Root directory**: `.` (monorepo root of ziort/)
4. Add all environment variables from `.env.local`
5. Deploy

### Web SPA (ziort-prod-web)

1. Import `ziort-web/` as a separate Vercel project
2. **Framework**: Vite
3. Add env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`
4. Deploy

---

## Database Commands Reference

```bash
# From packages/db/

# View current schema in browser
npm run db:studio

# Create a new migration (dev only)
npx prisma migrate dev --name add_something

# Apply pending migrations (production-safe)
npx prisma migrate deploy

# Reset entire database (dev only — DESTROYS ALL DATA)
npm run db:reset

# Re-generate Prisma client after schema change
npm run db:generate

# Re-seed (safe — uses skipDuplicates)
npx tsx prisma/seed.ts

# Pull current DB schema (reverse-engineer)
npx prisma db pull
```

---

## Monorepo Commands Reference

```bash
# From ziort/ root

npm run dev          # All packages in parallel (watch mode)
npm run build        # Build everything in dep order
npm run type-check   # TypeScript check across all packages
npm run lint         # ESLint across all packages
npm run db:setup     # Full DB setup (generate + migrate + seed)
npm run db:studio    # Prisma Studio GUI
npm run db:reset     # Reset DB (dev only)
```

---

## Migrating from Zihive

Zihive used:
- NestJS (replaced by Next.js API routes)
- Prisma ORM with the old schema (`zh_*` table prefix)
- No storage, no billing engine, no product modules

Ziort has everything. Zihive can be **deleted** once you have confirmed:
- [ ] New Supabase project is set up (Step 1 above)
- [ ] `npm run db:setup` completed successfully  
- [ ] First entity created via `/api/v1/auth/setup`
- [ ] ZiPawn loans accessible and working
- [ ] R2 upload tested via ZiPawn item photo upload

---

## R2 Folder Structure

All files are stored under `entityId` for tenant isolation:

```
ziort-prod/
├── zpn-items/{entityId}/{timestamp}.jpg     # ZiPawn pledge item images
├── zi-kyc/{entityId}/{timestamp}.pdf        # KYC documents
├── zi-avatars/{entityId}/{timestamp}.jpg    # Profile photos
├── zi-entity/{entityId}/{timestamp}.png     # Entity logos
├── zipls-patients/{entityId}/{timestamp}.pdf # ZiPulse patient docs
├── znd-attachments/{entityId}/{timestamp}.pdf # ZiNeed attachments
└── receipts/{entityId}/{timestamp}.pdf      # Payment receipts
```
