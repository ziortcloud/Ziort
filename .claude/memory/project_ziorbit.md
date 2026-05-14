---
name: Ziort Project Context
description: Full architecture, folder structure, brand rename, all files built, deployment status — Ziort platform (formerly ZiOrbit)
type: project
originSessionId: 1a14e0b5-c2e2-46a5-a7f7-f45f7a1d0fb9
---
# Ziort Platform (formerly ZiOrbit — renamed 2026-05-11)

## Brand
- Platform name: **Ziort** (was ZiOrbit)
- Domain: **ziort.com** (bought 2026-05-11)
- All source files updated: ZiOrbit → Ziort, ziorbit.com → ziort.com
- Products keep their Zi prefix: ZiPawn, ZiFleet, ZiLoad, ZiDriver etc.

## Folder Structure (on Windows) — MONOREPO

Everything is now inside `ziort\` (single folder to open/deploy/git):
```
C:\Users\sakth\Downloads\Bala\stunning-winner\
  ziort\                ← MONOREPO ROOT (open this in VS Code)
    src\                ← Next.js 15 API backend
    supabase\           ← DB migrations + RUN_ALL_MIGRATIONS.sql
    web\                ← Vite + React SPA (was ziort-web\)
    mobile\             ← Flutter app (was ziort-mobile\)
    .claude\memory\     ← Project memory files (restore on new machine)
    vercel.json         ← API cron config
    package.json        ← Next.js package
    VERCEL_ENV_SETUP.md ← Full deployment + new-machine guide
  zibizcore\            ← Old reference UI (keep for UI patterns)
  ziort-web\            ← OLD — can delete (contents moved to ziort\web\)
  ziort-mobile\         ← OLD — can delete (contents moved to ziort\mobile\)
  ziorbit\              ← OLD — needs manual deletion (VS Code held lock)
```

**To clean up:** Delete `ziort-web\`, `ziort-mobile\`, and `ziorbit\` after closing VS Code.
**On new machine:** Copy only the `ziort\` folder — everything is inside it.

## Supabase Project
- Project ID: `jzkkxsvzunarysvurmtd`
- URL: `https://jzkkxsvzunarysvurmtd.supabase.co`
- Region: ap-south-1
- DB password: `9655976755Ziort`
- Anon key: in `ziort/.env.local` (long JWT starting eyJ...)
- Service role key: in `ziort/.env.local` (mark Sensitive in Vercel)

## Tech Stack
- **Backend**: Next.js 15 App Router, TypeScript, Supabase service-role client, Resend email, Cloudflare R2 storage
- **Frontend**: Vite + React 18, React Router v7, TanStack Query, Zustand persist, Framer Motion, Tailwind CSS, Sonner toasts
- **Mobile**: Flutter + Riverpod + Dio + supabase_flutter
- **Infra**: Vercel (two projects), Supabase (managed Postgres), Cloudflare R2
- **Email**: Resend — `noreply@ziort.com` — domain verification still needed at resend.com

## Core Rule
No RPCs. All data via `/api/v1/*` REST routes. Service-role client in API. Browser Supabase client for auth only.

## Core Entities
- **Individual** = person with login
- **Entity** = a business (pawnshop, fleet company, etc.)
- **Subscription** = Entity's subscription to one product (product_code e.g. 'ZPN')
- **activeSubscriptions** = list of trial/active/grace subscriptions for the active entity

## Product Codes (all 20 — ZDR added this session)
```
ZPN   ZiPawn     ZPLS  ZiPulse   ZND   ZiNeed    ZFLT  ZiFleet
ZLD   ZiLoad     ZDR   ZiDriver  ZFD   ZiFood    ZCR   ZiCare
ZSHP  ZiShop     ZCHT  ZiChit    ZBLD  ZiBuild   ZYLD  ZiYield
ZPST  ZiPost     ZSCN  ZiScan    ZCLC  ZiCalc    ZRCP  ZiReceipt
ZNVC  ZiInvoice  ZQT   ZiQuote   ZLDG  ZiLedger  ZPRTN ZiPartner
```

## Auth Flow
Supabase JWT → `Authorization: Bearer <token>` → Next.js API
- Dev: `VITE_API_URL=` (empty) → Vite proxies `/api` → `localhost:3000`
- Prod: `VITE_API_URL=https://api.ziort.com`
- Session stored in Zustand (key: `zi-session`) with localStorage persist
- `loadSession()` only clears session on HTTP 401/403, NOT on network errors (ECONNREFUSED)

## Theme Colors (tailwind.config.ts)
```
orbit-midnight: #0d0e14   orbit-deep: #13151f   orbit-navy: #1c1e2e
zi-blue: #6d6ade          zi-cyan: #38bdf8      zi-gold: #f59e0b
zi-white: #e2e8f0         zi-muted: #64748b
```
CSS class names like `orbit-midnight` were intentionally NOT renamed (internal design tokens).

---

## ziort/web — Frontend Structure (was ziort-web/)

```
src/
  core/
    supabase.ts              Supabase browser client
    api/client.ts            Axios + Bearer interceptor + apiGet/apiPost/apiPatch/apiDelete
    auth/AuthProvider.tsx    Supabase auth context + session loader
    store/session.ts         Zustand persist — loadSession() fixed to not clear on network errors
    types/core.ts            ZiSession, ZiEntity, ZiSubscription, ProductCode (includes ZDR now)
  components/
    Logo.tsx                 Ziort logo component
    SpaceBackground.tsx      Animated star background
    ErrorBoundary.tsx
  pages/
    landing/
      LandingPage.tsx        Public marketing — 19 product grid + detail panel
                             AuthPromptCard stores product intent in localStorage('zi_product_intent')
                             "Start Free Trial" → localStorage.setItem + navigate('/register')
      ZiPawnProductPage.tsx  ZiPawn dedicated product page
      ProductPage.tsx        Generic product page
      StaticPages.tsx        About, Contact, Privacy, Terms
    auth/
      LoginPage.tsx
      RegisterPage.tsx
      VerifyPage.tsx
      SetupProfilePage.tsx   entity_type values: sole_proprietor/company/partnership/trust/individual
    hub/
      ProductHubPage.tsx     REDESIGNED — see Hub section below
    zipawn/layout+pages      ZiPawnLayout, ZiPawnSidebar, ZiPawnTopbar + all ZiPawn pages
    zifleet/layout+pages     ZiFleetLayout, ZiFleetSidebar + Dashboard, Vehicles, Drivers,
                             Trips, TripDetail, NewTrip, Maintenance
    ziload/layout+pages      ZiLoadLayout, ZiLoadSidebar + Dashboard, LoadBoard, MyLoads,
                             Trucks, MyTrucks, Bookings, BookingDetail, RateCards, Profile
    zidriver/layout+pages    ZiDriverLayout, ZiDriverSidebar + Profile, Availability,
                             Documents, Discover, Engagements, EngagementDetail
```

## Hub Page (ProductHubPage.tsx) — Redesigned
- **New users (0 subscriptions)**: Onboarding screen with 4 large `TrialCard` components
  for the 4 available products (ZiPawn, ZiFleet, ZiLoad, ZiDriver)
- **Returning users**: Primary product + others + "Add more products" row + coming soon section
- `activateTrial(product)`: calls `POST /entities/:entityId/subscriptions { product_code, plan_type: 'trial' }`
  → `loadSession()` → `navigate(product.href)`
- On mount: reads `localStorage('zi_product_intent')` → auto-activates if set by landing page
- Coming soon section: 16 remaining products shown as collapsed small chips

## Products with Full Frontend (available: true)
| Product | Code | Route | Color |
|---------|------|-------|-------|
| ZiPawn  | ZPN  | /zipawn  | Indigo |
| ZiFleet | ZFLT | /zifleet | Orange |
| ZiLoad  | ZLD  | /ziload  | Emerald |
| ZiDriver| ZDR  | /zidriver| Purple |

## Bugs Fixed This Session
1. **ZiFleetLayout**: was checking `s.product_code === 'ZFT'` — fixed to `'ZFLT'`
2. **ZDR missing from ProductCode type** — added to `core/types/core.ts`
3. **ZiDriver missing from hub PRODUCTS array** — added with full definition
4. **Session cleared on network error** — `loadSession()` now only clears on 401/403

---

## ziort/src — Backend Structure (Next.js API at monorepo root)

```
src/
  app/
    api/v1/
      auth/          register, login, confirm, setup, session, forgot-password
      entities/      CRUD + members, branches, subscriptions
      entities/[entityId]/
        zipawn/[subscriptionId]/    customers, loans, tickets, schemes, dashboard
        zifleet/[subscriptionId]/   vehicles, drivers, trips (full CRUD + status + fuel + expenses)
        ziload/[subscriptionId]/    loads, trucks, bookings, rate-cards, profile
        zidriver/[subscriptionId]/  profile, availability, documents, engagements, discover, hire
        zicare/  zichit/  zifood/  ziinvoice/  ziledger/  zineed/
        zipartner/  zipost/  zipulse/  ziquote/  zireceipt/  ziscan/
        zishop/  ziyield/  zibuild/  zicalc/
      billing/cron/  daily-deduct (Vercel cron: 31 18 * * *)
      storage/upload
      track/[token]
  ziorbitcore/       Internal shared module — auth session, DB client, email, billing, audit
                     (folder name intentionally NOT renamed — internal import paths)
```

## vercel.json (ziort — backend)
```json
{ "crons": [{ "path": "/api/v1/billing/cron/daily-deduct", "schedule": "31 18 * * *" }] }
```
Billing cron deducts subscription fees daily at 18:31 UTC.

## vercel.json (ziort-web — frontend) — NEW this session
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```
Required for Vite SPA on Vercel — all routes serve index.html.

---

## Database Migrations
All 24 migrations in `ziort/supabase/migrations/` — combined into one file:
`ziort/supabase/RUN_ALL_MIGRATIONS.sql`

**Status: NOT YET RUN IN PRODUCTION** (as of 2026-05-11)
Run this in Supabase SQL Editor once before first deployment.

| # | Migration | Tables |
|---|-----------|--------|
| 001 | core_schema | zi_individuals, zi_entities, zi_memberships, zi_subscriptions |
| 002 | code_sequences | code generation functions |
| 003 | billing | zi_billing_ledger, billing functions |
| 004 | audit | zi_audit_log |
| 005–024 | product schemas | One per product — all Zi prefixed tables + RLS |

---

## Deployment Plan (NOT YET DONE as of 2026-05-11)

### Two Vercel Projects from same repo:
1. **ziort-api** → same repo, Root Directory: `/` → domain `api.ziort.com`
2. **ziort-web** → same repo, **Root Directory: `web`** → domains `ziort.com` + `app.ziort.com`

### DNS records for ziort.com:
| Type | Name | Value |
|------|------|-------|
| A | @ | 76.76.21.21 |
| CNAME | www | cname.vercel-dns.com |
| CNAME | app | cname.vercel-dns.com |
| CNAME | api | cname.vercel-dns.com |
| TXT/MX | (from Resend) | for noreply@ziort.com email sending |

### Key env vars for production:
- `VITE_API_URL=https://api.ziort.com` (in ziort-web Vercel project)
- `NEXT_PUBLIC_APP_URL=https://api.ziort.com` (in ziort Vercel project)
- `RESEND_FROM_EMAIL=noreply@ziort.com`
- All secrets in `ziort/.env.local` — paste into Vercel env vars (mark Sensitive)

Full guide: `ziort/VERCEL_ENV_SETUP.md`

---

## Supabase Auth Settings (NOT YET DONE)
- Site URL → `https://ziort.com`
- Redirect URLs → `https://ziort.com/**`, `https://app.ziort.com/**`, `http://localhost:5173/**`
- Email templates → replace ZiOrbit → Ziort
- SMTP from → `noreply@ziort.com`

---

## Cloudflare R2 Storage
- Account ID: `73f201c58abe31064cb5c657ca13c16a`
- Bucket: `Ziort1`
- Public URL: `https://pub-90125e37d4424a689ad51a7f84b21916.r2.dev`

---

## Session on New System
When setting up on a new machine:
1. Copy only the `ziort\` folder — everything is inside it (monorepo)
2. Restore Claude memory: copy `ziort\.claude\memory\*` → `C:\Users\<you>\.claude\projects\c--Users-<you>-Downloads-Bala-stunning-winner\memory\`
3. `cd ziort && npm install`
4. `cd ziort\web && npm install`
5. Copy `.env.local` to `ziort\` and `ziort\web\` (gitignored — keep secure backup)
6. Start API: `cd ziort && npm run dev` (port 3000)
7. Start Web: `cd ziort\web && npm run dev` (port 5173)
8. VS Code: open `stunning-winner\` as workspace root
