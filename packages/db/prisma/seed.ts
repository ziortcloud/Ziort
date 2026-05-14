import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Ziort database...')

  // ──────────────────────────────────────────────
  // 1. National ID Configuration (country-level)
  // ──────────────────────────────────────────────
  await prisma.ziNationalIdConfig.createMany({
    data: [
      { countryCode: 'IN', countryName: 'India',     individualIdName: 'Aadhaar',    individualFormat: '^\\d{12}$',            businessIdName: 'GST/CIN/MSME', storeRaw: false, storeHash: true, displayLast: 6, verifyApi: 'https://api.uidai.gov.in' },
      { countryCode: 'US', countryName: 'USA',        individualIdName: 'SSN',        individualFormat: '^\\d{9}$',             businessIdName: 'EIN',          businessFormat: '^\\d{9}$',    storeRaw: false, storeHash: true, displayLast: 4 },
      { countryCode: 'AE', countryName: 'UAE',        individualIdName: 'Emirates ID', individualFormat: '^\\d{15}$',           businessIdName: 'Trade License', storeRaw: false, storeHash: true, displayLast: 6 },
      { countryCode: 'SG', countryName: 'Singapore',  individualIdName: 'NRIC',       individualFormat: '^[STFG]\\d{7}[A-Z]$', businessIdName: 'UEN',          storeRaw: false, storeHash: true, displayLast: 6 },
      { countryCode: 'GB', countryName: 'UK',         individualIdName: 'NI Number',  individualFormat: '^[A-Z]{2}\\d{6}[A-Z]$', businessIdName: 'Companies House', storeRaw: false, storeHash: true, displayLast: 6 },
      { countryCode: 'MY', countryName: 'Malaysia',   individualIdName: 'MyKad',      individualFormat: '^\\d{12}$',            businessIdName: 'SSM',          storeRaw: false, storeHash: true, displayLast: 6 },
    ],
    skipDuplicates: true,
  })
  console.log('  ✓ National ID configs')

  // ──────────────────────────────────────────────
  // 2. Code sequences — all known prefixes
  // Format: prefix → placeholder with '00' so first real call → 'A01'
  // ──────────────────────────────────────────────
  await prisma.ziCodeSequence.createMany({
    data: [
      // Identity + Structure
      { codePrefix: 'ZU',    lastSequence: 'ZUA00',     totalIssued: 0n },  // Individuals
      { codePrefix: 'ZE',    lastSequence: 'ZEA00',     totalIssued: 0n },  // Entities
      { codePrefix: 'ZBR',   lastSequence: 'ZBRA00',    totalIssued: 0n },  // Branches

      // Product subscriptions
      { codePrefix: 'ZPN',   lastSequence: 'ZPNA00',    totalIssued: 0n },  // ZiPawn
      { codePrefix: 'ZFLT',  lastSequence: 'ZFLTA00',   totalIssued: 0n },  // ZiFleet
      { codePrefix: 'ZLD',   lastSequence: 'ZLDA00',    totalIssued: 0n },  // ZiLoad
      { codePrefix: 'ZFD',   lastSequence: 'ZFDA00',    totalIssued: 0n },  // ZiFood
      { codePrefix: 'ZCR',   lastSequence: 'ZCRA00',    totalIssued: 0n },  // ZiCare
      { codePrefix: 'ZSHP',  lastSequence: 'ZSHPA00',   totalIssued: 0n },  // ZiShop
      { codePrefix: 'ZCHT',  lastSequence: 'ZCHTA00',   totalIssued: 0n },  // ZiChit
      { codePrefix: 'ZBLD',  lastSequence: 'ZBLDA00',   totalIssued: 0n },  // ZiBuild
      { codePrefix: 'ZYLD',  lastSequence: 'ZYLDA00',   totalIssued: 0n },  // ZiYield
      { codePrefix: 'ZPST',  lastSequence: 'ZPSTA00',   totalIssued: 0n },  // ZiPost
      { codePrefix: 'ZSCN',  lastSequence: 'ZSCNA00',   totalIssued: 0n },  // ZiScan
      { codePrefix: 'ZCLC',  lastSequence: 'ZCLCA00',   totalIssued: 0n },  // ZiCalc
      { codePrefix: 'ZRCP',  lastSequence: 'ZRCPA00',   totalIssued: 0n },  // ZiReceipt
      { codePrefix: 'ZNVC',  lastSequence: 'ZNVCA00',   totalIssued: 0n },  // ZiInvoice
      { codePrefix: 'ZQT',   lastSequence: 'ZQTA00',    totalIssued: 0n },  // ZiQuote
      { codePrefix: 'ZLDG',  lastSequence: 'ZLDGA00',   totalIssued: 0n },  // ZiLedger
      { codePrefix: 'ZPRTN', lastSequence: 'ZPRTNA00',  totalIssued: 0n },  // ZiPartner
      { codePrefix: 'ZPLS',  lastSequence: 'ZPLSA00',   totalIssued: 0n },  // ZiPulse
      { codePrefix: 'ZND',   lastSequence: 'ZNDA00',    totalIssued: 0n },  // ZiNeed
      { codePrefix: 'ZDR',   lastSequence: 'ZDRA00',    totalIssued: 0n },  // ZiDriver

      // Biz contact types
      { codePrefix: 'CST',   lastSequence: 'CSTA00',    totalIssued: 0n },  // Customer
      { codePrefix: 'SUP',   lastSequence: 'SUPA00',    totalIssued: 0n },  // Supplier
      { codePrefix: 'VND',   lastSequence: 'VNDA00',    totalIssued: 0n },  // Vendor
      { codePrefix: 'AGT',   lastSequence: 'AGTA00',    totalIssued: 0n },  // Agent
      { codePrefix: 'PTR',   lastSequence: 'PTRA00',    totalIssued: 0n },  // Partner

      // ZiPawn transaction codes (year-scoped, prefilled for current year)
      { codePrefix: 'LN26',  lastSequence: 'LN26A00',   totalIssued: 0n },  // Loans 2026
      { codePrefix: 'TKT26', lastSequence: 'TKT26A00',  totalIssued: 0n },  // Tickets 2026
      { codePrefix: 'PAY26', lastSequence: 'PAY26A00',  totalIssued: 0n },  // Payments 2026
    ],
    skipDuplicates: true,
  })
  console.log('  ✓ Code sequences')

  // ──────────────────────────────────────────────
  // 3. System RBAC Permissions
  // ──────────────────────────────────────────────
  const corePermissions = [
    // Entity management
    { code: 'entity.read',   description: 'View entity profile',       isCore: true },
    { code: 'entity.update', description: 'Edit entity settings',       isCore: true },
    // Members
    { code: 'member.create', description: 'Invite new members',         isCore: true },
    { code: 'member.read',   description: 'View member list',           isCore: true },
    { code: 'member.update', description: 'Edit member roles',          isCore: true },
    { code: 'member.delete', description: 'Remove members',             isCore: true },
    // Branches
    { code: 'branch.create', description: 'Add branches',               isCore: true },
    { code: 'branch.read',   description: 'View branches',              isCore: true },
    { code: 'branch.update', description: 'Edit branch details',        isCore: true },
    { code: 'branch.delete', description: 'Deactivate branches',        isCore: true },
    // Contacts (customers, suppliers, etc.)
    { code: 'contact.create', description: 'Add new contacts',          isCore: true },
    { code: 'contact.read',   description: 'View contacts',             isCore: true },
    { code: 'contact.update', description: 'Edit contact details',      isCore: true },
    { code: 'contact.delete', description: 'Remove contacts',           isCore: true },
    { code: 'contact.reveal', description: 'Reveal masked mobile/email', isCore: true },
    // Billing
    { code: 'billing.read',   description: 'View billing & wallet',     isCore: true },
    { code: 'billing.topup',  description: 'Initiate wallet top-up',    isCore: true },
    // Audit
    { code: 'audit.read',     description: 'View audit logs',           isCore: true },
    // Notifications
    { code: 'notification.read',   description: 'View notifications',   isCore: true },
    { code: 'notification.manage', description: 'Mark notifications read', isCore: true },
    // App config
    { code: 'config.read',    description: 'View app configs',          isCore: true },
    { code: 'config.update',  description: 'Edit app configs',          isCore: true },
    // Subscriptions
    { code: 'subscription.read',   description: 'View subscriptions',   isCore: true },
    { code: 'subscription.manage', description: 'Manage subscriptions', isCore: true },
  ]

  const zpnPermissions = [
    { code: 'zpn.loan.create',    description: 'Create new loans',         productCode: 'ZPN', isCore: false },
    { code: 'zpn.loan.read',      description: 'View loans',               productCode: 'ZPN', isCore: false },
    { code: 'zpn.loan.close',     description: 'Close / foreclose loans',  productCode: 'ZPN', isCore: false },
    { code: 'zpn.payment.create', description: 'Record payments',          productCode: 'ZPN', isCore: false },
    { code: 'zpn.scheme.manage',  description: 'Manage loan schemes',      productCode: 'ZPN', isCore: false },
    { code: 'zpn.ticket.create',  description: 'Create partial-release tickets', productCode: 'ZPN', isCore: false },
    { code: 'zpn.report.view',    description: 'View ZiPawn reports',      productCode: 'ZPN', isCore: false },
  ]

  await prisma.ziPermission.createMany({
    data: [...corePermissions, ...zpnPermissions],
    skipDuplicates: true,
  })
  console.log('  ✓ Permissions')

  // ──────────────────────────────────────────────
  // 4. System Roles (isSystem = true, entityId = null → platform defaults)
  // Cannot use upsert with compound unique when one field is null in Prisma.
  // Use findFirst + create pattern instead.
  // ──────────────────────────────────────────────
  async function upsertSystemRole(name: string, description: string, isDefault: boolean) {
    const existing = await prisma.ziRole.findFirst({ where: { name, entityId: null, isSystem: true } })
    if (existing) return existing
    return prisma.ziRole.create({ data: { name, description, isDefault, isSystem: true } })
  }

  const ownerRole   = await upsertSystemRole('OWNER',   'Full access. Cannot be restricted.',              false)
  const adminRole   = await upsertSystemRole('ADMIN',   'Full operational access except billing.',          false)
  const managerRole = await upsertSystemRole('MANAGER', 'Manage operations within assigned branches.',      false)
  const staffRole   = await upsertSystemRole('STAFF',   'Operational access. Cannot manage users or billing.', true)
  const viewerRole  = await upsertSystemRole('VIEWER',  'Read-only access.',                               false)

  console.log('  ✓ System roles')

  // ──────────────────────────────────────────────
  // 5. Role → Permission mappings
  // ──────────────────────────────────────────────
  const allCorePerms = corePermissions.map(p => p.code)
  const allZpnPerms  = zpnPermissions.map(p => p.code)

  const roleMappings: Array<{ roleId: string; permission: string }> = [
    // OWNER — all permissions
    ...[...allCorePerms, ...allZpnPerms].map(p => ({ roleId: ownerRole.id, permission: p })),
    // ADMIN — all except billing.topup
    ...[...allCorePerms.filter(p => p !== 'billing.topup'), ...allZpnPerms].map(p => ({ roleId: adminRole.id, permission: p })),
    // MANAGER — operational + read billing
    ...['entity.read','member.read','branch.read','branch.update','contact.create','contact.read','contact.update','contact.reveal','billing.read','audit.read','notification.read','notification.manage', ...allZpnPerms].map(p => ({ roleId: managerRole.id, permission: p })),
    // STAFF — basic operational
    ...['entity.read','branch.read','contact.create','contact.read','contact.update','notification.read','notification.manage','zpn.loan.create','zpn.loan.read','zpn.payment.create','zpn.ticket.create'].map(p => ({ roleId: staffRole.id, permission: p })),
    // VIEWER — read only
    ...['entity.read','member.read','branch.read','contact.read','billing.read','audit.read','notification.read','zpn.loan.read','zpn.report.view'].map(p => ({ roleId: viewerRole.id, permission: p })),
  ]

  await prisma.ziRolePermission.createMany({
    data: roleMappings,
    skipDuplicates: true,
  })
  console.log('  ✓ Role-permission mappings')

  // ──────────────────────────────────────────────
  // 6. Platform-level App Configs
  // ──────────────────────────────────────────────
  await prisma.ziAppConfig.createMany({
    data: [
      { scopeType: 'PLATFORM', key: 'platform.maintenance_mode',    value: false,    isPublic: false },
      { scopeType: 'PLATFORM', key: 'platform.trial_days',          value: 30,       isPublic: true  },
      { scopeType: 'PLATFORM', key: 'platform.supported_countries', value: ['IN','US','AE','SG','GB','MY'], isPublic: true },
      { scopeType: 'PLATFORM', key: 'platform.default_currency',    value: 'INR',    isPublic: true  },
      { scopeType: 'PLATFORM', key: 'platform.default_timezone',    value: 'Asia/Kolkata', isPublic: true },
      { scopeType: 'PLATFORM', key: 'billing.daily_deduction_time', value: '01:00',  isPublic: false },
      { scopeType: 'PLATFORM', key: 'billing.grace_period_days',    value: 7,        isPublic: false },
    ],
    skipDuplicates: true,
  })
  console.log('  ✓ Platform app configs')

  console.log('\n✅ Seed complete.')
}

main()
  .catch(e => { console.error('Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
