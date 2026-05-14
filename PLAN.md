# Ziort — Build Plan & Status
*Updated: 2026-05-13*

## What It Is
Global multi-tenant SaaS platform (ziort.com) — 20 business verticals interconnected, multi-country, multi-language, multi-currency. Replaces ZibizCore (zibiz.in) product by product.

## Stack
| Layer | Tech |
|-------|------|
| API | Next.js 15 App Router API routes + Prisma 6 |
| Web | Vite React (ziort-web/) |
| Mobile | Flutter (ziort-mobile/) |
| DB | Supabase PostgreSQL (`yuvrfkufqtewwyolqabi`) Mumbai |
| Storage | Cloudflare R2 (`Ziort1` bucket) |
| Email | Resend (noreply@ziort.com) |
| ORM | Prisma — 55 tables, all 20 products modeled |
| Monorepo | Turborepo |

## Monorepo Structure
```
ziort/
├── apps/
│   ├── server/   (Next.js 15 — api.ziort.com)
│   ├── web/      (Vite React — app.ziort.com)
│   └── mobile/   (Flutter — iOS/Android)
└── packages/
    ├── db/       (Prisma schema 1574 lines + seed + setup)
    └── shared/   (types, constants, permissions, product catalog)
```

## Core Foundation — BUILT ✓
| Item | Status |
|------|--------|
| Turborepo monorepo setup | ✓ |
| Prisma schema (55 tables, all 20 products) | ✓ |
| Seed: 6 countries, 31 code sequences, 31 permissions, 5 roles, 7 configs | ✓ |
| Auto-setup script (`packages/db/scripts/setup.ts`) | ✓ |
| `packages/shared` — types, constants, products, permissions | ✓ |
| App-config service (scope fallback chain) | ✓ |
| Notifications service (in-app, broadcast, prune) | ✓ |
| RBAC service (roles, permissions, owner bypass) | ✓ |
| Storage service (Cloudflare R2) | ✓ |
| Auth API — register, login, session, setup, confirm, forgot-password | ✓ |
| API routes: /app-config, /notifications, /roles, /branches, /members, /subscriptions | ✓ |
| ZiPawn API — loans, payments, tickets, schemes, dashboard, customers | ✓ |
| ZiFleet API — vehicles, trips, drivers, maintenance | ✓ |
| ZiLoad API — loads, trucks, bids, bookings, rate-cards | ✓ |
| ZiDriver API — profile, engagements, docs, availability, ratings | ✓ |
| ZiPulse API — contacts, appointments, meetings, enquiries, patients | ✓ |
| ZiCare API — doctors, appointments, patients, enquiries | ✓ |
| ZiChit API — chits, members, contributions, auctions, pigmy | ✓ |
| ZiNeed API — requirements, proposals, deals, ratings | ✓ |
| ZiInvoice API — invoices, items, payments, send | ✓ |
| ZiQuote API — quotes, items, convert, accept, send | ✓ |
| ZiLedger API — accounts, vouchers, GST, reports | ✓ |
| ZiShop API — products, categories, bills, customers, stock | ✓ |
| ZiFood API — menu, tables, orders, payments | ✓ |
| ZiReceipt, ZiPost, ZiScan, ZiBuild, ZiPartner, ZiCalc, ZiYield APIs | ✓ |
| Import paths fixed: @/Ziortcore → @/ziorbitcore (212 files) | ✓ |
| TypeScript clean: 0 logic errors | ✓ |
| `.env.local` — all credentials configured | ✓ |
| `SETUP.md` — provisioning guide | ✓ |

## Core Foundation — NEEDS BUILD ⬜
| Item | Priority |
|------|---------|
| Auth API (`/api/v1/auth/*`) — signup, OTP verify, session | HIGH |
| Entity setup (`/api/v1/auth/setup`) — first entity creation | HIGH |
| Member invite + role assignment API | HIGH |
| Subscription gating middleware | HIGH |
| Billing/wallet API | MEDIUM |
| Ziort web landing page + onboarding flow | MEDIUM |

## Product Migration Order (ZibizCore → Ziort)

### Priority 1 — ZiPawn (code: ZPN)
**Why first**: Most mature in ZibizCore (40+ SQL migrations), most business-critical (pawnbroking loans).

**Prisma models ready**: ZpnScheme, ZpnLoan, ZpnLoanItem, ZpnTicket, ZpnPayment ✓

**Needs build**:
- [ ] Loan create/migrate API (`POST /api/v1/entities/:id/zpn/loans`)
- [ ] Interest calculator — flat rate + reducing balance
- [ ] Penalty calculator (H_001 standardization from ZibizCore)
- [ ] Closure date validation (H_004 from ZibizCore)
- [ ] Payment record API
- [ ] Partial release ticket API
- [ ] Closure / foreclosure API
- [ ] Customer-facing loan view
- [ ] Receipt PDF via R2
- [ ] Daily interest + penalty accrual cron
- [ ] Scheme management API
- [ ] ZiPawn reports API (aging, portfolio summary)
- [ ] Ziort web — ZiPawn beta dashboard
- [ ] Ziort web — Loan creation form

**Beta gate**: All above complete + 2-week parallel test vs ZibizCore ZiPawn

### Priority 2 — ZiChit (code: ZCHT)
**Why second**: Schema just added in ZibizCore (139_zichit_schema), minimal logic = clean-slate build in Ziort.

**Prisma models ready**: ZchtFund, ZchtMember, ZchtAuction ✓

**Needs build**: Chit fund CRUD, member management, auction recording, installment tracking, dividend calc, reports

### Priority 3 — Logistics Cluster (ZiFleet + ZiLoad + ZiDriver)
Interconnected: drivers → loads → fleet vehicles. Build together.

### Priority 4 — Health Cluster (ZiPulse + ZiCare)
Medical appointments + patient care records.

### Priority 5 — Commerce Cluster (ZiFood + ZiShop + ZiNeed)
Retail and marketplace.

### Priority 6 — Finance Cluster (ZiInvoice + ZiQuote + ZiReceipt + ZiLedger)
Document generation.

### Priority 7 — Utility Cluster (ZiPost + ZiScan + ZiYield + ZiBuild + ZiPartner + ZiCalc)

## Migration Rule (every product)
1. Audit ZibizCore → map every RPC/service to Ziort Prisma model + API route
2. Build in Ziort (Prisma only, no raw SQL)
3. Deploy under `/beta` route flag in Ziort web
4. Run parallel with ZibizCore for 2 weeks
5. Promote → retire from ZibizCore

## Env Credentials
| Key | Value |
|-----|-------|
| Supabase project | `yuvrfkufqtewwyolqabi` |
| DB password | `B@1a2252supabase` (URL-encoded: `B%401a2252supabase`) |
| R2 account | `73f201c58abe31064cb5c657ca13c16a` |
| R2 bucket | `Ziort1` |
| R2 public URL | `https://pub-90125e37d4424a689ad51a7f84b21916.r2.dev` |
| Resend | `re_2hmv4kvv_EBC9L16pZGD84wFvCK4QyjMx` |

## Key Commands
```bash
# From ziort/packages/db/
npx tsx scripts/setup.ts        # full setup (generate + migrate + seed)
npx prisma studio               # browse DB
npx prisma migrate dev --name X # create new migration

# From ziort/ root
npm run dev:server              # Next.js on :3000
npm run db:generate             # regenerate Prisma client
npm run type-check              # TS check all packages
```

## Non-Negotiable Rules
1. Beta first — every feature/product deploys under beta flag before promoting
2. ZibizCore stays live until each product is fully migrated
3. All money in BigInt paise (₹1 = 100)
4. Permission check on every API route
5. No raw SQL — Prisma ORM only
