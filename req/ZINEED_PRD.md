# ZiNeed — Complete Product Requirements Document
## Business Requirement Marketplace for ZiOrbit

**Product Name:** ZiNeed
**Product Code:** ZND
**Tagline:** Post your need. The right supplier finds you.
**Platform:** ZiOrbit (ziorbit.com)
**Document Version:** 1.0
**Status:** Draft — Ready for Claude Code Implementation
**Read Before:** Any ZiNeed schema, feature, UI, revenue, or integration work

---

## 1. PRODUCT VISION

### 1.1 What ZiNeed Is

ZiNeed is ZiOrbit's closed-loop business requirement marketplace.
It is the engine that connects every business need with the right supplier — automatically, intelligently, and profitably.

Any business — whether a ZiOrbit user or a public guest — can post what they need.
Verified suppliers receive instant notifications and submit proposals.
The requester selects the best proposal.
ZiNeed handles escrow, delivery tracking, ratings, and commission — automatically.

ZiOrbit earns on every completed deal. Suppliers pay to be listed. Agents earn for closing deals.

### 1.2 What ZiNeed Is NOT

```
NOT a classified listing site (like OLX)
NOT a directory of suppliers (like JustDial)
NOT a consumer marketplace (like Amazon)
NOT a tender board (like government procurement)
NOT a supplier-first platform

IT IS:
→ A REQUESTER-FIRST marketplace
→ A closed-loop deal engine (post → match → escrow → deliver → pay)
→ A hyperlocal + scalable B2B requirement fulfillment system
→ An automated revenue engine for ZiOrbit
→ The nervous system connecting all ZiOrbit vertical products
→ A network that gets more valuable with every new user
```

### 1.3 The Core Problem It Solves

Every business has needs. Every day.

```
A kirana owner needs 50kg rice urgently
A clinic needs a locum doctor for 3 days
A factory needs 3 trucks by Monday
A restaurant needs a refrigerator repair today
A construction site needs 20 labourers tomorrow
A startup needs a CA for GST filing
A pawn shop needs a gold appraiser this week
```

Today they solve this by:
```
→ Calling 10 contacts one by one
→ Asking in WhatsApp groups
→ Browsing JustDial (outdated, unverified)
→ Posting on social media (no business outcome)
→ Waiting for someone to refer them
```

**Result:** Wasted time. Wrong supplier. Bad price. No accountability.

**ZiNeed solves this in 60 seconds:**
```
Post requirement → verified suppliers notified instantly →
proposals received → best selected → escrow holds payment →
work done → payment released → both sides rated
```

### 1.4 Why ZiNeed Is ZiOrbit's Most Powerful Revenue Product

```
Every Zi-app solves one vertical problem.
ZiNeed solves a UNIVERSAL problem —
every business needs something from another business, every day.

A ZiPawn user, ZiFleet user, ZiFood user, and ZiCare user
ALL benefit from the same ZiNeed marketplace.

One product. Infinite use cases. Compounding network value.
More users = more requirements = more suppliers = more deals = more revenue.
The network grows itself.
```

### 1.5 Taglines

```
Primary:  "Post your need. The right supplier finds you."
Short:    "Every business need. Fulfilled."
Action:   "Post. Match. Deal. Done."
B2B:      "Your requirement. The right supplier. Every time."
Network:  "One marketplace. Every business need. Every supplier."
```

---

## 2. THE 4 PLAYERS

### 2.1 Requester
```
WHO:    Any business or individual with a need
TYPE:   ZiOrbit user (auto-linked) OR public guest (OTP only)
COST:   Free to post. Always.
EARNS:  Nothing — they receive the value of fulfillment
ACCESS: Web (ziorbit.com/need) + ZiOrbit app + auto-posted by ZiOrbit apps
```

### 2.2 Supplier
```
WHO:    Registered provider who fulfills requirements
TYPE:   Guest (free) → Basic → Pro → Featured (paid tiers)
COST:   Monthly listing rental (₹0 to ₹1,999/month by tier)
EARNS:  Deal amount minus ZiOrbit commission
VERIFY: Business ID + national ID hash for verified badge
```

### 2.3 ZiPartner Agent
```
WHO:    ZiOrbit's field distribution agents
ROLE:   Introduce suppliers to ZiNeed + assist requesters in closing
EARNS:  1-2% referral commission on every deal they assist
EXTRA:  Ongoing commission on future deals from suppliers they onboarded
```

### 2.4 ZiOrbit Platform
```
EARNS:  Commission % on every completed deal (auto-deducted)
EARNS:  Monthly listing rental from verified suppliers
EARNS:  Priority boost fee (supplier pays to appear first)
DOES:   Matches requirements to suppliers, holds escrow, mediates disputes
```

---

## 3. PRODUCT CODE AND REFERENCE SYSTEM

### 3.1 Product Code

```
Product Name  : ZiNeed
Word          : NEED
Consonants    : ND (remove vowels E, E)
Product Code  : ZND
```

### 3.2 Subscription Codes (Supplier Subscriptions)

```
ZNDA01 → 1st ZiNeed supplier subscription
ZNDA02 → 2nd supplier subscription

Business Reference:
ZEA01ZNDA01 → Ganesha Enterprises, ZiNeed supplier subscription 1
ZEA02ZNDA01 → Bala Enterprises, ZiNeed supplier subscription 1
```

### 3.3 Transaction Prefix Library for ZiNeed

| Prefix | Full Name | Business Code | Reference Code Example |
|--------|-----------|--------------|----------------------|
| REQ | Requirement posted | REQ26A01 | ZEA01ZNDA01REQ26A01 |
| PRO | Proposal submitted | PRO26A01 | ZEA01ZNDA01REQ26A01PRO26A01 |
| DL | Deal confirmed | DL26A01 | ZEA01ZNDA01DL26A01 |
| ESC | Escrow transaction | ESC26A01 | ZEA01ZNDA01DL26A01ESC26A01 |
| PAY | Payment released | PAY26A01 | ZEA01ZNDA01DL26A01PAY26A01 |
| COM | Commission deducted | COM26A01 | ZEA01ZNDA01DL26A01COM26A01 |
| AGT | Agent commission | AGT26A01 | ZEA01ZNDA01DL26A01AGT26A01 |
| RTG | Rating record | RTG26A01 | ZEA01ZNDA01DL26A01RTG26A01 |
| DSP | Dispute record | DSP26A01 | ZEA01ZNDA01DL26A01DSP26A01 |
| BNR | Priority boost | BNR26A01 | ZEA01ZNDA01BNR26A01 |
| SUP | Supplier profile | SUPA01 | ZEA01ZNDA01SUPA01 |
| LST | Listing rental | LST26A01 | ZEA01ZNDA01LST26A01 |

---

## 4. REQUIREMENT CATEGORIES

### 4.1 Six Master Categories

```
CAT 1 — 📦 SUPPLY & PRODUCTS
  Rice, oil, medicines, auto parts, packaging, raw materials,
  FMCG goods, electronics stock, stationery, spare parts,
  chemicals, textiles, food ingredients, hardware items
  Commission: 3–5%

CAT 2 — 🚚 TRANSPORT & DELIVERY
  Freight, last-mile delivery, intercity transport, cold chain,
  courier, bulk load movement, mini truck, tempo, container,
  refrigerated vehicle, tanker
  Commission: 5–8%

CAT 3 — 🔧 SERVICES & REPAIRS
  AC repair, equipment servicing, electrical work, plumbing,
  IT support, machine maintenance, generator repair,
  civil work, painting, pest control, security services
  Commission: 8–12%

CAT 4 — 👷 LABOUR & GIG WORK
  Loading/unloading staff, warehouse helpers, part-time drivers,
  security guards, event workers, housekeeping, cleaners,
  factory helpers, packers, field executives
  Commission: 8–10%

CAT 5 — 🩺 PROFESSIONAL SERVICES
  CA/accountant, legal, doctor (locum), pharmacist,
  IT consultant, architect, surveyor, trainer, auditor,
  HR consultant, financial advisor, photographer
  Commission: 5–10%

CAT 6 — 🏗 EQUIPMENT & RENTAL
  Generator hire, forklift rental, cold storage, warehouse space,
  scaffolding, vehicle lease, heavy machinery, event equipment,
  furniture rental, construction equipment
  Commission: 5–8% + listing rental
```

### 4.2 Sub-categories (defined per master category)

```
Each master category has 10-20 sub-categories.
Sub-categories used for:
  → Precise supplier matching
  → Commission rate fine-tuning
  → Search and filter
  → Analytics and reporting

Managed in: zi_need_categories table
Configurable by ZiOrbit admin without code changes
```

---

## 5. SUPPLIER TIERS AND LISTING FEES

### 5.1 Tier Structure

| Tier | Monthly Fee | Benefits |
|------|-------------|---------|
| 🆓 Guest | Free | Can apply to requirements. Shown last. No profile. Higher commission rate. |
| 🔵 Basic | ₹299/month | Verified badge. Profile page. Shown above guests. Push notifications for matching requirements. |
| 🟡 Pro | ₹799/month | Priority ranking. Featured in category. ZiPartner agent introductions. Reduced commission rate. |
| ⭐ Featured | ₹1,999/month | Top of every relevant requirement. Homepage featured. Dedicated ZiPartner agent assigned. Lowest commission. |

### 5.2 Commission Rates by Tier

| Category | Guest | Basic | Pro | Featured |
|----------|-------|-------|-----|---------|
| Supply & Products | 5% | 4% | 3% | 2.5% |
| Transport & Delivery | 8% | 7% | 5.5% | 4.5% |
| Services & Repairs | 12% | 10% | 8% | 7% |
| Labour & Gig Work | 10% | 8% | 7% | 6% |
| Professional Services | 10% | 8% | 6% | 5% |
| Equipment & Rental | 8% | 6% | 5% | 4% |

### 5.3 Priority Boost (Ad-Free Ranking)

```
Supplier pays to appear at top of a specific category for fixed days.
Not traditional ads — pure ranking boost within relevant requirements.

7-day boost  : ₹99  (category-specific, one city)
30-day boost : ₹299 (category-specific, one city)
City-wide    : ₹499 (all categories, one city, 30 days)

Boost recorded as BNR26A01
Reference: ZEA01ZNDA01BNR26A01
```

---

## 6. THE 8-STEP DEAL LIFECYCLE

### Step 1 — Requirement Posted
```
WHO:    Requester (ZiOrbit user or public guest)
HOW:    Simple form — 60 seconds to complete
FIELDS:
  → What do you need? (title — required)
  → Description (details — optional)
  → Category + sub-category (auto-suggested)
  → Quantity + unit (kg, units, days, trips, hours)
  → Location (city + area — GPS auto-fill)
  → Budget (min and max — optional)
  → Deadline (when needed by)
  → Visibility (public = all suppliers, verified_only = verified suppliers only)

GUEST FLOW:
  → No ZiOrbit account needed
  → Phone OTP verification only
  → Contact details captured for follow-up
  → Shown ZiOrbit products after posting (acquisition opportunity)

ZIORBIT USER FLOW:
  → Auto-filled from profile (entity, location, contact)
  → Cross-app trigger: ZiRetail stock low → auto-posts requirement
  → Cross-app trigger: ZiPawn unclaimed item → auto-posts auction requirement
  → ZiPulse contact auto-created for requester (if not exists)
```

### Step 2 — ZiNeed Categorizes and Routes
```
Platform reads requirement:
  → Auto-assigns category (AI-assisted, Phase 2)
  → Determines matching suppliers by:
      - Category match
      - City/area proximity
      - Supplier tier (Featured first → Pro → Basic → Guest)
      - Supplier rating (higher rated shown first within tier)
      - Supplier availability (active in last 30 days)
  → Sends instant notification to matching suppliers:
      - Push notification (ZiOrbit app)
      - WhatsApp message via ZiPost
      - SMS via ZiPost (for non-app suppliers)

NOTIFICATION TEXT EXAMPLE:
  "New requirement: 50kg Basmati Rice, Hyderabad,
   Budget ₹3,500, Needed by Friday.
   Tap to submit proposal → [link]"
```

### Step 3 — Suppliers Submit Proposals
```
PROPOSAL FIELDS:
  → Proposed price (total)
  → Price breakdown (optional — unit price × quantity)
  → Delivery timeline (when can you fulfill)
  → Message to requester (pitch / terms)
  → Attachments (optional — brochure, sample photo)

PROPOSAL DISPLAY ORDER to requester:
  1. Featured suppliers (by rating)
  2. Pro suppliers (by rating)
  3. Basic verified suppliers (by rating)
  4. Guest suppliers (by rating)

Unverified suppliers shown below verified — incentive to upgrade tier
Requester can message any supplier directly within ZiNeed
```

### Step 4 — Requester Reviews and Selects
```
REVIEW SCREEN shows per proposal:
  → Supplier name + verified badge
  → Supplier rating (average of all past deals)
  → Total deals completed
  → Proposed price
  → Delivery timeline
  → Supplier's message
  → Distance from requester (if known)

ACTIONS:
  → Message supplier (in-app chat)
  → Select proposal (one tap to confirm)
  → Request revision (ask supplier to modify price/timeline)
  → Reject proposal (supplier notified)

ZiPartner agent assist:
  → Agent can see open requirements in their city
  → Agent messages requester: "I know a great supplier for this"
  → If agent closes the deal → earns referral commission
```

### Step 5 — Deal Locked — Escrow Initiated
```
DEAL CONFIRMATION:
  → Requester selects proposal → confirmation screen shown
  → Requester reviews: supplier, price, timeline, terms
  → Requester confirms → deal created

ESCROW (ZiPay):
  → Full payment amount held in escrow
  → Large orders (>₹10,000): 50% upfront, 50% on delivery
  → Requester's funds secured — supplier sees confirmed order
  → Neither party can cancel without penalty after escrow
  → Penalty: 10% of deal value (configurable per category)

DEAL CREATION:
  → Deal record created: DL26A01
  → Reference: ZEA01ZNDA01DL26A01
  → Commission rate locked at deal creation time (cannot change)
  → Escrow record: ZEA01ZNDA01DL26A01ESC26A01
  → Both parties notified via push + WhatsApp
```

### Step 6 — Work / Delivery In Progress
```
STATUS UPDATES:
  Supplier updates status:
    → Accepted → Preparing → In Transit → Arriving → Completed

TRANSPORT INTEGRATION:
  If category = Transport → ZiFleet handles live tracking
  ZiFleet driver assigned → live GPS shared with requester
  ZiPost milestone notifications: "Your load is in transit"

DISPUTE WINDOW:
  → Requester can raise dispute at any point during fulfillment
  → Dispute freezes escrow
  → ZiOrbit mediates
  → Resolution: escrow released / partial / refunded
  → DSP26A01 created for every dispute
```

### Step 7 — Requester Confirms Completion
```
CONFIRMATION TRIGGER:
  → Requester taps "Mark as Fulfilled"
  OR
  → Auto-confirmed after 48 hours with no dispute raised

RATINGS:
  → Both parties rate each other (1-5 stars + optional review text)
  → Rating visible on supplier profile immediately
  → Requester rating visible to future suppliers
  → RTG26A01 created per rating

COMPLETION:
  → Requirement status = COMPLETED
  → Deal status = COMPLETED
  → Payment release triggered automatically
```

### Step 8 — Payment Released — Everyone Earns
```
PAYMENT RELEASE (ZiPay):
  Total deal amount: ₹10,000 (example)
  Commission rate:   6% (Pro supplier, Transport category)
  Commission amount: ₹600  → COM26A01 → ZiOrbit
  Agent commission:  ₹200  → AGT26A01 → ZiPartner agent (if assisted)
  Supplier payout:   ₹9,200 → PAY26A01 → Supplier ZiPay wallet

ZIORBIT EARNS:
  → Commission: ₹600
  → Supplier's monthly listing fee: ₹799 (pre-collected)
  → Total from this deal ecosystem: ₹1,399

ZILEDGER INTEGRATION:
  → Requester's ZiLedger: expense entry auto-created
  → Supplier's ZiLedger: income entry auto-created
  → Zero manual entry required
```

---

## 7. CORE MODULES — DETAILED

---

### Module 1 — REQUIREMENT POSTING

**Purpose:** Allow any business to post a requirement in 60 seconds with maximum clarity and minimum friction.

**Posting flow:**
```
Step 1: What do you need? (free text — smart auto-suggest category)
Step 2: How much / how many? (quantity + unit)
Step 3: Where? (city auto-detected, area optional)
Step 4: When? (deadline date/time picker)
Step 5: Budget? (optional range — "best price" option available)
Step 6: Verified suppliers only? (toggle)
Step 7: Post (one tap)
→ OTP verification for guests
→ Requirement live within 60 seconds
```

**Auto-post from ZiOrbit apps:**
```
TRIGGER SOURCE         REQUIREMENT CREATED
─────────────────────────────────────────────────────────
ZiRetail stock.low     → "Need [product], [qty], [city]"
ZiPawn item.unclaimed  → "Auction: [item description]"
ZiFleet route.needed   → "Need truck: [route], [date]"
ZiCare stock.low       → "Need [medicine/supply], [qty]"
ZiFood stock.low       → "Need [ingredient], [qty], urgent"
ZiBuild material.need  → "Need [material], [qty], [site]"
```

**Requirement visibility:**
```
PUBLIC:          All suppliers (guest + verified) can see and apply
VERIFIED ONLY:   Only verified suppliers (Basic + Pro + Featured) can apply
PRIVATE:         Specific suppliers invited directly by requester
```

---

### Module 2 — SUPPLIER PROFILE AND MATCHING

**Purpose:** Maintain rich supplier profiles that enable precise matching and build trust with requesters.

**Supplier profile fields:**
```
IDENTITY
  → Business name
  → Legal entity (linked to zi_entities if ZiOrbit user)
  → Business ID last 6 (GST/CIN/MSME)
  → Verified badge (after ID verification)
  → Tier: Guest / Basic / Pro / Featured
  → Profile photo / logo

CAPABILITIES
  → Categories served (multiple)
  → Sub-categories (specific items/services)
  → Cities served (multiple)
  → Minimum and maximum order value
  → Typical lead time

PERFORMANCE
  → Overall rating (1-5, average of all ratings)
  → Total deals completed
  → Total deal value (lifetime)
  → Response rate (% of notifications responded to within 2 hours)
  → On-time delivery rate
  → Dispute rate (lower = better)
  → Member since date

TRUST SIGNALS
  → Verified badge (national ID verified)
  → Business ID verified (GST/CIN)
  → ZiOrbit user (uses ZiOrbit products — higher trust)
  → Years in business
  → References (past requester reviews)

FINANCIAL
  → ZiPay wallet balance
  → Commission rate (based on tier)
  → Listing fee status (paid/overdue)
  → Total earnings on ZiNeed
```

**Matching algorithm:**
```
MATCHING SCORE per supplier per requirement:

Factor 1: Category match (required) → 0 or proceed
Factor 2: City match (required for local) → 0 or proceed
Factor 3: Tier weight
  Featured = 40 points
  Pro      = 30 points
  Basic    = 20 points
  Guest    = 10 points
Factor 4: Rating weight (rating × 8) → max 40 points
Factor 5: Response rate (rate × 10) → max 10 points
Factor 6: Priority boost active → +20 points
Factor 7: ZiOrbit user → +5 points

Total matching score → determines notification order and display order
```

---

### Module 3 — PROPOSAL MANAGEMENT

**Purpose:** Enable suppliers to submit competitive, credible proposals that win business.

**Proposal limits:**
```
Guest supplier:    Can submit 3 proposals per day (incentive to upgrade)
Basic supplier:    Can submit 10 proposals per day
Pro supplier:      Unlimited proposals
Featured supplier: Unlimited + proposal highlighted with Featured badge
```

**Proposal intelligence:**
```
Requester sees per proposal:
  → Supplier tier badge (Featured/Pro/Basic/Guest)
  → Supplier overall rating with star display
  → Total deals done (credibility signal)
  → Proposed price (prominent)
  → Delivery timeline
  → Supplier's pitch message
  → Response time badge ("Responds within 2 hours")
  → Distance from requester's location

Requester actions:
  → Accept proposal (one tap)
  → Send message to supplier
  → Request modification (counter-offer)
  → Report supplier (abuse/spam)
```

**Proposal expiry:**
```
Proposals expire if requirement is not actioned in 7 days
Supplier notified before expiry
Supplier can re-submit if requirement still open
```

---

### Module 4 — ESCROW AND PAYMENT (ZiPay)

**Purpose:** Remove the #1 trust barrier in B2B transactions — fear of non-payment and non-delivery.

**Escrow flow:**
```
Deal confirmed
  → ZiPay escrow created: ESC26A01
  → Requester pays into escrow (UPI/card/wallet)
  → Supplier notified: "Payment secured, proceed"
  → Work begins

Milestone-based escrow (for large deals >₹10,000):
  → 50% on deal confirmation (advance)
  → 50% on delivery confirmation
  → Both tranches tracked separately

Cancellation penalties:
  Before work starts: 0% penalty (full refund)
  After work started: 10% penalty (deducted from cancelling party)
  After delivery attempt: 25% penalty
```

**Payment methods:**
```
→ UPI (primary)
→ UPI AutoPay (for recurring suppliers)
→ Credit/Debit card
→ Net banking
→ ZiPay wallet balance
→ ZiOrbit subscription wallet (for ZiOrbit users)
```

**Dispute resolution:**
```
Dispute raised by requester:
  → Escrow frozen immediately
  → Both parties submit evidence (photos, messages, notes)
  → ZiOrbit reviews within 48 hours
  → Resolution options:
      Full release to supplier (dispute invalid)
      Partial release (partial fulfillment)
      Full refund to requester (supplier at fault)
      Mutual settlement (both agree on amount)

DSP26A01 created for every dispute
Reference: ZEA01ZNDA01DL26A01DSP26A01
```

---

### Module 5 — IN-APP MESSAGING

**Purpose:** Enable direct communication between requester and supplier within ZiNeed — no phone numbers exchanged until deal is confirmed.

**Messaging rules:**
```
Before deal confirmed:
  → Requester and supplier can message freely
  → Phone numbers NOT visible (privacy protected)
  → Messages logged for dispute reference

After deal confirmed:
  → Phone numbers revealed
  → Messaging continues in-app
  → All messages archived with deal record

After deal completed:
  → Messages archived, accessible for 12 months
  → Part of deal audit trail
```

**Message types:**
```
→ Text message
→ Image attachment
→ File attachment (PDF, doc)
→ Location pin
→ Voice note
→ Delivery update (supplier only)
→ System message (status changes)
```

---

### Module 6 — RATINGS AND REPUTATION

**Purpose:** Build a self-policing quality system where good suppliers rise and bad ones are filtered out.

**Rating system:**
```
WHO rates WHOM:
  Requester rates Supplier: after deal completion
  Supplier rates Requester: after payment received

RATING DIMENSIONS (supplier rated on):
  → Quality of product/service delivered (1-5)
  → Timeliness (on time or not)
  → Communication (responsive, clear)
  → Overall satisfaction (1-5)
  → Would recommend (yes/no)

RATING DIMENSIONS (requester rated on):
  → Payment speed
  → Communication clarity
  → Requirement accuracy
  → Overall experience

IMPACT:
  → Low-rated suppliers drop in matching score
  → Suppliers below 3.0 rating get "Warning" badge
  → Suppliers below 2.5 after 10 deals → suspended
  → Requesters below 3.0 → suppliers warned before accepting
```

---

### Module 7 — ZIPARTNER AGENT INTEGRATION

**Purpose:** ZiPartner agents are the human network that grows ZiNeed beyond digital channels — they introduce suppliers and assist in closing deals.

**Agent capabilities on ZiNeed:**
```
→ See all OPEN requirements in their assigned city
→ Filter by category, value, deadline
→ Message requester: "I know a supplier for this"
→ Introduce supplier (not yet on ZiNeed) → supplier registers
→ Mark themselves as assisting a deal
→ Track commission earned from assisted deals
→ View supplier performance they introduced

Agent commission:
  → 1% of deal value if they assisted requester in selecting supplier
  → 2% of deal value if they introduced the supplier
  → Ongoing 0.5% on future deals from suppliers they onboarded
  → Commission credited instantly to agent ZiPay wallet after deal completion
```

**Agent dashboard:**
```
→ Open requirements in my city (count + list)
→ Deals I assisted (active + completed)
→ Suppliers I introduced (active + inactive)
→ Commission earned this month / total
→ Leaderboard vs other agents in same city
```

---

### Module 8 — REQUESTER DASHBOARD

**Purpose:** Give requiresters full visibility of all their posted needs and deal progress.

**Dashboard sections:**
```
ACTIVE REQUIREMENTS
  → Requirements with no deal yet (proposals received / no proposals)
  → Each shows: proposals count, best price, deadline

ACTIVE DEALS
  → Requirements where supplier selected and deal in progress
  → Each shows: supplier, status, escrow amount, deadline

COMPLETED DEALS
  → Archive of all completed deals
  → Shows: date, supplier, value, rating given

SAVED REQUIREMENTS (templates)
  → Frequently posted requirements saved as templates
  → "Post again" with one tap (recurring needs)

ANALYTICS
  → Total spent on ZiNeed
  → Categories most used
  → Best suppliers used
  → Average fulfillment time
  → Savings vs budget (if budget provided)
```

---

### Module 9 — SUPPLIER DASHBOARD

**Purpose:** Give suppliers complete visibility of opportunities, active deals, earnings, and profile performance.

**Dashboard sections:**
```
LIVE REQUIREMENTS (matching supplier's category + city)
  → Sorted by matching score + deadline urgency
  → Filter: category, city, value range, deadline
  → Each shows: requirement summary, budget, deadline, competition level

MY PROPOSALS
  → Pending (waiting for requester decision)
  → Accepted (deal confirmed)
  → Rejected (not selected)
  → Expired (requirement closed without selection)

ACTIVE DEALS
  → Confirmed deals in progress
  → Status update capability
  → Escrow status visible

EARNINGS
  → This month / this week / all time
  → Commission deducted per deal
  → ZiPay wallet balance
  → Withdrawal history

PROFILE HEALTH
  → Current rating + trend
  → Response rate (improve to get better matching score)
  → Tier benefits (what next tier unlocks)
  → Listing fee status
```

---

### Module 10 — ADMIN PANEL (ZiOrbit Internal)

**Purpose:** ZiOrbit operations team manages suppliers, disputes, categories, and platform health.

**Admin capabilities:**
```
SUPPLIER MANAGEMENT
  → Verify supplier identity (national ID check)
  → Approve/reject supplier registration
  → Upgrade/downgrade tier
  → Suspend supplier (abuse, low rating)
  → View supplier earnings and commission history

REQUIREMENT MANAGEMENT
  → View all live requirements
  → Remove fraudulent or inappropriate requirements
  → Boost specific requirements (ZiOrbit promotes strategically)
  → Edit category assignment

DISPUTE MANAGEMENT
  → View all open disputes
  → Review evidence from both parties
  → Issue resolution decision
  → Track dispute outcomes and appeal

CATEGORY MANAGEMENT
  → Add/edit/remove categories and sub-categories
  → Set commission rates per category and tier
  → Configure penalty rates per category
  → Set escrow rules per category

PLATFORM ANALYTICS
  → Daily active requirements
  → Daily deals completed
  → Commission earned today / this week / this month
  → Supplier tier distribution
  → City-wise volume
  → Category-wise volume
  → Agent performance
```

---

## 8. ZIORBIT ECOSYSTEM INTEGRATIONS

### 8.1 ZiRetail → ZiNeed

```
TRIGGER: ZiRetail stock.level < reorder_point
  → Auto-create requirement:
      title: "Need [product_name]"
      category: supply_products
      quantity: reorder_quantity
      city: entity.city
      deadline: NOW() + 2 days
      source_app: ziretail
      source_ref: ZEA01ZSHPA01[item_ref]

RESULT:
  → Requirement live on ZiNeed immediately
  → ZiRetail user doesn't need to visit ZiNeed
  → Matching distributors notified automatically
  → When deal completed → ZiRetail stock updated automatically
```

### 8.2 ZiPawn → ZiNeed

```
TRIGGER: ZiPawn ticket.status = unclaimed AND past_due_date
  → Auto-create auction requirement:
      title: "Gold item for auction: [item_description]"
      category: supply_products (sub: gold_auction)
      city: entity.city
      deadline: 7 days
      source_app: zipawn
      source_ref: ZEA01ZPNA01TKT26A01

TRIGGER: ZiPawn needs gold appraiser
  → Owner manually posts:
      category: professional_services
      sub_category: gold_appraisal
      city: entity.city
```

### 8.3 ZiFleet → ZiNeed

```
TRIGGER: ZiFleet client posts transport requirement
  → Category: transport_delivery
  → ZiFleet supplier profiles auto-matched
  → Selected ZiFleet supplier → trip created in ZiFleet automatically
  → Live tracking from ZiFleet shared in ZiNeed deal

TRIGGER: ZiFleet vehicle needs maintenance
  → Category: services_repairs, sub: vehicle_maintenance
  → Nearby service centers notified
```

### 8.4 ZiCare → ZiNeed

```
TRIGGER: ZiCare medicine.stock < minimum
  → Auto-requirement: supply_products, sub: medicines
  → Pharma distributors notified

TRIGGER: Clinic needs locum doctor
  → Manual post: professional_services, sub: locum_doctor
  → Verified doctors (ZiPilot professionals) notified
  → Selected doctor → ZiCare access provisioned for confirmed dates only
```

### 8.5 ZiFood → ZiNeed

```
TRIGGER: ZiFood ingredient.stock < threshold
  → Auto-requirement: supply_products, sub: food_ingredients
  → Local suppliers notified

TRIGGER: Equipment repair needed
  → Category: services_repairs
  → Matched service providers notified
```

### 8.6 ZiBuild → ZiNeed

```
TRIGGER: ZiBuild project needs materials
  → Category: supply_products, sub: construction_materials
  → Verified material suppliers notified
  → Price comparison from multiple suppliers

TRIGGER: ZiBuild project needs labour
  → Category: labour_gig, sub: construction_labour
  → Labour contractors in city notified
```

### 8.7 ZiLedger → ZiNeed

```
ON: ZiNeed deal.completed (requester side)
  → ZiLedger: expense entry auto-created
  → amount: deal_amount
  → category: auto-mapped from ZiNeed category
  → ref_code: ZEA01ZNDA01DL26A01

ON: ZiNeed deal.completed (supplier side)
  → ZiLedger: income entry auto-created
  → amount: supplier_payout
  → ref_code: ZEA01ZNDA01DL26A01PAY26A01
```

### 8.8 ZiPulse → ZiNeed

```
ON: ZiNeed requirement posted by requester
  → ZiPulse: contact created/updated for requester
  → Thread entry: "Requirement posted on ZiNeed: [title]"

ON: ZiNeed deal confirmed
  → ZiPulse: contact pulse → HOT
  → Thread entry: "ZiNeed deal confirmed: ₹[amount]"
  → Promise auto-created: "Fulfill requirement by [deadline]"

ON: ZiNeed deal completed
  → ZiPulse: thread entry: "ZiNeed deal completed"
  → ZiPulse: enquiry stage → WON (if enquiry existed)
```

### 8.9 ZiPost → ZiNeed

```
ZiNeed uses ZiPost as its notification delivery engine:

REQUESTER notifications:
  → "X suppliers have submitted proposals for your requirement"
  → "Deal confirmed — supplier has started work"
  → "Delivery is in transit — expected by [time]"
  → "Deal completed — please confirm or raise dispute"
  → "Auto-confirmation in 24 hours — raise dispute if needed"

SUPPLIER notifications:
  → "New requirement matching your category: [title], [city], ₹[budget]"
  → "Your proposal was accepted — payment secured"
  → "Requester has confirmed — payment released to your wallet"
  → "Low match score — improve profile to see more requirements"
  → "Listing fee due — renew to keep verified status"

AGENT notifications:
  → "New open requirement in your city: [title]"
  → "Commission earned: ₹[amount] from [deal]"
```

### 8.10 ZiPartner → ZiNeed

```
ON: Agent introduces supplier to ZiNeed
  → supplier.referred_by = agent.id
  → On every future deal by this supplier → agent earns 0.5%

ON: Agent assists deal closure
  → deal.agent_id = agent.id
  → deal.completed → agent_commission auto-calculated and credited

Agent monthly report:
  → Total requirements seen
  → Total suppliers introduced
  → Total deals assisted
  → Total commission earned
  → Breakdown by category
```

---

## 9. DATABASE SCHEMA — COMPLETE

```sql
-- ═══════════════════════════════════════════════════
-- ZINEED CATEGORIES (admin configurable)
-- ═══════════════════════════════════════════════════
CREATE TABLE zineed_categories (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id             UUID REFERENCES zineed_categories(id),
  code                  TEXT UNIQUE NOT NULL,
  name                  TEXT NOT NULL,
  level                 INTEGER NOT NULL DEFAULT 1,   -- 1=master, 2=sub
  commission_guest      NUMERIC(5,2) DEFAULT 8.00,
  commission_basic      NUMERIC(5,2) DEFAULT 6.00,
  commission_pro        NUMERIC(5,2) DEFAULT 5.00,
  commission_featured   NUMERIC(5,2) DEFAULT 4.00,
  escrow_threshold      NUMERIC DEFAULT 10000,
  escrow_split_pct      NUMERIC DEFAULT 50,           -- % upfront for large deals
  cancel_penalty_pct    NUMERIC DEFAULT 10,
  is_active             BOOLEAN DEFAULT TRUE,
  sort_order            INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- ZINEED SUPPLIER PROFILES
-- ═══════════════════════════════════════════════════
CREATE TABLE zineed_suppliers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code               TEXT NOT NULL,               -- SUPA01
  ref_code              TEXT UNIQUE NOT NULL,         -- ZEA01ZNDA01SUPA01
  entity_id             UUID REFERENCES zi_entities(id),
  subscription_id       UUID REFERENCES zi_subscriptions(id),
  individual_id         UUID REFERENCES zi_individuals(id),

  -- Profile
  business_name         TEXT NOT NULL,
  business_description  TEXT,
  logo_url              TEXT,
  website_url           TEXT,
  established_year      INTEGER,

  -- Categories and geography
  categories            TEXT[] NOT NULL,             -- array of category codes
  sub_categories        TEXT[],
  cities_served         TEXT[] NOT NULL,
  states_served         TEXT[],
  min_order_value       NUMERIC DEFAULT 0,
  max_order_value       NUMERIC,
  typical_lead_hours    INTEGER DEFAULT 24,

  -- Tier and verification
  tier                  TEXT NOT NULL DEFAULT 'guest',
                        -- guest|basic|pro|featured
  is_verified           BOOLEAN DEFAULT FALSE,
  verified_at           TIMESTAMPTZ,
  tier_expiry           DATE,
  listing_fee_status    TEXT DEFAULT 'na',
                        -- na|paid|overdue|suspended

  -- Performance (denormalized)
  rating_overall        NUMERIC(3,2) DEFAULT 0,
  total_ratings         INTEGER DEFAULT 0,
  total_deals           INTEGER DEFAULT 0,
  total_deal_value      NUMERIC DEFAULT 0,
  response_rate         NUMERIC(5,2) DEFAULT 0,      -- % of notifications responded
  ontime_rate           NUMERIC(5,2) DEFAULT 0,
  dispute_rate          NUMERIC(5,2) DEFAULT 0,

  -- Financial
  wallet_balance        NUMERIC DEFAULT 0,
  commission_rate_override NUMERIC,                  -- if custom rate agreed
  total_commission_paid NUMERIC DEFAULT 0,

  -- Referral
  referred_by_agent     UUID REFERENCES zi_individuals(id),
  agent_ongoing_pct     NUMERIC DEFAULT 0.5,

  -- Status
  is_active             BOOLEAN DEFAULT TRUE,
  suspension_reason     TEXT,
  suspended_at          TIMESTAMPTZ,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- ZINEED REQUIREMENTS
-- ═══════════════════════════════════════════════════
CREATE TABLE zineed_requirements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code               TEXT NOT NULL,               -- REQ26A01
  ref_code              TEXT UNIQUE NOT NULL,         -- REQ26A01 (standalone, no entity prefix for guest)
  entity_ref            TEXT,                        -- ZEA01ZNDA01REQ26A01 (if ZiOrbit user)

  -- Posted by
  posted_by_type        TEXT NOT NULL DEFAULT 'user',
                        -- user|guest
  posted_by_user        UUID REFERENCES zi_individuals(id),
  posted_by_entity      UUID REFERENCES zi_entities(id),
  guest_phone_hash      TEXT,                        -- for guest requesters
  guest_phone_last4     TEXT,
  guest_name            TEXT,

  -- Requirement details
  title                 TEXT NOT NULL,
  description           TEXT,
  category_id           UUID NOT NULL REFERENCES zineed_categories(id),
  sub_category_id       UUID REFERENCES zineed_categories(id),
  quantity              NUMERIC,
  unit                  TEXT,                        -- kg|units|days|trips|hours|pieces
  city                  TEXT NOT NULL,
  state                 TEXT,
  country_code          TEXT DEFAULT 'IN',
  location_lat          NUMERIC,
  location_lng          NUMERIC,
  budget_min            NUMERIC,
  budget_max            NUMERIC,
  deadline              TIMESTAMPTZ NOT NULL,

  -- Source
  source                TEXT NOT NULL DEFAULT 'manual',
                        -- manual|ziretail|zipawn|zifleet|zicare|zifood|zibuild|api
  source_ref_code       TEXT,
  auto_generated        BOOLEAN DEFAULT FALSE,

  -- Visibility and status
  visibility            TEXT NOT NULL DEFAULT 'public',
                        -- public|verified_only|private
  status                TEXT NOT NULL DEFAULT 'open',
                        -- open|proposals_received|accepted|in_progress|
                        -- completed|disputed|cancelled|expired
  proposals_count       INTEGER DEFAULT 0,
  views_count           INTEGER DEFAULT 0,

  -- Selected deal
  selected_proposal_id  UUID,
  deal_id               UUID,

  -- Timestamps
  expires_at            TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  accepted_at           TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  cancel_reason         TEXT,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- ZINEED PROPOSALS
-- ═══════════════════════════════════════════════════
CREATE TABLE zineed_proposals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code               TEXT NOT NULL,               -- PRO26A01
  ref_code              TEXT UNIQUE NOT NULL,         -- ZEA01ZNDA01REQ26A01PRO26A01
  requirement_id        UUID NOT NULL REFERENCES zineed_requirements(id),
  supplier_id           UUID NOT NULL REFERENCES zineed_suppliers(id),

  -- Proposal details
  proposed_price        NUMERIC NOT NULL,
  price_breakdown       JSONB,                       -- [{item, qty, unit_price, total}]
  delivery_by           TIMESTAMPTZ NOT NULL,
  message               TEXT,
  attachment_url        TEXT,

  -- Status
  status                TEXT NOT NULL DEFAULT 'pending',
                        -- pending|accepted|rejected|withdrawn|expired
  accepted_at           TIMESTAMPTZ,
  rejected_at           TIMESTAMPTZ,
  rejection_reason      TEXT,
  withdrawn_at          TIMESTAMPTZ,

  -- Revision tracking
  revision_number       INTEGER DEFAULT 0,
  original_proposal_id  UUID REFERENCES zineed_proposals(id),

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requirement_id, supplier_id, revision_number)
);

-- ═══════════════════════════════════════════════════
-- ZINEED DEALS
-- ═══════════════════════════════════════════════════
CREATE TABLE zineed_deals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code               TEXT NOT NULL,               -- DL26A01
  ref_code              TEXT UNIQUE NOT NULL,         -- ZEA01ZNDA01DL26A01
  requirement_id        UUID NOT NULL REFERENCES zineed_requirements(id),
  proposal_id           UUID NOT NULL REFERENCES zineed_proposals(id),
  supplier_id           UUID NOT NULL REFERENCES zineed_suppliers(id),
  requester_user        UUID REFERENCES zi_individuals(id),
  requester_entity      UUID REFERENCES zi_entities(id),

  -- Financial
  deal_amount           NUMERIC NOT NULL,
  currency              TEXT DEFAULT 'INR',
  commission_rate       NUMERIC NOT NULL,            -- locked at creation
  commission_amount     NUMERIC NOT NULL,            -- computed
  agent_commission_pct  NUMERIC DEFAULT 0,
  agent_commission_amt  NUMERIC DEFAULT 0,
  supplier_payout       NUMERIC NOT NULL,            -- deal_amount - commission - agent

  -- Escrow
  escrow_status         TEXT NOT NULL DEFAULT 'pending',
                        -- pending|partial_held|full_held|partial_released|fully_released
  escrow_amount_held    NUMERIC DEFAULT 0,
  escrow_amount_released NUMERIC DEFAULT 0,
  payment_method        TEXT,

  -- Agent
  agent_id              UUID REFERENCES zi_individuals(id),
  agent_type            TEXT,                        -- assisted_requester|introduced_supplier

  -- Progress
  status                TEXT NOT NULL DEFAULT 'confirmed',
                        -- confirmed|in_progress|completed|disputed|cancelled
  progress_updates      JSONB DEFAULT '[]',          -- [{status, note, updated_at, updated_by}]
  delivery_tracking_ref TEXT,                        -- ZiFleet trip ref if transport deal

  -- Completion
  completed_at          TIMESTAMPTZ,
  auto_confirmed_at     TIMESTAMPTZ,                 -- 48hrs after delivery if no dispute
  confirmed_by          TEXT,                        -- manual|auto

  -- Cancellation
  cancelled_at          TIMESTAMPTZ,
  cancel_reason         TEXT,
  cancel_penalty_paid   NUMERIC DEFAULT 0,
  cancel_penalty_by     TEXT,                        -- requester|supplier

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- ZINEED ESCROW TRANSACTIONS
-- ═══════════════════════════════════════════════════
CREATE TABLE zineed_escrow (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code               TEXT NOT NULL,               -- ESC26A01
  ref_code              TEXT UNIQUE NOT NULL,         -- ZEA01ZNDA01DL26A01ESC26A01
  deal_id               UUID NOT NULL REFERENCES zineed_deals(id),

  transaction_type      TEXT NOT NULL,
                        -- hold|partial_release|full_release|refund|penalty
  amount                NUMERIC NOT NULL,
  direction             TEXT NOT NULL,               -- in|out
  from_party            TEXT,                        -- requester|supplier|platform
  to_party              TEXT,
  payment_ref           TEXT,                        -- payment gateway reference
  status                TEXT NOT NULL DEFAULT 'pending',
                        -- pending|processing|completed|failed

  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- ZINEED RATINGS
-- ═══════════════════════════════════════════════════
CREATE TABLE zineed_ratings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code               TEXT NOT NULL,               -- RTG26A01
  ref_code              TEXT UNIQUE NOT NULL,         -- ZEA01ZNDA01DL26A01RTG26A01
  deal_id               UUID NOT NULL REFERENCES zineed_deals(id),
  rated_by              TEXT NOT NULL,               -- requester|supplier
  rated_by_user         UUID REFERENCES zi_individuals(id),

  -- Requester rating supplier
  quality_score         INTEGER CHECK (quality_score BETWEEN 1 AND 5),
  timeliness_score      INTEGER CHECK (timeliness_score BETWEEN 1 AND 5),
  communication_score   INTEGER CHECK (communication_score BETWEEN 1 AND 5),
  overall_score         INTEGER NOT NULL CHECK (overall_score BETWEEN 1 AND 5),
  would_recommend       BOOLEAN,
  review_text           TEXT,

  -- Supplier rating requester
  payment_speed         INTEGER CHECK (payment_speed BETWEEN 1 AND 5),
  clarity_score         INTEGER CHECK (clarity_score BETWEEN 1 AND 5),

  is_published          BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, rated_by)
);

-- ═══════════════════════════════════════════════════
-- ZINEED DISPUTES
-- ═══════════════════════════════════════════════════
CREATE TABLE zineed_disputes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code               TEXT NOT NULL,               -- DSP26A01
  ref_code              TEXT UNIQUE NOT NULL,         -- ZEA01ZNDA01DL26A01DSP26A01
  deal_id               UUID NOT NULL REFERENCES zineed_deals(id),

  raised_by             TEXT NOT NULL,               -- requester|supplier
  raised_by_user        UUID REFERENCES zi_individuals(id),
  reason                TEXT NOT NULL,
  description           TEXT,
  evidence_urls         TEXT[],

  status                TEXT NOT NULL DEFAULT 'open',
                        -- open|under_review|resolved|escalated|closed
  resolution            TEXT,
                        -- released_to_supplier|partial_release|full_refund|mutual_settlement
  resolution_amount_supplier NUMERIC,
  resolution_amount_requester NUMERIC,
  resolution_notes      TEXT,
  resolved_by           UUID REFERENCES zi_individuals(id),

  opened_at             TIMESTAMPTZ DEFAULT NOW(),
  resolved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- ZINEED MESSAGES (in-app chat)
-- ═══════════════════════════════════════════════════
CREATE TABLE zineed_messages (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id        UUID NOT NULL REFERENCES zineed_requirements(id),
  deal_id               UUID REFERENCES zineed_deals(id),
  sender_type           TEXT NOT NULL,               -- requester|supplier|system|agent
  sender_id             UUID REFERENCES zi_individuals(id),
  message_type          TEXT NOT NULL DEFAULT 'text',
                        -- text|image|file|location|voice|system
  content               TEXT,
  media_url             TEXT,
  is_read               BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- ZINEED PRIORITY BOOSTS
-- ═══════════════════════════════════════════════════
CREATE TABLE zineed_boosts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code               TEXT NOT NULL,               -- BNR26A01
  ref_code              TEXT UNIQUE NOT NULL,         -- ZEA01ZNDA01BNR26A01
  supplier_id           UUID NOT NULL REFERENCES zineed_suppliers(id),
  category_id           UUID REFERENCES zineed_categories(id),
  city                  TEXT,
  boost_type            TEXT NOT NULL,               -- 7day|30day|city_wide
  amount_paid           NUMERIC NOT NULL,
  starts_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMPTZ NOT NULL,
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- ZINEED LISTING RENTALS
-- ═══════════════════════════════════════════════════
CREATE TABLE zineed_listing_rentals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code               TEXT NOT NULL,               -- LST26A01
  ref_code              TEXT UNIQUE NOT NULL,         -- ZEA01ZNDA01LST26A01
  supplier_id           UUID NOT NULL REFERENCES zineed_suppliers(id),
  tier                  TEXT NOT NULL,
  amount                NUMERIC NOT NULL,
  billing_period_start  DATE NOT NULL,
  billing_period_end    DATE NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending',
                        -- pending|paid|failed|refunded
  payment_ref           TEXT,
  paid_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 10. REVENUE MODEL AND PROJECTIONS

### 10.1 Three Revenue Streams

```
STREAM 1 — TRANSACTION COMMISSION (primary)
  → 3–12% per completed deal
  → Auto-deducted from escrow on deal completion
  → Rate locked at deal confirmation (cannot be disputed)
  → Higher rate for guest suppliers → incentive to upgrade tier
  → This is variable revenue — grows with deal volume

STREAM 2 — SUPPLIER LISTING RENTAL (recurring)
  → ₹299–₹1,999/month per verified supplier
  → Charged monthly regardless of deal volume
  → Even in a slow month — listing fee still paid
  → This is BASELINE revenue — predictable and growing
  → Target: 500 suppliers × avg ₹600/mo = ₹3L/month (baseline)

STREAM 3 — PRIORITY BOOST (ad-free ranking)
  → ₹99–₹499 per boost period
  → Highly targeted — supplier pays to appear for their exact category
  → Measurable ROI for supplier (more proposals submitted)
  → This is INCREMENTAL revenue — grows with supplier confidence
```

### 10.2 Revenue Projection

```
── SCENARIO A: 200 suppliers, 100 deals/month ────────────
Listing Rentals (recurring):
  50 Basic    × ₹299  = ₹14,950
  100 Pro     × ₹799  = ₹79,900
  50 Featured × ₹1,999= ₹99,950
  Total:               ₹1,94,800/month

Commission (variable):
  100 deals × avg ₹25,000 × avg 6%
  = ₹1,50,000/month

Priority Boosts:
  50 boosts × avg ₹250 = ₹12,500/month

ZiNeed total: ₹3,57,300/month
──────────────────────────────────────────────────────────

── SCENARIO B: 2,000 suppliers, 1,000 deals/month ────────
Listing Rentals: ₹19,48,000/month
Commission: ₹15,00,000/month
Priority Boosts: ₹1,25,000/month
ZiNeed total: ₹35,73,000/month
──────────────────────────────────────────────────────────

This is ON TOP OF all Zi-app subscription revenue.
Compounds — more suppliers = more deals = more commission.
Network value grows with every new user on either side.
```

---

## 11. PRICING FOR ZINEED (Supplier Subscription)

ZiNeed follows a hybrid model — the product itself has no subscription for REQUESTERS. Requesters use it free forever. Revenue comes from SUPPLIERS and DEALS.

```
REQUESTER side:
  → Free forever to post requirements
  → No subscription required
  → Guest access via OTP only

SUPPLIER side:
  → Guest tier: Free (limited proposals, higher commission)
  → Basic tier: ₹299/month (ZiNeed listing rental)
  → Pro tier: ₹799/month
  → Featured tier: ₹1,999/month
  → Annual: Pay 10 months, get 12 (2 months free)

ZiOrbit subscription products (ZiRetail, ZiFleet etc.):
  → Their integration with ZiNeed is a FEATURE of their subscription
  → Auto-posting requirements = included in product subscription
  → No extra charge for ZiOrbit product users to USE ZiNeed
```

---

## 12. BUILD PHASES

### Phase 1 — MVP (Weeks 1–6)
```
→ Core tables: requirements, suppliers, proposals, deals
→ Requirement posting (manual + guest OTP)
→ Supplier registration (Basic tier only)
→ Proposal submission (simple form)
→ Requester selects proposal
→ Manual deal facilitation (no escrow yet)
→ Manual commission collection (UPI)
→ WhatsApp notifications via ZiPost
→ ZiPawn + ZiRetail auto-post integration
→ Manually onboard first 10 suppliers in Hyderabad
→ Facilitate first 20 deals manually — learn before automating
```

### Phase 2 — Escrow and Ratings (Weeks 7–14)
```
→ ZiPay escrow integration
→ Full payment flow (UPI/card)
→ Supplier dashboard
→ Requester dashboard
→ Ratings and reviews system
→ Dispute management (basic)
→ Pro and Featured supplier tiers
→ Listing rental billing (monthly auto-debit)
→ ZiFleet transport integration
→ ZiLedger auto-entry on deal completion
→ ZiPulse contact creation on deal
→ All 6 categories open
```

### Phase 3 — Scale and Intelligence (Weeks 15–24)
```
→ Priority boost feature
→ ZiPartner agent dashboard for ZiNeed
→ Agent commission automation
→ In-app messaging system
→ Category management admin panel
→ Advanced matching algorithm
→ Multi-city expansion (Chennai, Bangalore, Mumbai)
→ ZiCare, ZiFood, ZiBuild integrations
→ Guest requester conversion flow (show ZiOrbit products)
→ Saved requirement templates
→ Analytics dashboard (supplier + ZiOrbit admin)
→ Dispute mediation workflow (formal)
→ Supplier suspension automation (low rating)
```

### Phase 4 — Global and Advanced (Month 7+)
```
→ Multi-language support
→ International markets (UAE, Singapore)
→ Advanced escrow (milestone-based, complex projects)
→ API for external integration
→ AI-powered category auto-detection
→ AI-powered demand forecasting (alert suppliers before spike)
→ Supplier insurance / trust fund (Phase 4)
→ ZiNeed public marketplace website (standalone)
→ Mobile app for suppliers (dedicated ZiNeed app)
```

---

## 13. SUCCESS METRICS

```
MARKETPLACE HEALTH (measure daily):
  → Live open requirements count
  → Average proposals per requirement
  → Average time to first proposal (target: <2 hours)
  → Average time to deal confirmation (target: <24 hours)
  → Deal completion rate (% of accepted deals that complete)
  → Dispute rate (target: <3% of deals)

SUPPLIER METRICS (measure weekly):
  → Active suppliers by tier
  → Supplier response rate (target: >70%)
  → Average supplier rating (target: >4.0)
  → Supplier churn rate (target: <5%/month)
  → New suppliers onboarded per week

REVENUE METRICS (measure monthly):
  → Listing rental MRR
  → Commission earned
  → Priority boost revenue
  → Average commission per deal
  → Revenue per city
  → Revenue per category

NETWORK METRICS (measure monthly):
  → Repeat requesters (posted 2+ requirements)
  → Repeat suppliers (completed 5+ deals)
  → Cross-app requirements (from ZiRetail, ZiFleet etc.)
  → Guest-to-ZiOrbit conversion rate
  → City expansion readiness score
```

---

## 14. CLAUDE CODE QUICK REFERENCE

```
## ZiNeed — Business Requirement Marketplace

# Product code: ZND
# Subscription: ZEA01ZNDA01 (supplier entity + product)

# Core concept
Requester-first marketplace.
Post any business need → right supplier finds you.
Closed-loop: post → match → escrow → deliver → pay → earn.
ZiOrbit earns commission + listing rental on every deal.

# The 4 players
Requester  → posts requirements (free always)
Supplier   → fulfills requirements (pays listing rental)
ZiPartner  → assists deals (earns referral commission)
ZiOrbit    → matches + escrows + earns commission

# Core tables
zineed_categories         → 6 master categories + sub-categories
zineed_suppliers          → supplier profiles + tiers + performance
zineed_requirements       → every posted requirement (user + guest)
zineed_proposals          → supplier bids on requirements
zineed_deals              → confirmed active deals + escrow status
zineed_escrow             → payment hold + release transactions
zineed_ratings            → post-deal ratings both sides
zineed_disputes           → dispute records + resolution
zineed_messages           → in-app chat per requirement/deal
zineed_boosts             → priority ranking boosts
zineed_listing_rentals    → monthly supplier listing fee records

# Business code pattern
Requirement : REQ26A01
Proposal    : ZEA01ZNDA01REQ26A01PRO26A01
Deal        : ZEA01ZNDA01DL26A01
Escrow      : ZEA01ZNDA01DL26A01ESC26A01
Payment     : ZEA01ZNDA01DL26A01PAY26A01
Commission  : ZEA01ZNDA01DL26A01COM26A01
Agent comm  : ZEA01ZNDA01DL26A01AGT26A01
Rating      : ZEA01ZNDA01DL26A01RTG26A01
Dispute     : ZEA01ZNDA01DL26A01DSP26A01
Boost       : ZEA01ZNDA01BNR26A01

# Supplier tiers
Guest (free) → Basic ₹299/mo → Pro ₹799/mo → Featured ₹1,999/mo

# Commission rates (by category × tier)
Supply:       3–5%  | Transport: 5–8%  | Services:    8–12%
Labour:       8–10% | Professional: 5–10% | Equipment: 5–8%
Guest tier always pays highest rate (incentive to upgrade)

# Revenue streams
① Commission: 3-12% per deal (auto-deducted from escrow)
② Listing rental: ₹299-1,999/month per supplier
③ Priority boost: ₹99-499 per 7/30 day ranking boost

# Cross-app auto-triggers
ZiRetail stock.low       → auto-create requirement
ZiPawn item.unclaimed    → auto-create auction requirement
ZiFleet transport.needed → auto-create transport requirement
ZiCare stock.low         → auto-create supply requirement
ZiFood stock.low         → auto-create ingredient requirement
zineed_deal.completed    → ZiLedger auto-entry (both sides)
zineed_deal.completed    → ZiPulse thread entry + contact update
zineed_requirement.new   → ZiPost notifies matching suppliers

# Pricing model
Requesters : Free forever (no subscription)
Suppliers  : Monthly listing rental per tier
             Annual = 10 months paid, 12 months access
             Commission deducted per deal automatically

# Phase 1 approach
Manually onboard first 10 suppliers in Hyderabad
Facilitate first 20 deals manually before automating
Collect commission via UPI until ZiPay escrow built
Start with Supply + Transport categories only
Open all 6 categories in Phase 2
```

---

*Document: ZINEED_PRD.md*
*Version: 1.0*
*Add to CLAUDE.md as: @ZINEED_PRD.md*
*Read this before: Any ZiNeed screen, feature, table, revenue, integration, or supplier work*
*Related documents: ZIORBIT_ARCHITECTURE.md, ZIORBIT_PRICING.md, ZIPULSE_PRD.md*
