#!/usr/bin/env tsx
/**
 * Ziort — Database Auto-Setup Script
 *
 * Run this ONCE after creating a new Supabase project.
 * It handles: Prisma generate → migrate deploy → seed → verify
 *
 * Usage:
 *   cd packages/db
 *   DATABASE_URL="..." DIRECT_URL="..." npx tsx scripts/setup.ts
 *
 * Or from monorepo root:
 *   npm run db:setup
 */

import { execSync } from 'child_process'
import { PrismaClient } from '../src/generated/prisma'
import path from 'path'

const ROOT = path.resolve(__dirname, '..')

function run(cmd: string, label: string) {
  console.log(`\n  → ${label}`)
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'inherit' })
  } catch (err) {
    console.error(`\n✗ Failed: ${label}`)
    throw err
  }
}

function checkEnv() {
  const required = ['DATABASE_URL', 'DIRECT_URL']
  const missing = required.filter(k => !process.env[k])
  if (missing.length > 0) {
    console.error('\n✗ Missing environment variables:')
    missing.forEach(k => console.error(`    ${k}`))
    console.error('\nSet them in packages/db/.env or export them before running.\n')
    process.exit(1)
  }
}

async function verifyConnection() {
  const prisma = new PrismaClient()
  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('  ✓ Database connection OK')
  } catch (err) {
    console.error('  ✗ Cannot connect to database. Check DATABASE_URL.')
    throw err
  } finally {
    await prisma.$disconnect()
  }
}

async function verifyTables() {
  const prisma = new PrismaClient()
  try {
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `
    const expected = [
      'zi_code_sequences', 'zi_entities', 'zi_individuals',
      'zi_branches', 'zi_subscriptions', 'zi_memberships',
      'zi_biz_contacts', 'zi_wallet', 'zi_audit_logs',
      'zi_notifications', 'zi_app_configs', 'zi_roles',
      'zi_permissions', 'zpn_loans', 'zpn_schemes',
    ]
    const found = tables.map(t => t.tablename)
    const missing = expected.filter(t => !found.includes(t))

    if (missing.length > 0) {
      console.error('  ✗ Missing tables:', missing.join(', '))
      throw new Error('Table verification failed')
    }

    console.log(`  ✓ All tables present (${found.length} total)`)
  } finally {
    await prisma.$disconnect()
  }
}

async function verifySeeds() {
  const prisma = new PrismaClient()
  try {
    const [countries, sequences, perms, roles, configs] = await Promise.all([
      prisma.ziNationalIdConfig.count(),
      prisma.ziCodeSequence.count(),
      prisma.ziPermission.count(),
      prisma.ziRole.count(),
      prisma.ziAppConfig.count(),
    ])
    console.log(`  ✓ Seed data: ${countries} countries, ${sequences} code prefixes, ${perms} permissions, ${roles} roles, ${configs} platform configs`)
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  console.log('╔═════════════════════════════════════════╗')
  console.log('║   Ziort Database Setup                  ║')
  console.log('╚═════════════════════════════════════════╝')

  // 1. Validate env
  console.log('\n[1/5] Checking environment...')
  checkEnv()
  console.log('  ✓ Environment OK')

  // 2. Test connection
  console.log('\n[2/5] Connecting to database...')
  await verifyConnection()

  // 3. Generate Prisma client
  console.log('\n[3/5] Generating Prisma client...')
  run('npx prisma generate', 'prisma generate')

  // 4. Apply schema to DB
  // - Fresh DB: uses migrate deploy (applies 001_init migration)
  // - Already pushed: migrate deploy is a no-op if migration is marked applied
  console.log('\n[4/5] Applying schema...')
  run('npx prisma migrate deploy', 'prisma migrate deploy')

  // 5. Verify tables
  console.log('\n     Verifying tables...')
  await verifyTables()

  // 6. Seed
  console.log('\n[5/5] Seeding initial data...')
  run('npx tsx prisma/seed.ts', 'seed')
  await verifySeeds()

  console.log('\n╔═════════════════════════════════════════╗')
  console.log('║  ✅  Setup complete!                    ║')
  console.log('╚═════════════════════════════════════════╝')
  console.log('\nNext steps:')
  console.log('  1. Copy the env values to ziort/.env.local')
  console.log('  2. Run: npm run dev:server')
  console.log('  3. Create the first entity via /api/v1/auth/setup\n')
}

main().catch(err => {
  console.error('\n✗ Setup failed:', err.message)
  process.exit(1)
})
