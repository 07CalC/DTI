/**
 * Provisions the first administrator profile. The person then signs in with
 * Google using exactly this @iiita.ac.in address; the auth trigger links the
 * Google identity to this profile.
 *
 *   ADMIN_EMAIL=you@iiita.ac.in ADMIN_NAME="Mess Admin" \
 *     npx tsx --env-file=.env.local scripts/provision-admin.ts
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const name = process.env.ADMIN_NAME?.trim() ?? 'Mess Administrator'

if (!url || !serviceKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  process.exit(1)
}
if (!email || !/^[a-z0-9._%+-]+@iiita\.ac\.in$/.test(email)) {
  console.error('ADMIN_EMAIL must be a valid @iiita.ac.in address')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { error } = await admin.from('profiles').upsert(
  { name, email, role: 'admin', is_active: true },
  { onConflict: 'email' },
)

if (error) throw error

console.log(`Administrator provisioned: ${name} <${email}>`)
console.log('Sign in with Google using this address. No password is created.')
