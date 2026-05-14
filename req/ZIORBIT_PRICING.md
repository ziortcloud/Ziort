# ZiOrbit Pricing Model — Complete Reference

## Overview

ZiOrbit uses a **per-product, per-user, per-branch** pricing model.
Simple formula. No confusion. Customer can calculate on paper.

---

## Core Pricing Formula

```
Daily Cost =
  (Products × ₹10)
+ (Extra Users × ₹5)
+ (Max(0, Branches - Users) × ₹5)
+ Notification Credits (prepaid top-up)
```

### What's Always Included in Base ₹10/day
- 1 product (full features)
- 1 admin user
- 1 branch/location
- Unlimited records
- Basic reports
- Data export

---

## The 3 Axes

### Axis 1 — Product
| Unit | Price |
|------|-------|
| Per product subscribed | ₹10/day |
| Per product / month | ₹300/month |
| Per product / year (annual) | ₹2,500/year (save 2 months) |

- Each product is an independent subscription
- Each product has its own 6-month free trial
- Trials are independent — start ZiPawn today, trial ZiFleet next month
- Bundle discounts apply when subscribing to multiple products (see below)

---

### Axis 2 — Users
| Unit | Price |
|------|-------|
| 1st user (admin/owner) | Included in ₹10 |
| Each additional user | ₹5/user/day |
| Each additional user / month | ₹150/user/month |

- Users are counted per product
- Each user gets their own login
- Role-based access: Owner, Manager, Staff
- Users can be assigned to specific branches

---

### Axis 3 — Branches
| Condition | Charge |
|-----------|--------|
| Branches ≤ Users | FREE — no extra charge |
| Branches > Users | ₹5/day per extra branch |

#### Branch Rule (Critical Logic)
```
Free branches = number of users
Extra branches = max(0, total_branches - total_users)
Branch charge = extra_branches × ₹5/day
```

#### Branch Rule Examples
| Users | Branches | Extra Branches | Branch Charge |
|-------|----------|----------------|---------------|
| 1 | 1 | 0 | ₹0 |
| 1 | 2 | 1 | ₹5/day |
| 2 | 2 | 0 | ₹0 |
| 3 | 3 | 0 | ₹0 |
| 3 | 4 | 1 | ₹5/day |
| 3 | 6 | 3 | ₹15/day |
| 5 | 5 | 0 | ₹0 |
| 2 | 5 | 3 | ₹15/day |

#### Why This Rule Exists
- Every user can "cover" one branch in normal operations
- 2 users running 2 branches = normal, no charge
- 1 user maintaining 2 branches = extra branch is being used without a person = chargeable
- Rewards businesses for hiring staff — team growth = more free branches

---

## Plans Per Product

### Trial Plan
- Price: Free
- Duration: 6 months per product
- Features: Full product, all features
- Users: 1 admin
- Branches: 1
- Notifications: Not included
- Card required: No
- After trial: Read-only mode, data safe, upgrade to continue

### Solo Plan
- Price: ₹10/day per product (₹300/month)
- Users: 1 included, +₹5/day per extra user
- Branches: 1 included free (branch rule applies)
- Notifications: Add-on (prepaid credits)
- Support: Standard
- Annual: ₹2,500/year (save ₹600)

### Plus Plan
- Price: ₹20/day per product (₹600/month)
- Users: Up to 5 included
- Branches: Up to 5 free (branch rule applies beyond 5 users)
- Notifications: Basic credits included
- Support: Priority
- Annual: ₹5,000/year (save ₹1,200)
- Extras: Role-based access, activity logs

### Pro Plan
- Price: ₹35/day per product (₹1,050/month)
- Users: Unlimited
- Branches: Unlimited (branch rule not applicable — users unlimited)
- Notifications: Credits included
- Support: Dedicated
- Annual: ₹8,700/year (save ₹2,100)
- Extras: API access, custom reports, webhooks

---

## Bundle Discount (Multiple Products)

Auto-applied when subscribing to multiple products. No codes needed.

| Products | Discount | Daily Rate Each | Example (2 products) |
|----------|----------|-----------------|----------------------|
| 1 | 0% | ₹10/day | ₹10/day |
| 2 | 5% | ₹9.50/day | ₹19/day |
| 3 | 10% | ₹9/day | ₹27/day |
| 4 | 15% | ₹8.50/day | ₹34/day |
| 5+ | 20% | ₹8/day | ₹40/day |

Bundle discount applies to the base product price only.
User and branch add-ons are not discounted.

---

## Notification Add-ons (Prepaid Credits)

Credits never expire. Auto-recharge available.

| Channel | Per Unit | Starter Pack |
|---------|----------|--------------|
| SMS | ₹0.15/msg | ₹150 = 1,000 SMS |
| WhatsApp | ₹0.30/msg | ₹150 = 500 msgs |
| Email | ₹0.02/email | ₹100 = 5,000 emails |
| Bundle Pack | — | ₹299 = SMS + WA + Email combo |

Low balance alert at 20% remaining.
Auto-recharge triggers at 10% remaining (optional).

---

## Annual Plan

Pay for 10 months, get 12. 2 months free per product.

| Plan | Monthly | Annual | Saving |
|------|---------|--------|--------|
| Solo | ₹300/mo | ₹2,500/yr | ₹600 |
| Plus | ₹600/mo | ₹5,000/yr | ₹1,200 |
| Pro | ₹1,050/mo | ₹8,700/yr | ₹2,100 |

Annual plan is per product. Cancel anytime — no penalty.

---

## Billing System

- Billing cycle: Monthly (default) or Annual
- Payment wallet: Prepaid — customer loads credits
- Deduction: Daily rate × 30 deducted on billing date
- Payment methods: UPI, UPI AutoPay, Card, Net Banking
- Low balance alert: Sent at 20% wallet balance
- Auto-recharge: Optional UPI mandate
- Failed payment: 3-day grace period, then read-only mode
- Data retention: 90 days after payment failure before deletion warning

---

## Real Cost Examples

### Single Product Users

| Scenario | Products | Users | Branches | Daily | Monthly |
|----------|----------|-------|----------|-------|---------|
| Solo pawn shop owner | ZiPawn | 1 | 1 | ₹10 | ₹300 |
| Pawn shop + 2 staff | ZiPawn | 3 | 3 | ₹20 | ₹600 |
| Pawn shop + 2 staff + 4 branches | ZiPawn | 3 | 4 | ₹25 | ₹750 |
| Solo owner, 2 branches | ZiPawn | 1 | 2 | ₹15 | ₹450 |

### Multi-Product Users

| Scenario | Products | Users | Branches | Daily | Monthly |
|----------|----------|-------|----------|-------|---------|
| Fleet + Load operator | ZiFleet + ZiLoad | 1 | 1 | ₹19 | ₹570 |
| Restaurant + Ledger, 3 staff | ZiFood + ZiLedger | 4 | 4 | ₹38+₹15 | ₹1,590 |
| Multi-business, 4 products | 4 products | 2 | 2 | ₹34 | ₹1,020 |
| Chain, 3 products, 5 staff, 6 branches | 3 products | 6 | 6 | ₹27+₹25 | ₹1,560 |

---

## Daily Cost Calculator Logic (for frontend/backend)

```javascript
function calculateDailyCost({
  products,        // array of subscribed products
  planType,        // 'solo' | 'plus' | 'pro'
  extraUsers,      // users beyond plan inclusion
  totalBranches,   // total branch count
  totalUsers,      // total user count (included + extra)
  isAnnual,        // boolean
  notifCredits     // optional prepaid top-up
}) {

  // 1. Base product price with bundle discount
  const productCount = products.length;
  const discount = productCount >= 5 ? 0.20
                 : productCount === 4 ? 0.15
                 : productCount === 3 ? 0.10
                 : productCount === 2 ? 0.05 : 0;

  const basePricePerProduct = 10 * (1 - discount);
  const productCost = productCount * basePricePerProduct;

  // 2. Extra users cost
  const userCost = extraUsers * 5;

  // 3. Branch cost — only if branches > users
  const extraBranches = Math.max(0, totalBranches - totalUsers);
  const branchCost = extraBranches * 5;

  // 4. Total daily
  const dailyTotal = productCost + userCost + branchCost;

  // 5. Monthly / Annual
  const monthly = dailyTotal * 30;
  const annual = isAnnual ? monthly * 10 : monthly * 12;

  return {
    productCost,
    userCost,
    branchCost,
    extraBranches,
    dailyTotal,
    monthly,
    annual,
    discount: discount * 100
  };
}
```

---

## Supabase Schema Notes

### Tables Required

```sql
-- Subscriptions
subscriptions (
  id uuid primary key,
  tenant_id uuid,           -- business owner
  product_id text,          -- e.g. 'zipawn', 'zifleet'
  plan_type text,           -- 'trial' | 'solo' | 'plus' | 'pro'
  status text,              -- 'trial' | 'active' | 'paused' | 'cancelled'
  trial_start date,
  trial_end date,
  billing_start date,
  is_annual boolean default false,
  created_at timestamptz default now()
)

-- Branch registrations per subscription
branches (
  id uuid primary key,
  subscription_id uuid references subscriptions(id),
  tenant_id uuid,
  name text,
  location text,
  is_active boolean default true,
  created_at timestamptz default now()
)

-- Users per subscription
subscription_users (
  id uuid primary key,
  subscription_id uuid references subscriptions(id),
  user_id uuid,
  role text,                -- 'owner' | 'manager' | 'staff'
  branch_id uuid,           -- assigned branch (nullable = all branches)
  created_at timestamptz default now()
)

-- Billing wallet
wallet (
  id uuid primary key,
  tenant_id uuid unique,
  balance_paise integer default 0,  -- store in paise (₹1 = 100 paise)
  auto_recharge boolean default false,
  recharge_threshold_paise integer default 1000,
  created_at timestamptz default now()
)

-- Daily billing log
billing_log (
  id uuid primary key,
  tenant_id uuid,
  subscription_id uuid,
  date date,
  product_cost integer,     -- in paise
  user_cost integer,
  branch_cost integer,
  total integer,
  created_at timestamptz default now()
)

-- Notification credits
notification_credits (
  id uuid primary key,
  tenant_id uuid,
  channel text,             -- 'sms' | 'whatsapp' | 'email'
  credits integer,          -- remaining credits
  updated_at timestamptz default now()
)
```

---

## Pricing Display Rules (UI)

- Always show price as **₹X/day** — feels cheaper
- Show monthly equivalent in smaller text below
- Annual savings shown in green
- Branch rule explained simply: *"Extra branches charged only if branches exceed your team size"*
- Calculator on pricing page so customer sees exact cost before signup
- No surprises — show itemized breakdown: product + users + branches

---

## Trial Rules

- Each product has its own independent 6-month trial
- Trial starts on first login to that product
- Trial includes all features (no feature gating during trial)
- No credit card required during trial
- At trial end: read-only mode (data safe, no deletion)
- Customer can restart trial on a different product at any time
- One trial per product per tenant (no repeat trials)

---

## ZiPartner Commission on Pricing

ZiPartner agents earn 20% of the monthly subscription revenue they refer.

| Customer Monthly Bill | Agent Earns |
|-----------------------|-------------|
| ₹300 (solo, 1 product) | ₹60/month |
| ₹600 (plus or 2 products) | ₹120/month |
| ₹1,500 | ₹300/month |
| ₹3,000 | ₹600/month |

Commission paid monthly as long as customer remains active.
Agent dashboard shows: active referrals, monthly earnings, payout history.

---

## Key Business Rules Summary

1. Base price: ₹10/day per product
2. Extra users: ₹5/day per user beyond plan inclusion
3. Branch rule: Free if branches ≤ users. Charge ₹5/day per extra branch if branches > users
4. Bundle discount: Auto-applied for 2+ products (5% to 20%)
5. Trial: 6 months free per product, independent per product
6. Annual: Pay 10 months, get 12 (2 months free)
7. Notifications: Prepaid credits, never expire
8. Billing: Prepaid wallet, monthly deduction
9. No lock-in: Cancel anytime, data safe for 90 days
10. ZiPartner: 20% recurring commission on referred customers

---

*Last updated: May 2026*
*Version: 1.0*
*Brand: ZiOrbit (ziorbit.com)*
