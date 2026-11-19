/**
 * End-to-end backend verification against the local Supabase stack.
 * Exercises RLS, booking cutoffs, QR token isolation, scanning races,
 * transfers, bulk import and reports with real authenticated users.
 */
import assert from 'node:assert/strict'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.DEMO_AUTH_PASSWORD ?? 'MessMate@123'

if (!url || !anonKey || !serviceKey) {
  console.error('Supabase URL, anon key and service role key are required')
  process.exit(1)
}

const BH1 = '11111111-1111-4111-8111-111111111101'
const BH2 = '11111111-1111-4111-8111-111111111102'
const BH4 = '11111111-1111-4111-8111-111111111104'

let passed = 0
let failed = 0
const failures: string[] = []

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    passed += 1
    console.log(`  ✓ ${name}`)
  } catch (error) {
    failed += 1
    const message = error instanceof Error ? error.message : String(error)
    failures.push(`${name}: ${message}`)
    console.error(`  ✗ ${name}\n    ${message}`)
  }
}

function check(condition: unknown, message: string): asserts condition {
  assert.ok(condition, message)
}

async function signIn(email: string): Promise<SupabaseClient> {
  const client = createClient(url!, anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`)
  return client
}

function todayIST(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
}

const service = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const [admin, staffBH1, staffBH4, studentBH1] = await Promise.all([
  signIn('admin@iiita.ac.in'),
  signIn('rakesh.yadav@iiita.ac.in'),
  signIn('geeta.sharma@iiita.ac.in'),
  signIn('aarav.mehta@iiita.ac.in'),
])

const context = await studentBH1.rpc('get_my_context')
check(!context.error && context.data, `Student context failed: ${context.error?.message}`)
const student = context.data.student
const studentProfileId = context.data.profile.id

const tomorrow = new Date(`${todayIST()}T12:00:00+05:30`)
tomorrow.setDate(tomorrow.getDate() + 1)
const tomorrowDate = tomorrow.toISOString().slice(0, 10)
const inThreeDays = new Date(tomorrow)
inThreeDays.setDate(inThreeDays.getDate() + 2)
const inThreeDaysDate = inThreeDays.toISOString().slice(0, 10)

console.log('\nAuthentication + access context')
await test('student context contains role, roll number and assigned mess', async () => {
  check(context.data.profile.role === 'student', 'role should be student')
  check(context.data.student.mess_id === BH1, 'student should be assigned to BH1')
  check(context.data.profile.email === 'aarav.mehta@iiita.ac.in', 'email should match')
  check(student.roll_number === 'IIT2023001', 'roll number should match')
})

console.log('\nMeal + menu isolation')
await test('student only reads meals from their own mess', async () => {
  const { data, error } = await studentBH1
    .from('meals')
    .select('id,mess_id,meal_date,category')
    .gte('meal_date', todayIST())
    .order('meal_date')
  check(!error, error?.message)
  check((data?.length ?? 0) > 0, 'expected meals')
  check(data!.every((meal) => meal.mess_id === BH1), 'found a meal from another mess')
})

await test('student only reads menus for their own mess meals', async () => {
  const { data: ownMeals } = await studentBH1.from('meals').select('id')
  const mealIds = new Set((ownMeals ?? []).map((meal) => meal.id))
  const { data, error } = await studentBH1.from('menu_items').select('id,meal_id')
  check(!error, error?.message)
  check((data?.length ?? 0) > 0, 'expected menu items')
  check(data!.every((item) => mealIds.has(item.meal_id)), 'menu item leaked from another mess')
})

await test('staff can only read meals, students and bookings for assigned messes', async () => {
  const { data: bh1Meals } = await staffBH1.from('meals').select('id,mess_id')
  const bh1MealIds = new Set((bh1Meals ?? []).map((meal) => meal.id))
  check(bh1Meals!.length > 0 && bh1Meals!.every((m) => m.mess_id === BH1), 'BH1 meals leaked')

  const { data: bh1Students } = await staffBH1.from('students').select('id,mess_id,roll_number')
  check(bh1Students!.length === 5, `expected 5 BH1 students, got ${bh1Students?.length}`)
  check(bh1Students!.every((s) => s.mess_id === BH1), 'student leaked from another mess')

  const { data: bookings } = await staffBH1
    .from('meal_bookings')
    .select('id,meal_id,status')
    .limit(1000)
  check((bookings?.length ?? 0) > 0, 'expected bookings')
  check(bookings!.every((b) => bh1MealIds.has(b.meal_id)), 'booking leaked from another mess')

  const { data: bh4Students } = await staffBH4.from('students').select('id,mess_id')
  check(bh4Students!.length === 5, 'BH4 staff should only see their own 5 students')
  check(bh4Students!.every((s) => s.mess_id === BH4), 'BH4 staff saw another mess')
})

await test('student only reads their own bookings and tokens', async () => {
  const { data: bookings, error } = await studentBH1
    .from('meal_bookings')
    .select('id,student_id,meal_id,status')
  check(!error, error?.message)
  check((bookings?.length ?? 0) > 0, 'expected own bookings')
  check(bookings!.every((b) => b.student_id === student.id), 'saw another student booking')

  const ownIds = new Set(bookings!.map((b) => b.id))
  const { data: tokens } = await studentBH1.from('booking_tokens').select('booking_id,token')
  check((tokens?.length ?? 0) > 0, 'expected own tokens')
  check(tokens!.every((t) => ownIds.has(t.booking_id)), 'saw another student token')
})

await test('staff cannot read QR secrets directly', async () => {
  const { data, error } = await staffBH1.from('booking_tokens').select('booking_id,token')
  check(!error, error?.message)
  check((data?.length ?? 0) === 0, 'staff must not be able to select booking tokens')
})

console.log('\nBooking rules')
await test('booking is rejected after the cutoff, regardless of frontend state', async () => {
  const { data: pastMeal } = await studentBH1
    .from('meals')
    .select('id')
    .lt('booking_cutoff_at', new Date().toISOString())
    .order('meal_date', { ascending: false })
    .limit(1)
    .single()
  check(pastMeal, 'expected a meal whose cutoff has passed')
  const { error } = await studentBH1.rpc('set_my_booking_status', {
    p_meal_id: pastMeal!.id,
    p_status: 'opted_out',
  })
  check(Boolean(error), 'RPC should have rejected a closed booking')
  check(/closed/i.test(error?.message ?? ''), `unexpected error: ${error?.message}`)
})

let futureMealId = ''
await test('student can opt out and back in before the cutoff and events are logged', async () => {
  const { data: meal } = await studentBH1
    .from('meals')
    .select('id,mess_id,category,booking_cutoff_at')
    .eq('mess_id', BH1)
    .eq('meal_date', tomorrowDate)
    .eq('category', 'dinner')
    .single()
  check(meal, 'expected tomorrow dinner')
  futureMealId = meal!.id

  const { data: before } = await studentBH1
    .from('meal_bookings')
    .select('id,status')
    .eq('meal_id', futureMealId)
    .single()
  check(before, 'expected generated booking')

  const next = before!.status === 'opted_in' ? 'opted_out' : 'opted_in'
  const { data, error } = await studentBH1.rpc('set_my_booking_status', {
    p_meal_id: futureMealId,
    p_status: next,
  })
  check(!error, error?.message)
  check(data.status === next, 'status should change')

  // Leave the booking opted in for the QR tests.
  if (next !== 'opted_in') {
    const { error: backError } = await studentBH1.rpc('set_my_booking_status', {
      p_meal_id: futureMealId,
      p_status: 'opted_in',
    })
    check(!backError, backError?.message)
  }

  const { data: events } = await studentBH1
    .from('booking_events')
    .select('previous_status,new_status,action_source,created_at')
    .eq('booking_id', before!.id)
    .order('id', { ascending: true })
  check(events && events.length >= 2, 'expected an event for the transition')
  check(
    events!.some((event) => event.new_status === next && event.action_source === 'student'),
    'transition should be recorded and attributed to the student',
  )
  const last = events![events!.length - 1]
  check(last.new_status === 'opted_in', 'booking should end opted in for the pass test')
})

await test('student cannot directly update booking or student rows', async () => {
  const { data: booking } = await studentBH1
    .from('meal_bookings')
    .select('id,status')
    .eq('meal_id', futureMealId)
    .single()
  const { data: updated } = await studentBH1
    .from('meal_bookings')
    .update({ status: 'opted_out' })
    .eq('id', booking!.id)
    .select()
  check((updated?.length ?? 0) === 0, 'direct booking update should be blocked')

  const { data: moved } = await studentBH1
    .from('students')
    .update({ mess_id: BH2 })
    .eq('id', student.id)
    .select()
  check((moved?.length ?? 0) === 0, 'student must not move themselves')

  const after = await studentBH1.rpc('get_my_context')
  check(after.data.student.mess_id === BH1, 'mess assignment changed unexpectedly')
})

await test('student cannot change their own role', async () => {
  const { data: changed } = await studentBH1
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', studentProfileId)
    .select()
  check((changed?.length ?? 0) === 0, 'profile update should be blocked')
  const ctx = await studentBH1.rpc('get_my_context')
  check(ctx.data.profile.role === 'student', 'role changed unexpectedly')
})

console.log('\nMeal passes + scanning')
let validToken = ''
let validBookingId = ''
await test('opted-in booking exposes a non-guessable token only to its owner', async () => {
  const { data: booking } = await studentBH1
    .from('meal_bookings')
    .select('id,status,consumed_at')
    .eq('meal_id', futureMealId)
    .single()
  check(booking?.status === 'opted_in', 'booking should be opted in')
  validBookingId = booking!.id

  const { data, error } = await studentBH1.rpc('get_my_meal_pass', {
    p_booking_id: validBookingId,
  })
  check(!error, error?.message)
  check(typeof data.token === 'string' && data.token.length === 48, 'expected 48-char token')
  validToken = data.token
})

await test('staff scans a valid pass and duplicate scans are rejected', async () => {
  const { data, error } = await staffBH1.rpc('scan_booking', { p_token: validToken })
  check(!error, error?.message)
  check(data.result === 'valid', `expected valid, got ${data.result}`)
  check(data.student_name === 'Aarav Mehta', 'wrong student returned')
  check(data.roll_number === 'IIT2023001', 'wrong roll returned')
  check(data.mess_name === 'BH1', 'wrong mess returned')

  const { data: duplicate, error: dupError } = await staffBH1.rpc('scan_booking', {
    p_token: validToken,
  })
  check(!dupError, dupError?.message)
  check(duplicate.result === 'already_scanned', `expected already_scanned, got ${duplicate.result}`)
})

await test('concurrent duplicate scans produce exactly one valid result', async () => {
  const { data: meal } = await studentBH1
    .from('meals')
    .select('id')
    .eq('mess_id', BH1)
    .eq('meal_date', tomorrowDate)
    .eq('category', 'lunch')
    .single()
  const { data: booking } = await studentBH1
    .from('meal_bookings')
    .select('id,status,consumed_at')
    .eq('meal_id', meal!.id)
    .single()
  if (booking!.status !== 'opted_in') {
    const { error } = await studentBH1.rpc('set_my_booking_status', {
      p_meal_id: meal!.id,
      p_status: 'opted_in',
    })
    check(!error, error?.message)
  }
  const { data: pass } = await studentBH1.rpc('get_my_meal_pass', {
    p_booking_id: booking!.id,
  })
  const token = pass.token as string
  const [a, b] = await Promise.all([
    staffBH1.rpc('scan_booking', { p_token: token }),
    staffBH1.rpc('scan_booking', { p_token: token }),
  ])
  const results = [a.data?.result, b.data?.result].sort()
  check(JSON.stringify(results) === JSON.stringify(['already_scanned', 'valid']), `got ${results}`)
})

await test('an opted-out booking token is rejected', async () => {
  const { data: meal } = await studentBH1
    .from('meals')
    .select('id')
    .eq('mess_id', BH1)
    .eq('meal_date', tomorrowDate)
    .eq('category', 'snacks')
    .single()
  let { data: booking } = await studentBH1
    .from('meal_bookings')
    .select('id,status')
    .eq('meal_id', meal!.id)
    .single()
  if (booking!.status === 'opted_out') {
    await studentBH1.rpc('set_my_booking_status', { p_meal_id: meal!.id, p_status: 'opted_in' })
  }
  const { error: optOutError } = await studentBH1.rpc('set_my_booking_status', {
    p_meal_id: meal!.id,
    p_status: 'opted_out',
  })
  check(!optOutError, optOutError?.message)
  const { data: tokens } = await studentBH1
    .from('booking_tokens')
    .select('token')
    .eq('booking_id', booking!.id)
    .single()
  const { data, error } = await staffBH1.rpc('scan_booking', { p_token: tokens!.token })
  check(!error, error?.message)
  check(data.result === 'opted_out', `expected opted_out, got ${data.result}`)

  await studentBH1.rpc('set_my_booking_status', { p_meal_id: meal!.id, p_status: 'opted_in' })
})

await test('staff from another mess and unknown tokens are rejected', async () => {
  const { data: otherMeal } = await studentBH1
    .from('meals')
    .select('id')
    .eq('mess_id', BH1)
    .eq('meal_date', inThreeDaysDate)
    .eq('category', 'dinner')
    .single()
  const { data: booking } = await studentBH1
    .from('meal_bookings')
    .select('id,status')
    .eq('meal_id', otherMeal!.id)
    .single()
  const { data: pass } = await studentBH1.rpc('get_my_meal_pass', {
    p_booking_id: booking!.id,
  })
  const token = pass.token ?? (
    await studentBH1.from('booking_tokens').select('token').eq('booking_id', booking!.id).single()
  ).data?.token
  check(token, 'expected token')

  const wrongMess = await staffBH4.rpc('scan_booking', { p_token: token })
  check(!wrongMess.error, wrongMess.error?.message)
  check(wrongMess.data.result === 'forbidden', `expected forbidden, got ${wrongMess.data.result}`)

  const invalid = await staffBH1.rpc('scan_booking', { p_token: 'not-a-real-token' })
  check(invalid.data.result === 'invalid', `expected invalid, got ${invalid.data.result}`)
})

await test('manual roll-number fallback works and respects mess assignment', async () => {
  const { data: meal } = await staffBH1
    .from('meals')
    .select('id')
    .eq('mess_id', BH1)
    .eq('meal_date', inThreeDaysDate)
    .eq('category', 'breakfast')
    .single()
  const { data: booking } = await studentBH1
    .from('meal_bookings')
    .select('id,status,consumed_at')
    .eq('meal_id', meal!.id)
    .single()
  if (booking!.status !== 'opted_in') {
    await studentBH1.rpc('set_my_booking_status', { p_meal_id: meal!.id, p_status: 'opted_in' })
  }
  const { data, error } = await staffBH1.rpc('scan_booking_manual', {
    p_meal_id: meal!.id,
    p_roll_number: 'IIT2023001',
  })
  check(!error, error?.message)
  check(['valid', 'already_scanned'].includes(data.result), `unexpected ${data.result}`)

  const wrong = await staffBH4.rpc('scan_booking_manual', {
    p_meal_id: meal!.id,
    p_roll_number: 'IIT2023001',
  })
  check(wrong.data.result === 'forbidden', `expected forbidden, got ${wrong.data.result}`)
})

console.log('\nStaff meal management')
await test('staff can create and delete a future meal only in their assigned mess', async () => {
  const futureDate = new Date(`${todayIST()}T12:00:00+05:30`)
  futureDate.setDate(futureDate.getDate() + 9)
  const date = futureDate.toISOString().slice(0, 10)

  const payload = {
    mess_id: BH1,
    category: 'dinner' as const,
    title: 'Test Special Dinner',
    meal_date: date,
    start_time: '19:30:00',
    end_time: '21:00:00',
    booking_cutoff_at: new Date(`${date}T18:00:00+05:30`).toISOString(),
  }

  const { data: created, error } = await staffBH1
    .from('meals')
    .insert(payload)
    .select('id')
    .single()
  check(!error, error?.message)
  check(created?.id, 'expected created meal')

  const { data: generated } = await staffBH1
    .from('meal_bookings')
    .select('id', { count: 'exact' })
    .eq('meal_id', created!.id)
  check((generated?.length ?? 0) === 5, `expected 5 generated bookings, got ${generated?.length}`)

  const { data: menuRow, error: menuError } = await staffBH1
    .from('menu_items')
    .insert({ meal_id: created!.id, name: 'Test Dish', sort_order: 1 })
    .select('id')
    .single()
  check(!menuError, `menu insert failed: ${menuError?.message}`)
  check(Boolean(menuRow?.id), 'menu insert returned no row')

  const { error: forbidden } = await staffBH1.from('meals').insert({
    ...payload,
    mess_id: BH4,
    title: 'Wrong Mess Dinner',
  })
  check(Boolean(forbidden), 'staff must not create meals for another mess')

  const { error: deleteError } = await staffBH1.from('meals').delete().eq('id', created!.id)
  check(!deleteError, deleteError?.message)
})

await test('past meals cannot be deleted', async () => {
  const { data: pastMeal } = await staffBH1
    .from('meals')
    .select('id')
    .lt('meal_date', todayIST())
    .limit(1)
    .single()
  const { error } = await staffBH1.from('meals').delete().eq('id', pastMeal!.id)
  check(Boolean(error), 'past meal deletion should fail')
})

console.log('\nAdmin provisioning + transfers')
let testStudentId = ''
await test('admin creates a student and future bookings are generated', async () => {
  const { data, error } = await admin.rpc('admin_create_student', {
    p_name: 'Test Student',
    p_email: 'test.student@iiita.ac.in',
    p_roll_number: 'IIT9999001',
    p_mess_id: BH1,
    p_preference: 'opted_in',
    p_is_active: true,
  })
  check(!error, error?.message)
  testStudentId = data.student_id

  const { data: bookings } = await admin
    .from('meal_bookings')
    .select('id,meal:meals!inner(mess_id)')
    .eq('student_id', testStudentId)
  check((bookings?.length ?? 0) > 0, 'expected generated bookings')
  check(bookings!.every((b) => b.meal.mess_id === BH1), 'bookings should be in BH1')
})

await test('transfer cancels future old-mess bookings, creates new ones and keeps history', async () => {
  const { data: pastMeal } = await admin
    .from('meals')
    .select('id')
    .eq('mess_id', BH1)
    .lt('meal_date', todayIST())
    .limit(1)
    .single()
  // Bookings are not directly writable through the API; use the service role
  // only to fabricate a historical row for this transfer assertion.
  const { error: historyError } = await service.from('meal_bookings').insert({
    student_id: testStudentId,
    meal_id: pastMeal!.id,
    status: 'opted_in',
  })
  check(!historyError, historyError?.message)

  const { error } = await admin.rpc('admin_update_student', {
    p_student_id: testStudentId,
    p_name: 'Test Student',
    p_email: 'test.student@iiita.ac.in',
    p_roll_number: 'IIT9999001',
    p_mess_id: BH2,
    p_preference: 'opted_in',
    p_is_active: true,
  })
  check(!error, error?.message)

  const { data: bookings } = await admin
    .from('meal_bookings')
    .select('id,status,meal_id,meal:meals!inner(mess_id,meal_date)')
    .eq('student_id', testStudentId)

  const history = bookings!.filter((b) => b.meal.meal_date < todayIST())
  check(history.length === 1, 'historical booking should remain')
  check(history[0].meal.mess_id === BH1, 'history should stay attached to BH1')
  check(history[0].status === 'opted_in', 'historical status should not be rewritten')

  const futureBH1 = bookings!.filter(
    (b) => b.meal.mess_id === BH1 && b.meal.meal_date >= todayIST(),
  )
  check(futureBH1.length > 0, 'expected old future bookings')
  check(futureBH1.every((b) => b.status === 'opted_out'), 'old future bookings should be opted out')

  const futureBH2 = bookings!.filter(
    (b) => b.meal.mess_id === BH2 && b.meal.meal_date >= todayIST(),
  )
  check(futureBH2.length > 0, 'expected new BH2 bookings')
  check(futureBH2.every((b) => b.status === 'opted_in'), 'new bookings should use preference')
})

await test('deactivation blocks data access and cancels future bookings', async () => {
  // The provisioned profile has no auth identity until first sign-in. Create
  // one while active, then deactivate and verify an existing session is denied.
  const { error: authError } = await service.auth.admin.createUser({
    email: 'test.student@iiita.ac.in',
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Test Student' },
  })
  if (authError && !/already/i.test(authError.message)) throw authError

  const { error } = await admin.rpc('admin_update_student', {
    p_student_id: testStudentId,
    p_name: 'Test Student',
    p_email: 'test.student@iiita.ac.in',
    p_roll_number: 'IIT9999001',
    p_mess_id: BH2,
    p_preference: 'opted_in',
    p_is_active: false,
  })
  check(!error, error?.message)

  const { data: future } = await admin
    .from('meal_bookings')
    .select('status,meal:meals!inner(meal_date)')
    .eq('student_id', testStudentId)
    .gte('meal.meal_date', todayIST())
  check(future!.every((b) => b.status === 'opted_out'), 'future bookings should be cancelled')

  const inactive = await signIn('test.student@iiita.ac.in')
  const ctx = await inactive.rpc('get_my_context')
  check(ctx.data.profile.is_active === false, 'context should report inactive')
  const { data: meals } = await inactive.from('meals').select('id').limit(1)
  check((meals?.length ?? 0) === 0, 'inactive user must not read meals')
})

await test('admin can create and update a staff account with multiple messes', async () => {
  const { data, error } = await admin.rpc('admin_create_staff', {
    p_name: 'Test Staff',
    p_email: 'test.staff@iiita.ac.in',
    p_mess_ids: [BH1, BH2],
  })
  check(!error, error?.message)
  const staffId = data.profile_id

  const { data: assignments } = await admin
    .from('staff_assignments')
    .select('mess_id')
    .eq('staff_id', staffId)
  check(assignments?.length === 2, 'expected two assignments')

  const { error: updateError } = await admin.rpc('admin_update_staff', {
    p_profile_id: staffId,
    p_name: 'Test Staff Updated',
    p_is_active: true,
    p_mess_ids: [BH2],
  })
  check(!updateError, updateError?.message)
  const { data: after } = await admin
    .from('staff_assignments')
    .select('mess_id')
    .eq('staff_id', staffId)
  check(after?.length === 1 && after[0].mess_id === BH2, 'assignments should be replaced')
})

await test('admin cannot demote themselves', async () => {
  const ctx = await admin.rpc('get_my_context')
  const adminId = ctx.data.profile.id
  const { error } = await admin
    .from('profiles')
    .update({ role: 'student' })
    .eq('id', adminId)
  check(Boolean(error), 'self role change should be rejected')
  const after = await admin.rpc('get_my_context')
  check(after.data.profile.role === 'admin', 'admin role changed unexpectedly')
})

await test('admin can create, edit and delete an empty mess', async () => {
  const { data, error } = await admin
    .from('messes')
    .insert({ name: 'Test Mess', description: 'Temporary' })
    .select('id')
    .single()
  check(!error, error?.message)
  const messId = data!.id

  const { error: updateError } = await admin
    .from('messes')
    .update({ name: 'Test Mess Renamed', is_active: false })
    .eq('id', messId)
  check(!updateError, updateError?.message)

  const { error: deleteError } = await admin.from('messes').delete().eq('id', messId)
  check(!deleteError, deleteError?.message)

  const { error: nonEmptyDelete } = await admin.from('messes').delete().eq('id', BH1)
  check(Boolean(nonEmptyDelete), 'deleting a mess with students should be restricted')
})

await test('bulk import validates rows, reports failures and inserts valid rows', async () => {
  const { data, error } = await admin.rpc('admin_bulk_import_students', {
    p_records: [
      {
        name: 'Bulk One',
        email: 'bulk.one@iiita.ac.in',
        roll_number: 'IIT9999101',
        mess: 'BH1',
      },
      {
        name: 'Bulk Two',
        email: 'bulk.two@iiita.ac.in',
        roll_number: 'IIT9999102',
        mess: 'bh2',
      },
      {
        name: 'Bad Email',
        email: 'bad@gmail.com',
        roll_number: 'IIT9999103',
        mess: 'BH1',
      },
      {
        name: 'Duplicate',
        email: 'aarav.mehta@iiita.ac.in',
        roll_number: 'IIT9999104',
        mess: 'BH1',
      },
    ],
  })
  check(!error, error?.message)
  check(data.inserted === 2, `expected 2 imported, got ${data.inserted}`)
  check(data.failed === 2, `expected 2 failed, got ${data.failed}`)
  check(data.results.length === 4, 'expected a result per row')
  check(
    data.results.some((r: { error?: string }) => /Invalid email/i.test(r.error ?? '')),
    'expected invalid email error',
  )
})

await test('admin report returns events, timestamps and menu data', async () => {
  const from = new Date()
  from.setDate(from.getDate() - 7)
  const { data, error } = await admin.rpc('admin_report', {
    p_mess_id: BH1,
    p_student_id: null,
    p_from: from.toISOString().slice(0, 10),
    p_to: todayIST(),
    p_category: null,
  })
  check(!error, error?.message)
  check((data?.length ?? 0) > 0, 'expected report rows')
  check(data![0].menu.length > 0, 'expected menu string')
  check(Array.isArray(data![0].events) && data![0].events.length > 0, 'expected event history')
  check(Boolean(data![0].initial_status), 'expected initial status')
})

console.log('\nNon-admin authorization')
await test('staff and students cannot call admin RPCs', async () => {
  const created = await staffBH1.rpc('admin_create_student', {
    p_name: 'Nope',
    p_email: 'nope@iiita.ac.in',
    p_roll_number: 'IIT9999999',
    p_mess_id: BH1,
  })
  check(Boolean(created.error), 'staff should not create students')

  const report = await studentBH1.rpc('admin_report', {
    p_mess_id: BH1,
    p_student_id: null,
    p_from: todayIST(),
    p_to: todayIST(),
    p_category: null,
  })
  check(Boolean(report.error), 'student should not run admin reports')
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.error('\nFailures:')
  for (const failure of failures) console.error(` - ${failure}`)
  process.exitCode = 1
}
