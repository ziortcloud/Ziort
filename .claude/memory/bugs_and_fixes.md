---
name: Key Bugs and Fixes
description: Root causes of bugs found and fixed — avoid repeating these mistakes
type: feedback
---

# Bugs Found and Fixed

## 1. ZiFleetLayout wrong product code
**Bug:** `ZiFleetLayout.tsx` checked `s.product_code === 'ZFT'` → always redirected to hub
**Fix:** Changed to `'ZFLT'`
**Why:** Product code in the hub PRODUCTS array was `'ZFLT'` but layout used `'ZFT'` — typo at build time
**How to apply:** When building any new product layout, double-check the product_code string matches exactly what's in the PRODUCTS array and DB

## 2. Session wiped on network error (stars-only screen)
**Bug:** When Next.js API was unreachable, `loadSession()` caught the ECONNREFUSED error and called `set({ session: null })` — wiping the Zustand persisted session. `RequireProfile` then saw no session → redirected to `/setup` which has `SpaceBackground` → user sees only stars.
**Fix:** `loadSession()` now only clears session on HTTP 401 or 403 (`err?.response?.status`). Network errors have no `response` so session is preserved.
**File:** `ziort-web/src/core/store/session.ts`
**How to apply:** Never clear persisted auth state on network errors — only on explicit auth rejections

## 3. SetupProfilePage wrong entity_type values
**Bug:** Setup form sent `entity_type: 'pawnshop'` etc. → Supabase returned 500 due to DB CHECK constraint
**Fix:** Changed entity type options to match the DB CHECK constraint exactly:
`sole_proprietor | company | partnership | trust | individual`
**File:** `ziort-web/src/pages/auth/SetupProfilePage.tsx`
**How to apply:** Always check DB CHECK constraints before building dropdown options

## 4. ZDR product code missing from TypeScript union
**Bug:** `ProductCode` type in `core/types/core.ts` had 19 codes but was missing `'ZDR'` (ZiDriver)
**Fix:** Added `'ZDR'` to the union type
**How to apply:** When adding a new product, update: (1) ProductCode type, (2) hub PRODUCTS array, (3) layout file product_code check, (4) App.tsx routes

## 5. Brand rename missed SQL files
**Bug:** PowerShell bulk replace included `*.ts *.tsx *.html *.json *.md` but NOT `*.sql` — all 25 SQL migration files still had "ZiOrbit"
**Fix:** Ran separate pass including `*.sql`
**How to apply:** When doing brand/text renames, always include SQL files explicitly

## 6. Domain casing in URLs after brand replace
**Bug:** Bulk replace of `ZiOrbit` → `Ziort` turned `https://app.ziorbit.com` into `https://app.Ziort.com` (capital Z in domain — invalid)
**Fix:** Ran separate replace for `Ziort.com` → `ziort.com` in URL contexts
**How to apply:** After brand renaming, grep for `Ziort\.com` and ensure all domain occurrences are lowercase

## 7. VS Code folder lock prevents rename
**Bug:** `Rename-Item` on `ziorbit\` folder fails with "Access denied" because VS Code file watcher holds a handle
**Workaround:** Used `robocopy` to copy to `ziort\` (excluding node_modules + .next), then instructed user to manually delete `ziorbit\` after closing VS Code
**How to apply:** When renaming a folder that VS Code has open, always use copy+delete strategy, never direct rename

## 8. Vite SPA on Vercel needs rewrite rule
**Bug:** Without `vercel.json`, Vercel serves 404 for any route other than `/` because there's no `index.html` at those paths
**Fix:** Created `ziort-web/vercel.json` with `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`
**How to apply:** Every Vite/React SPA deployed to Vercel needs this rewrite rule

## 9. Hub "Coming soon" cards had no click handler
**Bug:** `ExploreCard` component in `ProductHubPage.tsx` was `cursor-default` with no click — users couldn't start a trial
**Fix:** Replaced with `TrialCard` and `TrialCardSmall` components that call `activateTrial()` → `POST /entities/:id/subscriptions { product_code, plan_type: 'trial' }` → `loadSession()` → navigate
**How to apply:** Trial activation flow: apiPost to subscriptions → loadSession() to refresh Zustand → navigate to product
