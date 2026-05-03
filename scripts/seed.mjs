/**
 * Seed script: clears all data and creates 4 member accounts.
 * Run with: node scripts/seed.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function parseEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const env = {}
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx === -1) continue
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
      env[key] = val
    }
    return env
  } catch {
    return {}
  }
}

// Try .env.local first, fall back to .env
const envLocal = parseEnvFile(join(__dirname, '..', '.env.local'))
const envBase = parseEnvFile(join(__dirname, '..', '.env'))
const env = { ...envBase, ...envLocal }

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const NEW_USERS = [
  { email: 'susila@gmail.com',  full_name: 'Susila',  password: '12345678' },
  { email: 'prashuv@gmail.com', full_name: 'Prashuv', password: '12345678' },
  { email: 'shirish@gmail.com', full_name: 'Shirish', password: '12345678' },
  { email: 'prahar@gmail.com',  full_name: 'Prahar',  password: '12345678' },
]

async function deleteAllRows(table, timestampCol = 'created_at') {
  const { error } = await supabase.from(table).delete().gte(timestampCol, '2000-01-01')
  if (error) console.warn(`  Warning clearing ${table}:`, error.message)
}

async function seed() {
  console.log('\n🌱 FIP Seed Script\n')

  // ── 1. Identify admin accounts to preserve ─────────────────────────────
  const { data: adminProfiles, error: adminErr } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('role', 'super_admin')

  if (adminErr) {
    console.error('Could not fetch admin profiles:', adminErr.message)
    process.exit(1)
  }

  const adminIds = new Set((adminProfiles ?? []).map(p => p.id))
  console.log(`👑 Preserving ${adminIds.size} admin account(s):`, (adminProfiles ?? []).map(p => p.email).join(', ') || '(none)')

  // ── 2. Clear data tables (most-dependent first) ─────────────────────────
  console.log('\n🗑️  Clearing data...')
  await deleteAllRows('transactions')
  await deleteAllRows('requests')
  await deleteAllRows('portfolio_assets')
  console.log('   transactions, requests, portfolio_assets cleared.')

  // ── 3. Delete existing non-admin auth users ─────────────────────────────
  console.log('\n🗑️  Removing existing member accounts...')
  const { data: authList, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) { console.error('Could not list users:', listErr.message); process.exit(1) }

  for (const u of (authList?.users ?? [])) {
    if (adminIds.has(u.id)) continue
    const { error } = await supabase.auth.admin.deleteUser(u.id)
    if (error) console.warn(`  Warning deleting ${u.email}:`, error.message)
    else console.log(`   Removed: ${u.email}`)
  }

  // ── 4. Reset fund_stats ─────────────────────────────────────────────────
  console.log('\n🔄 Resetting fund stats...')
  const { error: statsErr } = await supabase
    .from('fund_stats')
    .update({ total_fund_value: 0, total_units: 0, nav: 100, cash_balance: 0 })
    .eq('id', 1)
  if (statsErr) console.warn('  Warning resetting fund_stats:', statsErr.message)
  else console.log('   fund_stats reset (NAV=100, all zeros).')

  // ── 5. Create new member accounts ──────────────────────────────────────
  console.log('\n👤 Creating member accounts...')
  for (const u of NEW_USERS) {
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name, role: 'member' },
    })

    if (createErr) {
      console.error(`   ✗ ${u.email}:`, createErr.message)
      continue
    }

    const uid = newUser.user.id

    // Upsert profile (trigger may have already created it)
    await supabase.from('profiles').upsert({
      id: uid,
      email: u.email,
      full_name: u.full_name,
      role: 'member',
      is_active: true,
      agreed_to_disclaimer: true,
    })

    // Create unit_ledger entry
    await supabase.from('unit_ledger').upsert({
      member_id: uid,
      units: 0,
      total_invested: 0,
      total_withdrawn: 0,
      avg_nav_at_purchase: 100,
    })

    console.log(`   ✓ ${u.email} (password: ${u.password})`)
  }

  console.log('\n✅ Seed complete!\n')
  console.log('Accounts created:')
  NEW_USERS.forEach(u => console.log(`  • ${u.email}  /  ${u.password}`))
  console.log()
}

seed().catch(err => {
  console.error('\n❌ Seed failed:', err)
  process.exit(1)
})
