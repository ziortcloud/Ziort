# ZiPulse — Complete Product Requirements Document
## Business Relationship & Conversation OS for ZiOrbit

**Product Name:** ZiPulse
**Product Code:** ZPLS
**Tagline:** Every business relationship has a pulse. Never let one go silent.
**Platform:** ZiOrbit (ziorbit.com)
**Document Version:** 1.0
**Status:** Draft — Ready for Claude Code Implementation
**Read Before:** Any ZiPulse schema, feature, UI, or integration work

---

## 1. PRODUCT VISION

### 1.1 What ZiPulse Is

ZiPulse is ZiOrbit's business relationship and conversation management product.
It is NOT a traditional CRM.
It is a living system that keeps every business conversation, promise, follow-up, and enquiry alive until closure.

Every person a business owner interacts with — customer, supplier, partner, prospect, or agent — becomes a contact with a pulse. That pulse measures how alive the relationship is. The owner's job is to keep every pulse strong.

### 1.2 What ZiPulse Is NOT

```
NOT a spreadsheet replacement
NOT an enterprise pipeline tool
NOT a contact address book
NOT a ticketing system
NOT Salesforce or Zoho for small business

IT IS:
→ A business conversation memory system
→ A promise and follow-up engine
→ A relationship health monitor
→ A lightweight enquiry-to-closure pipeline
→ A connected hub for all ZiOrbit customer interactions
```

### 1.3 The Core Problem It Solves

Small and medium business owners lose money every day because:

```
→ A customer called. Owner forgot to call back.
→ A quote was promised. Never sent.
→ A hot lead went cold. No one noticed.
→ A supplier agreed on a price. No record exists.
→ A repeat customer hasn't visited in 3 months. No alert sent.
→ A new enquiry came in. Got buried under daily work.
→ A meeting happened. Notes written on paper. Paper lost.
→ A deal was almost closed. Owner lost track of where it was.
```

ZiPulse solves ALL of these. In one product. At ₹10/day.

### 1.4 Product Tagline Options

```
Primary:   "Every business relationship has a pulse. Never let one go silent."
Short:     "Keep every relationship alive."
Action:    "Capture. Promise. Follow. Close."
Emotional: "Never forget a customer. Never break a promise."
```

---

## 2. TARGET USERS

### 2.1 Primary Users

| User Type | Pain Point ZiPulse Solves |
|-----------|--------------------------|
| Pawn shop owner | Track every customer — who pledged what, when to follow up, who hasn't returned |
| Fleet operator | Manage client relationships — who books regularly, who needs re-engagement |
| Restaurant owner | Track corporate clients, catering enquiries, repeat guests |
| Retailer | Follow up on bulk order enquiries, supplier negotiations |
| Clinic owner | Patient relationship tracking, doctor referral management |
| Consultant | Full pipeline from first enquiry to project delivery and payment |
| Construction business | Supplier, client, and contractor relationship management |
| ZiPartner Agent | Track businesses being converted, follow-up on referrals |
| Any SMB owner | Anyone who loses track of conversations and follow-ups |

### 2.2 Secondary Users

```
→ Sales staff assigned to manage enquiries
→ Operations managers tracking supplier relationships
→ Admin staff managing appointment follow-ups
→ Field executives logging customer visits
```

---

## 3. PRODUCT CODE AND REFERENCE SYSTEM

### 3.1 Product Code

```
Product Name  : ZiPulse
Word          : PULSE
Consonants    : PLS (remove vowels U, E)
Product Code  : ZPLS
```

### 3.2 Subscription Codes

```
ZPLSA01 → 1st ZiPulse subscription
ZPLSA02 → 2nd ZiPulse subscription (if entity has 2)

Business Reference:
ZEA01ZPLSA01 → Ganesha Enterprises, ZiPulse subscription 1
ZEA02ZPLSA01 → Bala Enterprises, ZiPulse subscription 1
```

### 3.3 Transaction Prefix Library for ZiPulse

| Prefix | Full Name | Business Code | Reference Code Example |
|--------|-----------|--------------|----------------------|
| CST | Contact | CSTA01 | ZEA01ZPLSA01CSTA01 |
| THR | Thread / Conversation entry | THR26A01 | ZEA01ZPLSA01THR26A01 |
| PRM | Promise | PRM26A01 | ZEA01ZPLSA01CSTA01PRM26A01 |
| ENQ | Enquiry | ENQ26A01 | ZEA01ZPLSA01ENQ26A01 |
| FUP | Follow-up | FUP26A01 | ZEA01ZPLSA01CSTA01FUP26A01 |
| MTG | Meeting | MTG26A01 | ZEA01ZPLSA01MTG26A01 |
| QT | Quotation sent | QT26A01 | ZEA01ZPLSA01ENQ26A01QT26A01 |
| NOTE | Note entry | NOTE26A01 | ZEA01ZPLSA01CSTA01NOTE26A01 |
| TAG | Contact tag | TAGA01 | ZEA01ZPLSA01TAGA01 |
| STG | Pipeline stage change | STG26A01 | ZEA01ZPLSA01ENQ26A01STG26A01 |

---

## 4. CORE CONCEPT — THE PULSE

### 4.1 What Is a Pulse?

Every contact in ZiPulse has a **Pulse Score** between 0 and 100.
The score represents how alive and healthy the business relationship is.

```
Pulse Score 80–100 → 🔴 HOT     → Active, engaging, close to deal
Pulse Score 50–79  → 🟡 WARM    → Regular but needs nurturing
Pulse Score 25–49  → 🔵 COOL    → Slowing down, needs attention
Pulse Score 1–24   → ⚫ SILENT  → Danger zone, re-engage now
Pulse Score 0      → 💀 LOST    → No activity, marked lost
Special status     → ✅ CLOSED  → Deal completed successfully
```

### 4.2 Pulse Score Calculation

```
Score is calculated from 5 factors (weighted):

Factor 1 — Recency (30 points max)
  Contact today              → 30 points
  Contact within 3 days      → 25 points
  Contact within 7 days      → 15 points
  Contact within 14 days     → 8 points
  Contact within 30 days     → 3 points
  No contact in 30+ days     → 0 points

Factor 2 — Promise Fulfillment (20 points max)
  All promises fulfilled     → 20 points
  1 broken promise           → 12 points
  2+ broken promises         → 5 points
  No promises made           → 15 points (neutral)

Factor 3 — Response Rate (20 points max)
  Responds quickly           → 20 points
  Responds sometimes         → 12 points
  Rarely responds            → 5 points
  Never responds             → 0 points

Factor 4 — Follow-up Completion (15 points max)
  All follow-ups done        → 15 points
  Most follow-ups done       → 10 points
  Follow-ups pending         → 5 points
  Follow-ups missed          → 0 points

Factor 5 — Pipeline Progress (15 points max)
  Advanced stage (quoted+)   → 15 points
  Mid stage (contacted)      → 10 points
  Early stage (new)          → 5 points
  No enquiry active          → 8 points (neutral)
```

### 4.3 Pulse Board — The Main View

```
Owner opens ZiPulse → sees Pulse Board

┌─────────────────────────────────────────┐
│  PULSE BOARD — Ganesha Enterprises      │
│                                         │
│  🔴 HOT (3)    🟡 WARM (8)              │
│  🔵 COOL (5)   ⚫ SILENT (2)            │
│                                         │
│  ⚠️  2 promises overdue today           │
│  📞  4 follow-ups scheduled today       │
│  💬  3 enquiries stuck in same stage    │
│                                         │
│  [Today's Actions] [All Contacts]       │
│  [Pipeline View]   [Archive]            │
└─────────────────────────────────────────┘
```

---

## 5. CORE MODULES — DETAILED

---

### Module 1 — QUICK CAPTURE (Spark)

**Purpose:** Add a new contact + context in under 30 seconds. No friction. No mandatory fields except name and mobile.

**What can be captured:**
```
→ Name (required)
→ Mobile number (required)
→ What they need / context (voice note OR text — optional)
→ Source: walk-in / referral / ZiMatch / cold call / ZiOrbit app
→ First follow-up date (optional — defaults to tomorrow)
→ Photo of business card (optional — OCR extracts details)
→ Location / address (optional — GPS tag)
→ Referred by (another contact or ZiPartner agent)
```

**Flow:**
```
Owner taps Quick Capture
  → Enters name + mobile (10 seconds)
  → Speaks a 15-second voice note about context
  → Taps Save
  → Contact created with Pulse Score = 70 (new, fresh)
  → Default follow-up reminder set for tomorrow
  → Thread started with voice note as first entry
```

**Platform:** Available on mobile (primary) and web.

**Rules:**
```
→ Minimum: name + mobile
→ Voice note auto-transcribed (Phase 2 AI feature)
→ Business card photo → OCR extracts name, mobile, email, company
→ Duplicate check: if mobile already exists → show existing contact + ask to merge or add note
→ Source tracked for analytics (where do leads come from?)
```

---

### Module 2 — CONTACT PROFILE

**Purpose:** Complete 360-degree view of a business relationship.

**Profile sections:**

```
IDENTITY
  → Name, mobile (primary + alternate), email
  → Company / business name
  → Designation / role
  → Location / address
  → Profile photo or initial avatar
  → ZiOrbit link (if this contact is also a ZiOrbit user)
  → Source of contact
  → Referred by

PULSE STATUS
  → Current pulse score (visual gauge)
  → Pulse status (hot/warm/cool/silent/closed/lost)
  → Last contact date
  → Next follow-up date and type
  → Days since last contact (alert if > threshold)

RELATIONSHIP SUMMARY
  → Total interactions logged
  → Total promises made / kept / broken
  → Total enquiries (active / won / lost)
  → Total deal value (won)
  → First contact date
  → How long relationship has been active

TAGS
  → Owner-defined tags: VIP, Bulk Buyer, Supplier, Agent, Seasonal, etc.
  → Product tags: ZiPawn Customer, ZiFleet Client, etc.
  → Custom tags (free-form)

LINKED RECORDS
  → Enquiries (active and closed)
  → Meetings scheduled
  → Promises (pending and fulfilled)
  → Files / documents shared
  → ZiLedger: payment history (if linked)
  → ZiPawn: loan history (if ZiPawn customer)
  → ZiFleet: trip history (if fleet client)
```

---

### Module 3 — CONVERSATION THREAD

**Purpose:** A living, chronological record of every interaction with a contact. Like a WhatsApp thread but for business memory — organized, searchable, permanent.

**Thread entry types:**

```
TYPE          ICON  DESCRIPTION
─────────────────────────────────────────────
note          📝   Text note about conversation
voice_note    🎤   Audio recording (auto-transcribed in Phase 2)
file          📎   Document, PDF, brochure, image shared
photo         📷   Photo of product, location, business card
promise       🤝   A commitment made by owner or contact
meeting       📅   Meeting scheduled or completed
quote_sent    💼   Quotation sent to contact
follow_up     📞   Follow-up call or visit logged
status_change 🔄   Enquiry stage changed
payment       💰   Payment received (from ZiLedger)
system        ⚙️   Auto-generated entry (from ZiMatch, ZiPawn, etc.)
```

**Thread rules:**
```
→ All entries are chronological (newest first option and oldest first option)
→ Every entry has: timestamp, created by (which staff member), entry type
→ Entries cannot be deleted (only archived) — full audit trail
→ Thread entries are searchable by keyword
→ Thread can be filtered by entry type
→ Thread auto-populates from ZiOrbit events (ZiPawn loan created = thread entry)
→ Pin important entries (pin up to 3 per contact)
```

**Thread business code:**
```
THR26A01 → First thread entry in 2026
THR26A02 → Second entry
Reference: ZEA01ZPLSA01CSTA01THR26A01
```

---

### Module 4 — PROMISE TRACKER

**Purpose:** ZiPulse's most unique feature. Tracks every business promise — made by the owner TO the contact, or made by the contact TO the owner.

**What is a promise in business context:**
```
→ "I will send you a quote by tomorrow morning"
→ "Call me back on Friday"
→ "We will visit your site next week"
→ "I will check the stock and confirm by evening"
→ "You will receive the delivery by Wednesday"
→ "I will introduce you to my partner"
→ "Payment will be done by month end"
```

**Promise record fields:**
```
promise_type     → send_quote | call_back | visit | confirm | deliver |
                   introduce | payment | custom
direction        → owner_to_contact | contact_to_owner
description      → What exactly was promised (text)
promised_by      → Which staff member made the promise
due_at           → When it must be done
reminder_at      → Alert sent X hours before due_at
is_fulfilled     → boolean
fulfilled_at     → When it was done
fulfillment_note → What happened when it was done
is_broken        → boolean (set if due_at passed without fulfillment)
```

**Promise workflow:**
```
Promise created (during any thread entry)
  → Reminder sent at reminder_at time
  → If fulfilled → mark done → +20 pulse score contribution
  → If due_at passed without action → marked BROKEN → pulse score drops
  → Broken promises shown in red on contact profile
  → Daily digest shows all promises due today
```

**Promise business code:**
```
PRM26A01 → First promise in 2026
Reference: ZEA01ZPLSA01CSTA01PRM26A01
```

---

### Module 5 — FOLLOW-UP ENGINE

**Purpose:** The active reminder system that ensures no contact is ever forgotten.

**Types of follow-ups:**
```
CHANNEL     DESCRIPTION
─────────────────────────────────────
call        Phone call scheduled
whatsapp    WhatsApp message to send
visit       Physical visit to contact's location
email       Email to send
meeting     Formal meeting to schedule
review      Periodic relationship review
```

**Follow-up creation:**
```
Manual:   Owner sets specific date + time + channel + note
Auto:     System auto-schedules based on pulse status:
            HOT contact  → suggest follow-up in 2 days
            WARM contact → suggest follow-up in 5 days
            COOL contact → auto-alert owner at 7 days
            SILENT       → auto-alert owner at 14 days
Recurring: Monthly check-in / weekly update / quarterly review
```

**Follow-up completion:**
```
Follow-up marked done → owner adds brief outcome note
Outcome types:
  → spoke_positive     (positive response)
  → spoke_neutral      (no decision)
  → spoke_negative     (not interested)
  → no_answer          (tried, not reached)
  → rescheduled        (new date set)
  → meeting_scheduled  (escalated to meeting)
  → deal_progressed    (enquiry moved to next stage)
  → deal_closed        (won)
  → deal_lost          (lost)

Based on outcome → next follow-up auto-suggested
```

**Follow-up business code:**
```
FUP26A01 → First follow-up in 2026
Reference: ZEA01ZPLSA01CSTA01FUP26A01
```

---

### Module 6 — ENQUIRY PIPELINE

**Purpose:** Convert conversations into structured sales opportunities with a visual pipeline from first interest to final closure.

**Pipeline stages:**
```
STAGE             MEANING                          AUTO-ALERT IF STUCK
─────────────────────────────────────────────────────────────────────
NEW               Just captured, not yet contacted  3 days
CONTACTED         First contact made               5 days
INTERESTED        Confirmed interest               5 days
QUOTE SENT        Quotation shared                 7 days
NEGOTIATING       Price/terms discussion           5 days
DECISION PENDING  Waiting for their decision       3 days
WON               Deal closed successfully         —
LOST              Did not convert                  —
ON HOLD           Paused by contact or owner       30 days
```

**Enquiry record fields:**
```
title            → Short description of what they need
description      → Detailed requirement
value            → Expected deal value (estimate)
currency         → INR / USD / etc (from entity country)
probability      → Win probability % (0-100, manual or auto)
source           → walk_in | zimatch | referral | cold_call | inbound
product_interest → Which ZiOrbit product / what category
stage            → Current pipeline stage
stage_history    → JSON array of all stage changes with timestamps
assigned_to      → Which staff member owns this enquiry
expected_close   → Estimated close date
won_at           → Date won (if won)
won_value        → Final agreed value (if won)
lost_reason      → Why it was lost (if lost)
lost_to          → Who they went with instead (competitor tracking)
```

**Pipeline view:**
```
VISUAL KANBAN VIEW (web):
┌──────┬───────────┬──────────┬────────────┬─────────────┬──────┬──────┐
│ NEW  │ CONTACTED │INTERESTED│ QUOTE SENT │ NEGOTIATING │ WON  │ LOST │
│  5   │     8     │    4     │     3      │      2      │  12  │  6   │
│      │           │          │            │             │      │      │
│ [E1] │ [E3][E4]  │  [E6]    │  [E8]      │    [E10]    │      │      │
└──────┴───────────┴──────────┴────────────┴─────────────┴──────┴──────┘

LIST VIEW (mobile):
→ Sorted by: stage + days stuck + value
→ Filters: assigned to, product, date range, value range
```

**Enquiry business code:**
```
ENQ26A01 → First enquiry in 2026
Reference: ZEA01ZPLSA01ENQ26A01
Stage change ref: ZEA01ZPLSA01ENQ26A01STG26A01
Quotation ref: ZEA01ZPLSA01ENQ26A01QT26A01
```

---

### Module 7 — SMART INBOX

**Purpose:** A temporary holding area for anything captured quickly before it is organized. Zero friction entry point.

**What goes into Smart Inbox:**
```
→ Quick voice note from a meeting
→ Photo of a business card (not yet processed)
→ Text "met Ravi, interested in bulk order"
→ Screenshot of a WhatsApp conversation
→ Reminder to call someone (name only, no details)
→ Link shared by someone
→ Auto-imported items from ZiMatch or other ZiOrbit apps
```

**Smart Inbox actions:**
```
Each inbox item can be converted into:
  → New Contact
  → Add note to existing contact
  → New Enquiry
  → New Follow-up on existing contact
  → New Promise
  → New Meeting
  → Task (routed to task module)
  → Archived / Discarded

Inbox items older than 7 days without action → alert owner
Inbox items older than 30 days → auto-archive with notification
```

---

### Module 8 — MEETING MANAGEMENT

**Purpose:** Schedule, prepare for, and record outcomes of business meetings.

**Meeting record fields:**
```
title          → Purpose of meeting
contact_id     → Who the meeting is with
location       → Physical address or video call link
scheduled_at   → Date and time
duration_mins  → Expected duration
agenda         → What will be discussed
pre_notes      → Preparation notes (owner's private notes)
status         → scheduled | completed | cancelled | rescheduled
outcome        → What happened in the meeting
action_items   → Promises or tasks created from meeting
next_step      → What happens after this meeting
```

**Meeting workflow:**
```
Meeting scheduled
  → Reminder 24 hours before
  → Reminder 1 hour before (mobile push)
  → After scheduled time → prompt owner to log outcome
  → Outcome logged → auto-creates follow-up for next step
  → Meeting notes added to contact thread
  → Promises created from meeting added to Promise Tracker
```

**Meeting business code:**
```
MTG26A01
Reference: ZEA01ZPLSA01MTG26A01
```

---

### Module 9 — BUSINESS KNOWLEDGE BASE (Archive)

**Purpose:** Every closed, won, or lost deal is stored as a searchable case study for future reference and business learning.

**What is archived:**
```
→ All closed enquiries (won and lost)
→ Completed contacts (relationship fully closed)
→ Old notes and threads (auto-archived after X months of inactivity)
→ Expired promises
→ Past meetings
→ Old quotations sent
```

**Archive intelligence:**
```
Search by:
  → Keyword (product type, location, contact name)
  → Category (supply, service, transport)
  → Date range
  → Stage at closure (won/lost)
  → Value range
  → Assigned staff member

Archive use cases:
  → "Last time I quoted a hospital for medicines — what price did I give?"
  → "Which customers bought bulk rice in last quarter?"
  → "How many leads did I lose last year and why?"
  → "Which staff member has the best close rate?"
```

---

### Module 10 — PULSE SCORE ENGINE

**Purpose:** Automated, real-time health monitoring of every business relationship.

**Score recalculation trigger:**
```
Score recalculated when:
  → Thread entry added
  → Follow-up completed or missed
  → Promise fulfilled or broken
  → Enquiry stage changes
  → Meeting logged
  → No activity for 48 hours (score decays)
```

**Score decay:**
```
If no activity in 48 hours → score drops by 2 points/day
If no activity in 7 days   → status changes to COOL automatically
If no activity in 14 days  → status changes to SILENT + owner alert
If no activity in 30 days  → status changes to LOST (reversible)
```

**Owner alerts for pulse:**
```
Daily digest notification:
  → X contacts in SILENT zone (need attention)
  → X promises overdue today
  → X follow-ups due today
  → X enquiries stuck in same stage for 7+ days
  → X contacts whose pulse dropped significantly
```

---

### Module 11 — TAGS AND SEGMENTATION

**Purpose:** Organize and filter contacts by custom categories meaningful to the business.

**Tag types:**
```
SYSTEM TAGS (auto-applied):
  → Hot Lead
  → VIP Customer
  → Overdue Follow-up
  → Broken Promise
  → High Value (>₹50,000 potential)
  → Connected from ZiMatch
  → Connected from ZiPawn

OWNER-DEFINED TAGS (custom):
  → Examples: Bulk Buyer, Seasonal, Supplier, Agent,
    Festival Customer, Government, Corporate, Retail, etc.
  → No limit on custom tags
  → Tags searchable and filterable
  → Tags visible on contact card in Pulse Board
```

---

### Module 12 — TEAM MANAGEMENT (Plus and Pro plans)

**Purpose:** Assign contacts and enquiries to staff. Track team performance.

**Assignment:**
```
→ Each contact can be assigned to a staff member
→ Each enquiry can be assigned independently
→ Owner can reassign at any time
→ Staff see only their assigned contacts (configurable)
→ Owner sees all contacts across all staff
```

**Team performance dashboard:**
```
Per staff member:
  → Contacts assigned
  → Follow-ups completed vs missed
  → Promises kept vs broken
  → Enquiries won vs lost
  → Average time to close
  → Pulse score trend of their contacts
```

---

## 6. DASHBOARD — COMPLETE SPECIFICATION

### 6.1 Mobile Dashboard

```
┌────────────────────────────────────┐
│  ZiPulse — Ganesha Enterprises     │
│  Tuesday, 6 May 2026               │
│                                    │
│  TODAY'S ACTIONS                   │
│  ─────────────────────────────     │
│  📞 4 follow-ups due               │
│  🤝 2 promises due                 │
│  📅 1 meeting at 3:00 PM           │
│                                    │
│  PULSE BOARD                       │
│  ─────────────────────────────     │
│  🔴 HOT    3  ← tap to see         │
│  🟡 WARM   8                       │
│  🔵 COOL   5  ← 2 need attention   │
│  ⚫ SILENT 2  ← urgent             │
│                                    │
│  PIPELINE SUMMARY                  │
│  ─────────────────────────────     │
│  Active enquiries: 14              │
│  Total potential: ₹2,45,000        │
│  Won this month: ₹38,000           │
│                                    │
│  [+ Quick Capture]                 │
└────────────────────────────────────┘
```

### 6.2 Web Dashboard

```
Full dashboard with:
  → Pulse Board (visual card grid, sortable by score)
  → Pipeline kanban view
  → Today's actions list (follow-ups + promises + meetings)
  → Team performance panel (Plus/Pro plans)
  → Monthly conversion summary
  → Source analysis (where do contacts come from)
  → Lost reason analysis (why deals are lost)
  → Top contacts by value
  → Contacts needing attention (silent + overdue)
  → Activity feed (recent thread entries across all contacts)
  → Notification center
```

---

## 7. ZIPULSE INTEGRATIONS WITH ZIORBIT ECOSYSTEM

### 7.1 ZiMatch → ZiPulse

```
TRIGGER: zi_match_requirement created by requester
  → Auto-create ZiPulse contact for requester
  → Thread entry: "Requirement posted on ZiMatch: [title]"
  → Follow-up scheduled for after proposal deadline

TRIGGER: zi_match_deal.confirmed
  → Contact pulse status → HOT
  → Thread entry: "Deal confirmed on ZiMatch: ₹[amount]"
  → Promise created: "Fulfill requirement by [deadline]"

TRIGGER: zi_match_deal.completed
  → Thread entry: "ZiMatch deal completed: ₹[amount] received"
  → Pulse status → CLOSED (for this deal thread)
  → Archive entry created
```

### 7.2 ZiPawn → ZiPulse

```
TRIGGER: New pawn customer created in ZiPawn
  → Auto-create ZiPulse contact (if not exists)
  → Thread entry: "New pawn ticket created: [TKT ref code]"
  → Follow-up auto-scheduled: 3 days before loan due date

TRIGGER: Loan payment received in ZiPawn
  → Thread entry: "Payment received: ₹[amount] — [PAY ref code]"

TRIGGER: Loan overdue in ZiPawn
  → Thread entry: "⚠️ Loan overdue since [date]"
  → Pulse status → HOT (urgent attention needed)
  → Alert to owner

TRIGGER: Item ready for auction in ZiPawn
  → Thread entry: "Item moving to auction: [TKT ref code]"
  → Follow-up: "Contact customer about unclaimed item"
```

### 7.3 ZiFleet → ZiPulse

```
TRIGGER: New fleet client created
  → Auto-create ZiPulse contact
  → Thread entry: "New fleet client onboarded"

TRIGGER: Trip completed for client
  → Thread entry: "Trip completed: [TRP ref code], ₹[amount]"
  → If client hasn't booked in 30 days → COOL alert

TRIGGER: Invoice unpaid 7 days
  → Thread entry: "⚠️ Invoice overdue: [INV ref code]"
  → Promise auto-created: "Follow up on payment"
```

### 7.4 ZiFood → ZiPulse

```
TRIGGER: Corporate client order
  → Auto-create / update ZiPulse contact
  → Thread entry: "Order placed: [ORD ref code], ₹[amount]"

TRIGGER: Corporate client inactive 30 days
  → COOL alert → follow-up suggestion: "Re-engage [client name]"
```

### 7.5 ZiLedger → ZiPulse

```
TRIGGER: Payment received from ZiLedger contact
  → Thread entry: "Payment received: ₹[amount] — [PAY ref code]"
  → Pulse score boost

TRIGGER: Invoice overdue in ZiLedger
  → Thread entry: "⚠️ Invoice overdue: ₹[amount] — [INV ref code]"
  → Promise auto-created: "Follow up on overdue payment"
  → Pulse score impact
```

### 7.6 ZiPost → ZiPulse

```
ZiPulse uses ZiPost as its notification delivery engine:
  → Follow-up due  → WhatsApp reminder to owner
  → Promise due    → SMS/WhatsApp to owner
  → Silent alert   → Push notification to owner
  → Meeting reminder → Push + WhatsApp to owner

Future: Send WhatsApp directly to CONTACT from ZiPulse
  → "Just following up on our conversation last week..."
  → Template-based messages (ZiPost WhatsApp templates)
```

### 7.7 ZiPartner → ZiPulse

```
When a ZiPartner agent refers a lead:
  → Contact created in business's ZiPulse
  → Source = 'zipartner'
  → Agent reference stored (for commission tracking)
  → Thread entry: "Lead referred by ZiPartner agent: [agent name]"
  → If lead converts → commission triggered in ZiPartner
```

---

## 8. DATABASE SCHEMA — COMPLETE

```sql
-- ═══════════════════════════════════════════════════
-- ZIPULSE CONTACTS
-- ═══════════════════════════════════════════════════
CREATE TABLE zipulse_contacts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code               TEXT NOT NULL,            -- CSTA01 (unique within subscription)
  ref_code              TEXT UNIQUE NOT NULL,     -- ZEA01ZPLSA01CSTA01
  entity_id             UUID NOT NULL REFERENCES zi_entities(id),
  subscription_id       UUID NOT NULL REFERENCES zi_subscriptions(id),
  branch_id             UUID REFERENCES zi_branches(id),
  assigned_to           UUID REFERENCES zi_individuals(id),

  -- Identity
  individual_id         UUID REFERENCES zi_individuals(id),  -- if ZiOrbit user
  name                  TEXT NOT NULL,
  company_name          TEXT,
  designation           TEXT,
  mobile_primary        TEXT,                     -- last 4 for display
  mobile_alternate      TEXT,
  email                 TEXT,
  address               TEXT,
  city                  TEXT,
  country_code          TEXT DEFAULT 'IN',
  profile_photo_url     TEXT,

  -- Source
  source                TEXT NOT NULL DEFAULT 'manual',
                        -- manual|walk_in|zimatch|zipawn|zifleet|zifood
                        -- zicare|ziledger|zipartner|referral|cold_call|inbound
  source_ref_code       TEXT,                     -- reference from source app
  referred_by_contact   UUID REFERENCES zipulse_contacts(id),
  referred_by_agent     UUID REFERENCES zi_individuals(id),

  -- Pulse
  pulse_score           INTEGER NOT NULL DEFAULT 70 CHECK (pulse_score BETWEEN 0 AND 100),
  pulse_status          TEXT NOT NULL DEFAULT 'warm',
                        -- hot|warm|cool|silent|closed|lost
  last_contact_at       TIMESTAMPTZ,
  next_followup_at      TIMESTAMPTZ,
  next_followup_channel TEXT,                     -- call|whatsapp|visit|email|meeting
  days_since_contact    INTEGER GENERATED ALWAYS AS
                        (EXTRACT(DAY FROM NOW() - last_contact_at)::INTEGER) STORED,

  -- Relationship stats (denormalized for performance)
  total_threads         INTEGER DEFAULT 0,
  total_promises        INTEGER DEFAULT 0,
  broken_promises       INTEGER DEFAULT 0,
  total_enquiries       INTEGER DEFAULT 0,
  won_enquiries         INTEGER DEFAULT 0,
  total_won_value       NUMERIC DEFAULT 0,
  total_followups       INTEGER DEFAULT 0,
  missed_followups      INTEGER DEFAULT 0,

  -- Status
  is_active             BOOLEAN DEFAULT TRUE,
  is_archived           BOOLEAN DEFAULT FALSE,
  archived_at           TIMESTAMPTZ,
  archive_reason        TEXT,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subscription_id, zi_code)
);

-- ═══════════════════════════════════════════════════
-- CONTACT TAGS
-- ═══════════════════════════════════════════════════
CREATE TABLE zipulse_contact_tags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_code        TEXT UNIQUE NOT NULL,           -- ZEA01ZPLSA01TAGA01
  entity_id       UUID NOT NULL REFERENCES zi_entities(id),
  subscription_id UUID NOT NULL REFERENCES zi_subscriptions(id),
  contact_id      UUID NOT NULL REFERENCES zipulse_contacts(id),
  tag_name        TEXT NOT NULL,
  tag_type        TEXT DEFAULT 'custom',          -- system|custom
  tag_color       TEXT,                           -- hex color for UI
  created_by      UUID REFERENCES zi_individuals(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- CONVERSATION THREADS
-- ═══════════════════════════════════════════════════
CREATE TABLE zipulse_threads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code         TEXT NOT NULL,                  -- THR26A01
  ref_code        TEXT UNIQUE NOT NULL,           -- ZEA01ZPLSA01CSTA01THR26A01
  entity_id       UUID NOT NULL REFERENCES zi_entities(id),
  subscription_id UUID NOT NULL REFERENCES zi_subscriptions(id),
  contact_id      UUID NOT NULL REFERENCES zipulse_contacts(id),
  enquiry_id      UUID REFERENCES zipulse_enquiries(id),  -- optional link
  meeting_id      UUID REFERENCES zipulse_meetings(id),   -- optional link

  entry_type      TEXT NOT NULL,
                  -- note|voice_note|file|photo|promise|meeting|
                  -- quote_sent|follow_up|status_change|payment|system
  content         TEXT,                           -- text content
  voice_url       TEXT,                           -- voice note file URL
  voice_transcript TEXT,                          -- auto-transcribed (Phase 2)
  file_url        TEXT,                           -- attached file URL
  file_name       TEXT,
  file_type       TEXT,                           -- pdf|image|doc|audio
  is_pinned       BOOLEAN DEFAULT FALSE,
  is_private      BOOLEAN DEFAULT FALSE,          -- only visible to creator
  source_app      TEXT,                           -- which app generated this entry
  source_ref_code TEXT,                           -- reference from source app
  created_by      UUID NOT NULL REFERENCES zi_individuals(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, zi_code)
);

-- ═══════════════════════════════════════════════════
-- PROMISES
-- ═══════════════════════════════════════════════════
CREATE TABLE zipulse_promises (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code         TEXT NOT NULL,                  -- PRM26A01
  ref_code        TEXT UNIQUE NOT NULL,           -- ZEA01ZPLSA01CSTA01PRM26A01
  entity_id       UUID NOT NULL REFERENCES zi_entities(id),
  subscription_id UUID NOT NULL REFERENCES zi_subscriptions(id),
  contact_id      UUID NOT NULL REFERENCES zipulse_contacts(id),
  enquiry_id      UUID REFERENCES zipulse_enquiries(id),
  thread_id       UUID REFERENCES zipulse_threads(id),

  promise_type    TEXT NOT NULL,
                  -- send_quote|call_back|visit|confirm|deliver|
                  -- introduce|payment|send_document|custom
  direction       TEXT NOT NULL DEFAULT 'owner_to_contact',
                  -- owner_to_contact|contact_to_owner
  description     TEXT NOT NULL,
  promised_by     UUID REFERENCES zi_individuals(id),
  due_at          TIMESTAMPTZ NOT NULL,
  reminder_at     TIMESTAMPTZ,

  is_fulfilled    BOOLEAN DEFAULT FALSE,
  fulfilled_at    TIMESTAMPTZ,
  fulfillment_note TEXT,
  is_broken       BOOLEAN DEFAULT FALSE,
  broken_reason   TEXT,

  created_by      UUID NOT NULL REFERENCES zi_individuals(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, zi_code)
);

-- ═══════════════════════════════════════════════════
-- ENQUIRIES / PIPELINE
-- ═══════════════════════════════════════════════════
CREATE TABLE zipulse_enquiries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code         TEXT NOT NULL,                  -- ENQ26A01
  ref_code        TEXT UNIQUE NOT NULL,           -- ZEA01ZPLSA01ENQ26A01
  entity_id       UUID NOT NULL REFERENCES zi_entities(id),
  subscription_id UUID NOT NULL REFERENCES zi_subscriptions(id),
  contact_id      UUID NOT NULL REFERENCES zipulse_contacts(id),
  assigned_to     UUID REFERENCES zi_individuals(id),

  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT,                           -- product/service category
  product_interest TEXT,                          -- which ZiOrbit product if applicable
  value           NUMERIC DEFAULT 0,
  currency        TEXT DEFAULT 'INR',
  probability     INTEGER DEFAULT 50 CHECK (probability BETWEEN 0 AND 100),
  source          TEXT,

  -- Pipeline
  stage           TEXT NOT NULL DEFAULT 'new',
                  -- new|contacted|interested|quote_sent|negotiating|
                  -- decision_pending|won|lost|on_hold
  stage_history   JSONB DEFAULT '[]',             -- [{stage, changed_at, changed_by, note}]
  stage_updated_at TIMESTAMPTZ DEFAULT NOW(),
  days_in_stage   INTEGER,

  -- Closure
  expected_close  DATE,
  won_at          TIMESTAMPTZ,
  won_value       NUMERIC,
  lost_at         TIMESTAMPTZ,
  lost_reason     TEXT,
  lost_to         TEXT,                           -- competitor name

  -- Counts
  total_threads   INTEGER DEFAULT 0,
  total_followups INTEGER DEFAULT 0,
  total_promises  INTEGER DEFAULT 0,

  is_archived     BOOLEAN DEFAULT FALSE,
  created_by      UUID NOT NULL REFERENCES zi_individuals(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subscription_id, zi_code)
);

-- ═══════════════════════════════════════════════════
-- FOLLOW-UPS
-- ═══════════════════════════════════════════════════
CREATE TABLE zipulse_followups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code         TEXT NOT NULL,                  -- FUP26A01
  ref_code        TEXT UNIQUE NOT NULL,           -- ZEA01ZPLSA01CSTA01FUP26A01
  entity_id       UUID NOT NULL REFERENCES zi_entities(id),
  subscription_id UUID NOT NULL REFERENCES zi_subscriptions(id),
  contact_id      UUID NOT NULL REFERENCES zipulse_contacts(id),
  enquiry_id      UUID REFERENCES zipulse_enquiries(id),
  assigned_to     UUID NOT NULL REFERENCES zi_individuals(id),

  channel         TEXT NOT NULL DEFAULT 'call',
                  -- call|whatsapp|visit|email|meeting
  scheduled_at    TIMESTAMPTZ NOT NULL,
  reminder_at     TIMESTAMPTZ,
  agenda          TEXT,

  -- Completion
  status          TEXT NOT NULL DEFAULT 'pending',
                  -- pending|done|missed|rescheduled|cancelled
  completed_at    TIMESTAMPTZ,
  outcome         TEXT,
                  -- spoke_positive|spoke_neutral|spoke_negative|
                  -- no_answer|rescheduled|meeting_scheduled|
                  -- deal_progressed|deal_closed|deal_lost
  outcome_notes   TEXT,
  next_followup_at TIMESTAMPTZ,

  is_recurring    BOOLEAN DEFAULT FALSE,
  recurrence_type TEXT,                           -- daily|weekly|monthly|quarterly
  parent_followup UUID REFERENCES zipulse_followups(id),

  created_by      UUID NOT NULL REFERENCES zi_individuals(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, zi_code)
);

-- ═══════════════════════════════════════════════════
-- MEETINGS
-- ═══════════════════════════════════════════════════
CREATE TABLE zipulse_meetings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code         TEXT NOT NULL,                  -- MTG26A01
  ref_code        TEXT UNIQUE NOT NULL,           -- ZEA01ZPLSA01MTG26A01
  entity_id       UUID NOT NULL REFERENCES zi_entities(id),
  subscription_id UUID NOT NULL REFERENCES zi_subscriptions(id),
  contact_id      UUID NOT NULL REFERENCES zipulse_contacts(id),
  enquiry_id      UUID REFERENCES zipulse_enquiries(id),

  title           TEXT NOT NULL,
  location        TEXT,
  location_url    TEXT,                           -- maps link
  meeting_url     TEXT,                           -- video call link
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_mins   INTEGER DEFAULT 30,
  agenda          TEXT,
  pre_notes       TEXT,

  status          TEXT NOT NULL DEFAULT 'scheduled',
                  -- scheduled|completed|cancelled|rescheduled
  completed_at    TIMESTAMPTZ,
  outcome         TEXT,
  action_items    JSONB DEFAULT '[]',             -- [{description, assigned_to, due_date}]
  next_step       TEXT,

  created_by      UUID NOT NULL REFERENCES zi_individuals(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subscription_id, zi_code)
);

-- ═══════════════════════════════════════════════════
-- SMART INBOX
-- ═══════════════════════════════════════════════════
CREATE TABLE zipulse_inbox (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID NOT NULL REFERENCES zi_entities(id),
  subscription_id UUID NOT NULL REFERENCES zi_subscriptions(id),
  captured_by     UUID NOT NULL REFERENCES zi_individuals(id),

  content_type    TEXT NOT NULL DEFAULT 'note',
                  -- note|voice|photo|file|link|system
  content         TEXT,
  media_url       TEXT,
  source_app      TEXT,
  source_ref_code TEXT,

  status          TEXT NOT NULL DEFAULT 'pending',
                  -- pending|converted|archived
  converted_to    TEXT,                           -- contact|enquiry|followup|note|task
  converted_ref   TEXT,                           -- ref_code of converted record
  converted_at    TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

-- ═══════════════════════════════════════════════════
-- PULSE SCORE HISTORY (for trend tracking)
-- ═══════════════════════════════════════════════════
CREATE TABLE zipulse_score_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      UUID NOT NULL REFERENCES zipulse_contacts(id),
  score           INTEGER NOT NULL,
  status          TEXT NOT NULL,
  reason          TEXT,                           -- what triggered the change
  recorded_at     TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 9. SUPABASE ROW LEVEL SECURITY

```sql
-- All ZiPulse tables follow the same RLS pattern
-- Session variable set at login: app.current_entity

ALTER TABLE zipulse_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entity_isolation" ON zipulse_contacts
  USING (entity_id = current_setting('app.current_entity')::uuid);

-- Apply same pattern to ALL zipulse_ tables
-- zipulse_threads, zipulse_promises, zipulse_enquiries
-- zipulse_followups, zipulse_meetings, zipulse_inbox
-- zipulse_contact_tags, zipulse_score_history
```

---

## 10. PRICING AND PLANS

ZiPulse follows the ZiOrbit per-product pricing model exactly.

```
Product code: ZPLS

Trial:  6 months free, full features, 1 user, 1 branch
Solo:   ₹10/day (₹300/month) — 1 user, unlimited contacts
Plus:   ₹20/day (₹600/month) — 5 users, notifications included
Pro:    ₹35/day (₹1,050/month) — unlimited users, API, custom reports

Extra users: ₹5/user/day
Branch rule: Free if branches ≤ users. ₹5/day per extra branch.
Annual: Pay 10 months, get 12 (2 months free per product)

Notification credits: SMS ₹0.15, WhatsApp ₹0.30, Email ₹0.02
```

---

## 11. MOBILE APP FEATURES

```
PRIORITY 1 — Must have at launch:
  → Quick Capture (30-second contact creation)
  → Pulse Board (today's view)
  → Contact profile view
  → Thread view per contact
  → Add thread entry (note/voice/photo)
  → Create and complete follow-up
  → Create promise
  → Mark promise fulfilled
  → Enquiry stage update
  → Daily digest notification

PRIORITY 2 — Soon after launch:
  → Smart Inbox
  → Meeting scheduling
  → Pipeline kanban view
  → Contact search
  → Tag management
  → Archive access

PRIORITY 3 — Growth phase:
  → Voice note auto-transcription
  → Business card OCR
  → WhatsApp message sending via ZiPost
  → Team view and reassignment
  → Offline draft mode
```

---

## 12. WEB PORTAL FEATURES

```
PRIORITY 1 — Must have at launch:
  → Full dashboard with Pulse Board
  → Contact management (create/edit/search/filter)
  → Full thread view with all entry types
  → Pipeline kanban view
  → Follow-up calendar view
  → Promise tracker list
  → Meeting management
  → Reports: conversion, source, stage analysis
  → Team performance view (Plus/Pro)

PRIORITY 2 — Soon after launch:
  → Archive and knowledge base search
  → Custom tag management
  → Bulk operations (reassign, retag, archive)
  → Import contacts from CSV
  → Export data to CSV/PDF
  → Advanced filters and saved views

PRIORITY 3 — Growth phase:
  → AI-powered pulse suggestions
  → Email sending from ZiPulse
  → Workflow automation (if stage X → do Y)
  → Custom pipeline stages
  → Integration configuration panel
```

---

## 13. BUILD PHASES

### Phase 1 — MVP (Weeks 1–8)
```
→ Core tables: contacts, threads, followups, promises
→ Quick Capture (mobile)
→ Contact profile view
→ Thread add / view
→ Follow-up create / complete
→ Promise create / fulfill
→ Basic Pulse Score (recency + follow-up only)
→ Simple Pulse Board (mobile)
→ Daily reminder notifications via push
→ ZiPawn integration (auto-create contact)
```

### Phase 2 — Core Product (Weeks 9–16)
```
→ Enquiry pipeline (full kanban)
→ Meeting module
→ Smart Inbox
→ Full Pulse Score (all 5 factors)
→ Pulse decay automation
→ Tags and segmentation
→ Web portal dashboard
→ ZiMatch integration
→ ZiFleet integration
→ ZiLedger integration
→ ZiPost notifications (WhatsApp/SMS to owner)
→ Team features (Plus/Pro plans)
→ Archive and search
```

### Phase 3 — Intelligence (Weeks 17–24)
```
→ Voice note auto-transcription (AI)
→ Business card OCR
→ Pulse score AI improvements
→ Smart follow-up suggestions
→ Won/Lost analysis dashboard
→ Source ROI analysis (where do best leads come from)
→ Send WhatsApp to contacts via ZiPost
→ Import contacts from CSV
→ Export reports to PDF
→ ZiCare integration
→ ZiFood integration
→ ZiChit integration
→ ZiPartner agent dashboard for ZiPulse
```

### Phase 4 — Scale (Month 7+)
```
→ Workflow automation rules
→ Custom pipeline stages
→ API access (Pro plan)
→ Email sending from ZiPulse
→ Multi-language support
→ Advanced analytics
→ ZiOrbit universal contact resolution
  (one contact, all products, unified history)
```

---

## 14. SUCCESS METRICS

```
USER METRICS (measure weekly):
  → Daily active users of ZiPulse
  → Contacts created per week
  → Threads added per active user per day
  → Promises created and fulfilled rate
  → Follow-ups completed vs missed rate
  → Enquiries moved through pipeline per week
  → Won deal rate (% of enquiries that close as won)

BUSINESS METRICS (measure monthly):
  → ZiPulse subscriptions active
  → Trial to paid conversion rate
  → Average contacts per active subscription
  → Average pulse score across all contacts
  → Churn rate (subscriptions cancelled)
  → Notification credits consumed per subscription

HEALTH METRICS (measure daily):
  → Contacts in SILENT zone (target: <10% of total)
  → Broken promise rate (target: <5%)
  → Missed follow-up rate (target: <15%)
  → Inbox items unprocessed >7 days (target: 0)
```

---

## 15. CLAUDE CODE QUICK REFERENCE

```
## ZiPulse — Business Relationship OS

# Product code: ZPLS
# Subscription: ZEA01ZPLSA01 (entity + product)

# Core concept
Every contact has a Pulse Score (0-100)
Higher score = healthier relationship
Score decays without activity
Owner's daily job = keep all pulses strong

# Core tables
zipulse_contacts      → every contact with pulse score
zipulse_threads       → conversation history per contact
zipulse_promises      → commitments made (unique feature)
zipulse_enquiries     → sales pipeline per contact
zipulse_followups     → scheduled actions per contact
zipulse_meetings      → meetings with contacts
zipulse_inbox         → unprocessed captures
zipulse_contact_tags  → segmentation
zipulse_score_history → pulse trend tracking

# Business code pattern
Contact:    ZEA01ZPLSA01CSTA01
Thread:     ZEA01ZPLSA01CSTA01THR26A01
Promise:    ZEA01ZPLSA01CSTA01PRM26A01
Enquiry:    ZEA01ZPLSA01ENQ26A01
Follow-up:  ZEA01ZPLSA01CSTA01FUP26A01
Meeting:    ZEA01ZPLSA01MTG26A01

# Pulse status thresholds
80-100 = hot (active, engaging)
50-79  = warm (regular)
25-49  = cool (slowing, needs attention)
1-24   = silent (danger, re-engage)
0      = lost
special = closed (won)

# ZiOrbit integrations
ZiMatch  → auto-creates contact on requirement/deal
ZiPawn   → auto-creates contact on new customer
ZiFleet  → auto-creates contact on new client
ZiLedger → adds thread entry on invoice/payment
ZiPost   → delivers follow-up notifications to owner
ZiPartner→ tracks referred leads + commission trigger

# Pricing
Trial: 6 months free
Solo:  ₹10/day per product
Plus:  ₹20/day (5 users)
Pro:   ₹35/day (unlimited users + API)
```

---

*Document: ZIPULSE_PRD.md*
*Version: 1.0*
*Add to CLAUDE.md as: @ZIPULSE_PRD.md*
*Read this before: Any ZiPulse screen, feature, table, integration, or notification work*
*Related documents: ZIORBIT_ARCHITECTURE.md, ZIORBIT_PRICING.md*
