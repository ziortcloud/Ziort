# ZiOrbit — Complete Architecture Reference
## Identity · Entity · Codes · Hierarchy · Roles

**Version:** 1.0
**Brand:** ZiOrbit (ziorbit.com)
**Last Updated:** 2026
**Use:** Claude Code memory bank — read this before any schema, migration, or feature work

---

## 1. CORE PHILOSOPHY

```
Every piece of data in ZiOrbit must answer:
  WHO did it?     → Individual code (ZUA01)
  WHERE?          → Entity + Branch (ZEA01ZBRA01)
  WHAT product?   → Product subscription (ZEA01ZPNA01)
  WHAT action?    → Transaction business code (LN26A01)
  FULL TRACE?     → Business reference code (ZEA01ZPNA01LN26A01)
```

Two types of codes exist for every record:
- **Business Code** → short, human readable, for printing / receipts / reports / UI
- **Business Reference Code** → full hierarchy, for debugging / audit / data isolation / admin

No special characters. No underscores. No dashes. No spaces. Ever.

---

## 2. SEQUENCE GENERATOR — ALPHA GROW PATTERN

Used for ALL codes across ALL layers.

### Pattern
```
[PREFIX] + [ALPHA SEQUENCE] + [2-DIGIT NUMBER]

A01 → A02 → ... → A99
B01 → B02 → ... → B99
...
Z01 → Z99
AA01 → AA02 → ... → AA99
AB01 → ...
→ No maximum limit. Infinite growth.
```

### Examples
```
ZUA01 → ZUA02 → ZUA99 → ZUB01 → ZUB99 → ZUAA01 → ZUAA02...
ZEA01 → ZEA02 → ZEA99 → ZEB01 → ZEB99 → ZEAA01 → ZEAA02...
```

### Sequence Generator Logic (Supabase Function)

```sql
CREATE OR REPLACE FUNCTION generate_next_code(prefix TEXT)
RETURNS TEXT AS $$
DECLARE
  last_seq TEXT;
  alpha_part TEXT;
  num_part INT;
  next_alpha TEXT;
  next_num TEXT;
BEGIN
  SELECT last_sequence INTO last_seq
  FROM zi_code_sequences
  WHERE code_prefix = prefix
  FOR UPDATE;

  IF last_seq IS NULL THEN
    INSERT INTO zi_code_sequences (code_prefix, last_sequence, total_issued)
    VALUES (prefix, prefix || 'A01', 1);
    RETURN prefix || 'A01';
  END IF;

  -- Extract alpha and numeric parts
  alpha_part := regexp_replace(last_seq, '^' || prefix || '([A-Z]+)([0-9]+)$', '\1');
  num_part   := (regexp_replace(last_seq, '^' || prefix || '([A-Z]+)([0-9]+)$', '\2'))::INT;

  IF num_part < 99 THEN
    next_num   := lpad((num_part + 1)::TEXT, 2, '0');
    next_alpha := alpha_part;
  ELSE
    next_num   := '01';
    next_alpha := increment_alpha(alpha_part); -- see function below
  END IF;

  UPDATE zi_code_sequences
  SET last_sequence = prefix || next_alpha || next_num,
      total_issued  = total_issued + 1
  WHERE code_prefix = prefix;

  RETURN prefix || next_alpha || next_num;
END;
$$ LANGUAGE plpgsql;

-- Alpha incrementer: A→B, Z→AA, AZ→BA, ZZ→AAA
CREATE OR REPLACE FUNCTION increment_alpha(alpha TEXT)
RETURNS TEXT AS $$
DECLARE
  i INT;
  chars TEXT[];
  carry BOOLEAN := TRUE;
  result TEXT := '';
BEGIN
  FOR i IN 1..length(alpha) LOOP
    chars[i] := substring(alpha FROM i FOR 1);
  END LOOP;

  FOR i IN REVERSE 1..array_length(chars,1) LOOP
    IF carry THEN
      IF chars[i] = 'Z' THEN
        chars[i] := 'A';
        carry := TRUE;
      ELSE
        chars[i] := chr(ascii(chars[i]) + 1);
        carry := FALSE;
      END IF;
    END IF;
  END LOOP;

  IF carry THEN
    result := 'A';
  END IF;

  FOR i IN 1..array_length(chars,1) LOOP
    result := result || chars[i];
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

---

## 3. INDIVIDUAL (PERSON) LAYER

### Purpose
One record per real human being. Permanent. Never deleted. Never recycled.

### Business Code
```
Prefix: ZU
ZUA01, ZUA02 ... ZUA99, ZUB01 ... ZUZ99, ZUAA01 ... (infinite)
```

### Tables

```sql
-- Core identity
zi_individuals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code             TEXT UNIQUE NOT NULL,         -- ZUA01 (generated)
  display_name        TEXT NOT NULL,
  country_code        TEXT NOT NULL,                -- IN, US, AE, SG...
  national_id_type    TEXT,                         -- aadhaar, ssn, nric, emirates_id, nino...
  national_id_hash    TEXT,                         -- SHA256, never raw
  national_id_last6   TEXT,                         -- last 6 digits for display only
  national_id_verified BOOLEAN DEFAULT FALSE,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at        TIMESTAMPTZ
)

-- Email history (current + previous)
zi_individual_emails (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_id       UUID REFERENCES zi_individuals(id),
  email               TEXT NOT NULL,
  is_current          BOOLEAN DEFAULT TRUE,
  is_verified         BOOLEAN DEFAULT FALSE,
  verified_at         TIMESTAMPTZ,
  became_current_at   TIMESTAMPTZ DEFAULT NOW(),
  replaced_at         TIMESTAMPTZ,                  -- null if still current
  UNIQUE(individual_id, email)
)

-- Mobile history (current + previous + recycling protection)
zi_individual_mobiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_id       UUID REFERENCES zi_individuals(id),
  mobile_hash         TEXT NOT NULL,                -- hashed, never raw
  mobile_last4        TEXT NOT NULL,                -- last 4 digits for display
  country_dial_code   TEXT NOT NULL,                -- +91, +1, +971
  is_current          BOOLEAN DEFAULT TRUE,
  is_verified         BOOLEAN DEFAULT FALSE,
  verified_at         TIMESTAMPTZ,
  became_current_at   TIMESTAMPTZ DEFAULT NOW(),
  replaced_at         TIMESTAMPTZ,
  cooldown_until      TIMESTAMPTZ,                  -- replaced_at + 12 months
  UNIQUE(mobile_hash)
)
```

### Rules
- Mobile is NOT the primary identity — it is a verification anchor only
- Mobile recycling: after `replaced_at`, set `cooldown_until = replaced_at + 12 months`
- New signup with same mobile blocked until `cooldown_until` passes
- Email never expires — strongest login anchor
- National ID: never store raw. Always SHA256 hash. Display last 6 only.
- Minimum to register: one verified email OR one verified mobile
- Recommended: email as primary, mobile as secondary
- `zi_code` generated once at creation — never changes

### Login Resolution Flow
```
User enters email or mobile
      ↓
Lookup zi_individual_emails.email  OR  zi_individual_mobiles.mobile_hash
      ↓
Found → return zi_individuals.id + zi_code
      ↓
Load all zi_memberships for this individual
      ↓
If 1 membership  → go directly to that entity dashboard
If multiple      → show entity switcher screen
```

---

## 4. ENTITY (ORGANIZATION) LAYER

### Purpose
Legal business entity. Can be a sole proprietor, company, partnership or trust.
One entity can have multiple products (tenants) and multiple branches.

### Business Code
```
Prefix: ZE
ZEA01, ZEA02 ... ZEA99, ZEB01 ... (infinite)
```

### Examples
```
ZEA01 → Ganesha Enterprises
ZEA02 → Bala Enterprises
ZEA03 → Ravi Gold & Pawn
```

### Tables

```sql
zi_entities (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code             TEXT UNIQUE NOT NULL,         -- ZEA01
  legal_name          TEXT NOT NULL,                -- registered legal name
  trade_name          TEXT,                         -- doing business as
  entity_type         TEXT NOT NULL,                -- sole_proprietor, company, partnership, trust, individual
  country_code        TEXT NOT NULL,
  business_id_type    TEXT,                         -- gst, cin, msme, ein, uen, trade_license...
  business_id_hash    TEXT,                         -- SHA256
  business_id_last6   TEXT,                         -- display only
  business_id_verified BOOLEAN DEFAULT FALSE,
  city                TEXT,
  state               TEXT,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
)
```

### Entity Types
```
sole_proprietor  → Individual running business (Aadhaar = business ID)
company          → Pvt Ltd, Ltd, LLC (CIN/EIN = business ID)
partnership      → 2+ owners (Partnership deed)
trust            → Trust registration
individual       → Person using ZiOrbit for personal use
```

---

## 5. BRANCH LAYER

### Purpose
Physical location or operational unit under an entity.
Branch 1 is always the primary/head office.

### Business Code
```
Prefix: ZBR
ZBRA01, ZBRA02 ... ZBRA99, ZBRB01 ... (infinite)
```

### Business Reference Code
```
[Entity Code][Branch Code]
ZEA01ZBRA01 → Branch 1 of Ganesha Enterprises
ZEA01ZBRA02 → Branch 2 of Ganesha Enterprises
ZEA02ZBRA01 → Branch 1 of Bala Enterprises
```

### Table

```sql
zi_branches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code             TEXT NOT NULL,                -- ZBRA01 (unique within entity)
  entity_id           UUID REFERENCES zi_entities(id),
  ref_code            TEXT UNIQUE NOT NULL,         -- ZEA01ZBRA01 (globally unique)
  name                TEXT NOT NULL,
  address             TEXT,
  city                TEXT,
  state               TEXT,
  country_code        TEXT,
  is_primary          BOOLEAN DEFAULT FALSE,        -- head office
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_id, zi_code)
)
```

---

## 6. PRODUCT SUBSCRIPTION (TENANT) LAYER

### Purpose
One subscription record per product per entity.
An entity can subscribe to multiple products independently.
Each product subscription is its own isolated data environment.

### Product Codes (Consonant-based, max 4 chars)

| Product | Derivation | Product Code |
|---------|-----------|--------------|
| ZiPawn | PAWN → PWN | ZPN |
| ZiFleet | FLEET → FLT | ZFLT |
| ZiLoad | LOAD → LD | ZLD |
| ZiFood | FOOD → FD | ZFD |
| ZiCare | CARE → CR | ZCR |
| ZiShop | SHOP → SHP | ZSHP |
| ZiChit | CHIT → CHT | ZCHT |
| ZiBuild | BUILD → BLD | ZBLD |
| ZiYield | YIELD → YLD | ZYLD |
| ZiPost | POST → PST | ZPST |
| ZiScan | SCAN → SCN | ZSCN |
| ZiCalc | CALC → CLC | ZCLC |
| ZiReceipt | RECEIPT → RCPT | ZRCP |
| ZiInvoice | INVOICE → NVC | ZNVC |
| ZiQuote | QUOTE → QT | ZQT |
| ZiLedger | LEDGER → LDG | ZLDG |
| ZiPartner | PARTNER → PRTN | ZPRTN |

### Subscription Business Code
```
[Product Code] + [Alpha Sequence]
ZPNA01 → 1st ZiPawn subscription
ZPNA02 → 2nd ZiPawn subscription (if entity has 2)
ZFLTA01 → 1st ZiFleet subscription
```

### Business Reference Code
```
[Entity Code][Product Subscription Code]
ZEA01ZPNA01  → Ganesha Enterprises, ZiPawn subscription 1
ZEA01ZFLTA01 → Ganesha Enterprises, ZiFleet subscription 1
ZEA02ZPNA01  → Bala Enterprises, ZiPawn subscription 1
```

### Table

```sql
zi_subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code             TEXT NOT NULL,                -- ZPNA01
  entity_id           UUID REFERENCES zi_entities(id),
  ref_code            TEXT UNIQUE NOT NULL,         -- ZEA01ZPNA01
  product_code        TEXT NOT NULL,                -- ZPN, ZFLT, ZLD...
  product_name        TEXT NOT NULL,                -- ZiPawn, ZiFleet...
  plan_type           TEXT NOT NULL,                -- trial, solo, plus, pro
  status              TEXT NOT NULL,                -- trial, active, paused, cancelled
  trial_start         DATE,
  trial_end           DATE,
  billing_start       DATE,
  is_annual           BOOLEAN DEFAULT FALSE,
  primary_owner_id    UUID REFERENCES zi_individuals(id),
  billing_owner_id    UUID REFERENCES zi_individuals(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_id, zi_code)
)
```

---

## 7. MEMBERSHIP LAYER

### Purpose
Links an individual to an entity with a specific role.
Same individual can have different roles in different entities.
Role defines permissions within that entity context.

### Business Reference Code
```
[Entity Code][Individual Code]
ZEA01ZUA01 → Ravi (ZUA01) as member of Ganesha Enterprises (ZEA01)
ZEA02ZUA01 → Same Ravi as member of Bala Enterprises (ZEA02)
ZEA01ZUA02 → Priya in Ganesha Enterprises

Branch-level reference:
ZEA01ZBRA01ZUA01 → Ravi assigned to Branch 1 of Ganesha
ZEA01ZBRA02ZUA01 → Ravi assigned to Branch 2 of Ganesha
```

### Roles
```
owner         → Full control + billing access + all branches
co_owner      → Full control, no billing, all branches
partner       → View + approve + equity tracking, no operations
manager       → Operations + reports, no settings, assigned branches
staff         → Assigned tasks only, assigned branch only
custom        → Owner-defined permissions via JSON
```

### Table

```sql
zi_memberships (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_code            TEXT UNIQUE NOT NULL,         -- ZEA01ZUA01
  entity_id           UUID REFERENCES zi_entities(id),
  individual_id       UUID REFERENCES zi_individuals(id),
  role                TEXT NOT NULL,                -- owner, co_owner, partner, manager, staff, custom
  is_primary_owner    BOOLEAN DEFAULT FALSE,        -- only one per entity
  is_billing_owner    BOOLEAN DEFAULT FALSE,        -- only one per entity
  equity_percent      NUMERIC(5,2),                 -- for partners and co-owners
  permissions         JSONB,                        -- for custom roles
  branch_access       JSONB,                        -- array of branch ref_codes
  invited_by          UUID REFERENCES zi_individuals(id),
  is_active           BOOLEAN DEFAULT TRUE,
  joined_at           TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,                  -- for temporary staff
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_id, individual_id)
)
```

### Multiple Ownership Rules
```
is_primary_owner = TRUE  → exactly one per entity (enforced by CHECK constraint)
is_billing_owner = TRUE  → exactly one per entity (enforced by CHECK constraint)
role = owner             → multiple allowed
role = co_owner          → multiple allowed
role = partner           → multiple allowed, equity_percent tracked
equity_percent total     → should sum to 100 (enforced at app level)
```

---

## 8. BUSINESS CONTEXT LAYER

### Purpose
People who interact WITH a business — not members OF it.
Customers, suppliers, vendors, agents.
Always scoped to a specific entity + product subscription.
Linked to zi_individuals when the person is on ZiOrbit.
Nullable individual_id for walk-ins or external parties.

### Business Reference Code
```
[Entity Code][Subscription Code][Contact Type Code][Sequence]
ZEA01ZPNA01CSTA01 → Customer 1 in Ganesha ZiPawn
ZEA01ZPNA01SUPA01 → Supplier 1 in Ganesha ZiPawn
ZEA01ZFLTA01CSTA01 → Customer 1 in Ganesha ZiFleet
```

### Contact Type Codes
```
CST → Customer
SUP → Supplier
VND → Vendor
AGT → Agent
PTR → Partner (external business partner)
```

### Table

```sql
zi_biz_contacts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zi_code             TEXT NOT NULL,                -- CSTA01
  ref_code            TEXT UNIQUE NOT NULL,         -- ZEA01ZPNA01CSTA01
  entity_id           UUID REFERENCES zi_entities(id),
  subscription_id     UUID REFERENCES zi_subscriptions(id),
  individual_id       UUID REFERENCES zi_individuals(id),  -- null if not on platform
  contact_type        TEXT NOT NULL,                -- CST, SUP, VND, AGT, PTR
  display_name        TEXT NOT NULL,                -- cached
  mobile_display      TEXT,                         -- last 4 digits cached
  email_display       TEXT,                         -- cached
  is_verified         BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_id, subscription_id, contact_type, zi_code)
)
```

### Walk-in Resolution
```
Walk-in customer added (no ZiOrbit account):
  individual_id = NULL
  mobile_display = last 4 digits stored

Later customer registers on ZiOrbit:
  System checks mobile against zi_individual_mobiles
  Match found → update zi_biz_contacts.individual_id
  No data loss. No duplication.
```

---

## 9. TRANSACTION LAYER — BUSINESS CODES

### Business Code Pattern
```
[TYPE PREFIX][YY][ALPHA SEQUENCE]

TYPE PREFIX → 2-4 chars (see prefix library)
YY          → last 2 digits of current year (26 for 2026)
ALPHA SEQ   → A01, A02... grows infinitely
```

### Business Reference Code Pattern
```
LEVEL 1 (Entity + Product + Transaction):
[Entity][Subscription][Transaction Code]
ZEA01ZPNA01LN26A01

LEVEL 2 (With Branch):
[Entity][Branch][Subscription][Transaction Code]
ZEA01ZBRA01ZPNA01LN26A01

LEVEL 3 (Sub-transaction on parent):
[Entity][Subscription][Parent Transaction][Child Transaction]
ZEA01ZPNA01LN26A01PAY26A01
```

---

## 10. TRANSACTION PREFIX LIBRARY

### ZiPawn Transactions

| Business Code | Prefix | Full Name | Ref Code Example |
|--------------|--------|-----------|-----------------|
| LN26A01 | LN | Loan Account | ZEA01ZPNA01LN26A01 |
| PAY26A01 | PAY | Loan Payment | ZEA01ZPNA01LN26A01PAY26A01 |
| INT26A01 | INT | Loan Interest | ZEA01ZPNA01LN26A01INT26A01 |
| TKT26A01 | TKT | Pawn Ticket | ZEA01ZPNA01TKT26A01 |
| REL26A01 | REL | Item Release | ZEA01ZPNA01TKT26A01REL26A01 |
| AUC26A01 | AUC | Auction Record | ZEA01ZPNA01AUC26A01 |
| VAL26A01 | VAL | Gold Valuation | ZEA01ZPNA01TKT26A01VAL26A01 |

### ZiFleet Transactions

| Business Code | Prefix | Full Name | Ref Code Example |
|--------------|--------|-----------|-----------------|
| VH26A01 | VH | Vehicle Registration | ZEA01ZFLTA01VH26A01 |
| TRP26A01 | TRP | Trip Record | ZEA01ZFLTA01TRP26A01 |
| FUL26A01 | FUL | Fuel Log | ZEA01ZFLTA01TRP26A01FUL26A01 |
| MNT26A01 | MNT | Maintenance | ZEA01ZFLTA01VH26A01MNT26A01 |
| EXP26A01 | EXP | Expense | ZEA01ZFLTA01TRP26A01EXP26A01 |
| DRV26A01 | DRV | Driver Record | ZEA01ZFLTA01DRV26A01 |

### ZiLoad Transactions

| Business Code | Prefix | Full Name | Ref Code Example |
|--------------|--------|-----------|-----------------|
| LD26A01 | LD | Load Booking | ZEA01ZLDA01LD26A01 |
| BID26A01 | BID | Bid Record | ZEA01ZLDA01LD26A01BID26A01 |
| DLV26A01 | DLV | Delivery Record | ZEA01ZLDA01LD26A01DLV26A01 |

### ZiLedger Transactions

| Business Code | Prefix | Full Name | Ref Code Example |
|--------------|--------|-----------|-----------------|
| INV26A01 | INV | Invoice | ZEA01ZLDGA01INV26A01 |
| PAY26A01 | PAY | Payment Received | ZEA01ZLDGA01INV26A01PAY26A01 |
| EXP26A01 | EXP | Expense | ZEA01ZLDGA01EXP26A01 |
| JRN26A01 | JRN | Journal Entry | ZEA01ZLDGA01JRN26A01 |
| CRN26A01 | CRN | Credit Note | ZEA01ZLDGA01INV26A01CRN26A01 |
| DBN26A01 | DBN | Debit Note | ZEA01ZLDGA01INV26A01DBN26A01 |

### ZiFood Transactions

| Business Code | Prefix | Full Name | Ref Code Example |
|--------------|--------|-----------|-----------------|
| ORD26A01 | ORD | Order | ZEA01ZFDA01ORD26A01 |
| KOT26A01 | KOT | Kitchen Order | ZEA01ZFDA01ORD26A01KOT26A01 |
| TBL26A01 | TBL | Table Record | ZEA01ZFDA01TBL26A01 |
| PAY26A01 | PAY | Bill Payment | ZEA01ZFDA01ORD26A01PAY26A01 |
| RFD26A01 | RFD | Refund | ZEA01ZFDA01ORD26A01RFD26A01 |

### ZiCare Transactions

| Business Code | Prefix | Full Name | Ref Code Example |
|--------------|--------|-----------|-----------------|
| PAT26A01 | PAT | Patient Record | ZEA01ZCRA01PAT26A01 |
| OPD26A01 | OPD | OPD Visit | ZEA01ZCRA01PAT26A01OPD26A01 |
| RX26A01 | RX | Prescription | ZEA01ZCRA01PAT26A01OPD26A01RX26A01 |
| BLL26A01 | BLL | Bill | ZEA01ZCRA01PAT26A01BLL26A01 |

### ZiChit Transactions

| Business Code | Prefix | Full Name | Ref Code Example |
|--------------|--------|-----------|-----------------|
| CHT26A01 | CHT | Chit Group | ZEA01ZCHTA01CHT26A01 |
| MBR26A01 | MBR | Member Record | ZEA01ZCHTA01CHT26A01MBR26A01 |
| AUC26A01 | AUC | Auction | ZEA01ZCHTA01CHT26A01AUC26A01 |
| PAY26A01 | PAY | Payment | ZEA01ZCHTA01CHT26A01MBR26A01PAY26A01 |
| LN26A01 | LN | Loan | ZEA01ZCHTA01LN26A01 |

### ZiBuild Transactions

| Business Code | Prefix | Full Name | Ref Code Example |
|--------------|--------|-----------|-----------------|
| MTR26A01 | MTR | Material Record | ZEA01ZBLD A01MTR26A01 |
| SUP26A01 | SUP | Supplier Record | ZEA01ZBLDA01SUP26A01 |
| ORD26A01 | ORD | Order | ZEA01ZBLDA01ORD26A01 |
| QT26A01 | QT | Quotation | ZEA01ZBLDA01QT26A01 |

### ZiYield Transactions

| Business Code | Prefix | Full Name | Ref Code Example |
|--------------|--------|-----------|-----------------|
| FRM26A01 | FRM | Farm Record | ZEA01ZYLDA01FRM26A01 |
| CRP26A01 | CRP | Crop Season | ZEA01ZYLDA01FRM26A01CRP26A01 |
| HRV26A01 | HRV | Harvest Record | ZEA01ZYLDA01FRM26A01CRP26A01HRV26A01 |
| EXP26A01 | EXP | Expense | ZEA01ZYLDA01FRM26A01EXP26A01 |

### Universal Transactions (All Products)

| Business Code | Prefix | Full Name | Notes |
|--------------|--------|-----------|-------|
| PAY26A01 | PAY | Payment | Any payment |
| RCP26A01 | RCP | Receipt | Any receipt |
| EXP26A01 | EXP | Expense | Any expense |
| NOT26A01 | NOT | Notification Log | SMS/WA/Email sent |
| ATT26A01 | ATT | Attachment | Document upload |
| CMT26A01 | CMT | Comment/Note | Internal notes |
| USR26A01 | USR | User Activity | Login/action log |

---

## 11. COMPLETE HIERARCHY EXAMPLE

### Ganesha Enterprises — Full Code Map

```
ZEA01                                    ENTITY: Ganesha Enterprises
│
├── ZEA01ZBRA01                          BRANCH: Hyderabad Main
├── ZEA01ZBRA02                          BRANCH: Secunderabad
│
├── ZEA01ZUA01                           MEMBER: Ravi (Owner)
├── ZEA01ZUA02                           MEMBER: Priya (Staff)
├── ZEA01ZUA03                           MEMBER: Suresh (Co-owner)
│
├── ZEA01ZBRA01ZUA01                     Ravi assigned to Hyd Main Branch
├── ZEA01ZBRA01ZUA02                     Priya assigned to Hyd Main Branch
├── ZEA01ZBRA02ZUA01                     Ravi assigned to Secunderabad Branch
│
├── ZEA01ZPNA01                          PRODUCT: ZiPawn subscription
│   ├── ZEA01ZPNA01CSTA01                Customer 1 in ZiPawn
│   ├── ZEA01ZPNA01CSTA02                Customer 2 in ZiPawn
│   ├── ZEA01ZPNA01LN26A01               Loan Account 1 (2026)
│   │   ├── ZEA01ZPNA01LN26A01PAY26A01   Payment 1 on Loan 1
│   │   ├── ZEA01ZPNA01LN26A01PAY26A02   Payment 2 on Loan 1
│   │   ├── ZEA01ZPNA01LN26A01INT26A01   Interest 1 on Loan 1
│   │   └── ZEA01ZPNA01LN26A01INT26A02   Interest 2 on Loan 1
│   ├── ZEA01ZPNA01LN26A02               Loan Account 2 (2026)
│   │   └── ZEA01ZPNA01LN26A02PAY26A01   Payment 1 on Loan 2
│   ├── ZEA01ZPNA01TKT26A01              Pawn Ticket 1
│   │   ├── ZEA01ZPNA01TKT26A01VAL26A01  Gold Valuation for Ticket 1
│   │   └── ZEA01ZPNA01TKT26A01REL26A01  Item Release for Ticket 1
│   └── ZEA01ZPNA01TKT26A02              Pawn Ticket 2
│
└── ZEA01ZFLTA01                         PRODUCT: ZiFleet subscription
    ├── ZEA01ZFLTA01VH26A01              Vehicle 1
    │   └── ZEA01ZFLTA01VH26A01MNT26A01  Maintenance record for Vehicle 1
    ├── ZEA01ZFLTA01DRV26A01             Driver 1
    └── ZEA01ZFLTA01TRP26A01             Trip 1
        ├── ZEA01ZFLTA01TRP26A01FUL26A01 Fuel log for Trip 1
        └── ZEA01ZFLTA01TRP26A01EXP26A01 Expense for Trip 1
```

---

### Same User, Two Entities

```
Ravi = ZUA01 (global, permanent, never changes)

In Ganesha Enterprises:
  Membership ref  → ZEA01ZUA01   (Owner)
  Branch ref      → ZEA01ZBRA01ZUA01

In Bala Enterprises:
  Membership ref  → ZEA02ZUA01   (Staff)
  Branch ref      → ZEA02ZBRA01ZUA01

Ravi's pawn transactions in Ganesha:
  ZEA01ZPNA01LN26A01  ← belongs to Ganesha

Ravi's pawn transactions in Bala:
  ZEA02ZPNA01LN26A01  ← belongs to Bala

Zero cross-contamination. Data isolation from code structure itself.
```

---

## 12. DATA ISOLATION RULES

```
Every single record in every product table MUST have:
  entity_id         → UUID of zi_entities
  subscription_id   → UUID of zi_subscriptions
  ref_code          → starts with entity zi_code

Row Level Security (RLS) in Supabase:
  All SELECT, INSERT, UPDATE, DELETE policies
  filter by entity_id = current session entity

Session context set at login:
  SET app.current_entity = 'ZEA01';
  SET app.current_individual = 'ZUA01';
  SET app.current_subscription = 'ZEA01ZPNA01';
```

---

## 13. CODE SEQUENCES TABLE

```sql
zi_code_sequences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_prefix     TEXT UNIQUE NOT NULL,   -- ZU, ZE, ZBR, ZPNA, LN, PAY...
  last_sequence   TEXT NOT NULL,          -- last generated full code
  total_issued    BIGINT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
)

-- Seed data for all prefixes
INSERT INTO zi_code_sequences (code_prefix, last_sequence, total_issued) VALUES
  ('ZU',    'ZUA00', 0),   -- Individuals
  ('ZE',    'ZEA00', 0),   -- Entities
  ('ZBR',   'ZBRA00', 0),  -- Branches
  ('ZPN',   'ZPNA00', 0),  -- ZiPawn subscriptions
  ('ZFLT',  'ZFLTA00', 0), -- ZiFleet subscriptions
  ('ZLD',   'ZLDA00', 0),  -- ZiLoad subscriptions
  ('ZFD',   'ZFDA00', 0),  -- ZiFood subscriptions
  ('ZCR',   'ZCRA00', 0),  -- ZiCare subscriptions
  ('ZSHP',  'ZSHPA00', 0), -- ZiShop subscriptions
  ('ZCHT',  'ZCHTA00', 0), -- ZiChit subscriptions
  ('ZBLD',  'ZBLDA00', 0), -- ZiBuild subscriptions
  ('ZYLD',  'ZYLDA00', 0), -- ZiYield subscriptions
  ('ZPST',  'ZPSTA00', 0), -- ZiPost subscriptions
  ('ZSCN',  'ZSCNA00', 0), -- ZiScan subscriptions
  ('ZCLC',  'ZCLCA00', 0), -- ZiCalc subscriptions
  ('ZRCP',  'ZRCPA00', 0), -- ZiReceipt subscriptions
  ('ZNVC',  'ZNVCA00', 0), -- ZiInvoice subscriptions
  ('ZQT',   'ZQTA00', 0),  -- ZiQuote subscriptions
  ('ZLDG',  'ZLDGA00', 0), -- ZiLedger subscriptions
  ('ZPRTN', 'ZPRTNA00', 0);-- ZiPartner subscriptions
```

---

## 14. NATIONAL ID CONFIG TABLE

```sql
zi_national_id_config (
  country_code      TEXT PRIMARY KEY,
  country_name      TEXT NOT NULL,
  individual_id_name TEXT,              -- Aadhaar, SSN, NRIC, Emirates ID
  individual_format  TEXT,              -- regex for validation
  business_id_name  TEXT,              -- GST, CIN, EIN, UEN, Trade License
  business_format   TEXT,
  store_raw         BOOLEAN DEFAULT FALSE,
  store_hash        BOOLEAN DEFAULT TRUE,
  display_last      INT DEFAULT 6,
  verify_api        TEXT                -- govt verification endpoint if available
)

-- Seed
INSERT INTO zi_national_id_config VALUES
  ('IN', 'India', 'Aadhaar', '^\d{12}$', 'GST/CIN/MSME', NULL, FALSE, TRUE, 6, 'https://api.uidai.gov.in'),
  ('US', 'USA', 'SSN', '^\d{9}$', 'EIN', '^\d{9}$', FALSE, TRUE, 6, NULL),
  ('AE', 'UAE', 'Emirates ID', '^\d{15}$', 'Trade License', NULL, FALSE, TRUE, 6, NULL),
  ('SG', 'Singapore', 'NRIC', '^[STFG]\d{7}[A-Z]$', 'UEN', NULL, FALSE, TRUE, 6, NULL),
  ('GB', 'UK', 'NI Number', '^[A-Z]{2}\d{6}[A-Z]$', 'Companies House', NULL, FALSE, TRUE, 6, NULL),
  ('MY', 'Malaysia', 'MyKad', '^\d{12}$', 'SSM', NULL, FALSE, TRUE, 6, NULL);
```

---

## 15. AUDIT LOG TABLE

```sql
zi_audit_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id         UUID REFERENCES zi_entities(id),
  individual_id     UUID REFERENCES zi_individuals(id),
  subscription_id   UUID REFERENCES zi_subscriptions(id),
  ref_code          TEXT,                -- full hierarchy ref code of affected record
  action            TEXT NOT NULL,       -- CREATE, UPDATE, DELETE, LOGIN, EXPORT
  table_name        TEXT NOT NULL,
  record_id         UUID,
  record_ref_code   TEXT,               -- business ref code of affected record
  old_value         JSONB,
  new_value         JSONB,
  ip_address        TEXT,
  user_agent        TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
)
```

---

## 16. COMPLETE TABLE LIST — ALL LAYERS

```
LAYER 1 — INDIVIDUAL (Person)
  zi_individuals            → Core identity (ZUA01)
  zi_individual_emails      → Current + previous emails
  zi_individual_mobiles     → Current + previous mobiles + recycling cooldown

LAYER 2 — ENTITY (Organization)
  zi_entities               → Legal entity (ZEA01)

LAYER 3 — BRANCH (Location)
  zi_branches               → Branch under entity (ZEA01ZBRA01)

LAYER 4 — PRODUCT SUBSCRIPTION
  zi_subscriptions          → Product instance (ZEA01ZPNA01)

LAYER 5 — MEMBERSHIP (People in Business)
  zi_memberships            → Role + permissions (ZEA01ZUA01)

LAYER 6 — BUSINESS CONTEXT (External Contacts)
  zi_biz_contacts           → Customers, suppliers, vendors (ZEA01ZPNA01CSTA01)

LAYER 7 — TRANSACTIONS (Product-specific)
  zpn_loans                 → ZiPawn loan accounts
  zpn_loan_payments         → Payments on loans
  zpn_loan_interest         → Interest records
  zpn_tickets               → Pawn tickets
  zflt_vehicles             → Fleet vehicles
  zflt_trips                → Trip records
  zflt_drivers              → Driver records
  zld_loads                 → Load bookings
  zld_bids                  → Bids on loads
  zfd_orders                → Restaurant orders
  zfd_kot                   → Kitchen order tickets
  zfd_tables                → Table records
  zcr_patients              → Patient records
  zcr_opd                   → OPD visits
  zcr_prescriptions         → Prescriptions
  zcht_groups               → Chit groups
  zcht_members              → Chit members
  zcht_auctions             → Chit auctions
  zbld_materials            → Construction materials
  zbld_orders               → Material orders
  zyld_farms                → Farm records
  zyld_crops                → Crop seasons

SUPPORTING
  zi_code_sequences         → Sequence generator for all prefixes
  zi_national_id_config     → Per-country ID rules
  zi_audit_log              → Every action logged with full hierarchy
  zi_wallet                 → Prepaid billing wallet per entity
  zi_billing_log            → Daily billing deduction records
  zi_notification_credits   → SMS/WA/Email credit balance
```

---

## 17. GOLDEN RULES — NEVER VIOLATE

```
1. No special characters in any code — no dash, underscore, space
2. Business reference code always starts with entity zi_code (ZEA01...)
3. zi_individuals.zi_code never changes after creation
4. zi_entities.zi_code never changes after creation
5. National ID never stored raw — always SHA256 hash
6. Mobile is NOT identity — it is a verification anchor only
7. Mobile recycling cooldown = 12 months after release
8. One is_billing_owner per entity — enforced at DB level
9. One is_primary_owner per entity — enforced at DB level
10. Every product table row must have entity_id + subscription_id
11. RLS policy filters all queries by entity_id — no exceptions
12. Year in transaction codes = last 2 digits (26 for 2026, 27 for 2027)
13. Transaction codes reset sequence per year (LN26A01 resets to LN27A01)
14. Audit log entry created for every CREATE, UPDATE, DELETE
15. Walk-in contacts: individual_id nullable, linked later when they register
```

---

*Document: ZIORBIT_ARCHITECTURE.md*
*Version: 1.0*
*Use in Claude Code: Add to CLAUDE.md as @ZIORBIT_ARCHITECTURE.md*
*Read this before: Any schema creation, migration, feature build, or data model decision*
