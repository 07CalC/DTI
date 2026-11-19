/**
 * Local-development helper: creates password-based Supabase Auth users for the
 * profiles in supabase/seed.sql so backend flows can be tested without Google.
 *
 * The product UI never offers password sign-in. Do not run this against a
 * production project.
 *
 *   npx tsx --env-file=.env.local scripts/seed-dev-auth.ts
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.DEMO_AUTH_PASSWORD ?? 'MessMate@123'

if (!url || !serviceKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: profiles, error: profileError } = await admin
  .from('profiles')
  .select('id, name, email, role, auth_user_id')
  .order('role')
  .order('email')

if (profileError) throw profileError

const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 })
if (listError) throw listError

const usersByEmail = new Map(list.users.map((user) => [user.email?.toLowerCase(), user]))

let created = 0
let updated = 0
let linked = 0

for (const profile of profiles ?? []) {
  const existing = usersByEmail.get(profile.email.toLowerCase())

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: profile.name },
    })
    if (error) throw error
    updated += 1

    if (!profile.auth_user_id) {
      const { error: linkError } = await admin
        .from('profiles')
        .update({ auth_user_id: existing.id })
        .eq('id', profile.id)
      if (linkError) throw linkError
      linked += 1
    }
  } else {
    const { error } = await admin.auth.admin.createUser({
      email: profile.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: profile.name },
    })
    if (error) throw error
    created += 1
  }
}

console.log(`Auth users ready: ${created} created, ${updated} updated, ${linked} relinked.`)
console.log(`All demo accounts use password: ${password}`)
