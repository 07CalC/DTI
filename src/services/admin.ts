import { supabase } from '@/lib/supabase'
import { todayIST } from '@/lib/utils'
import type { Json } from '@/types/database'
import type {
  ImportRecord,
  ImportResult,
  MealCategory,
  MessSummary,
  StaffMember,
  StudentDirectoryItem,
} from '@/types/app'
import type { BookingHistoryItem } from '@/types/app'

export interface MessWithCounts extends MessSummary {
  description: string | null
  created_at: string
  students: { id: string }[]
  staff_assignments: { id: string }[]
  meals: { id: string }[]
}

export interface MessMealRow {
  id: string
  category: MealCategory
  title: string
  meal_date: string
  start_time: string
  end_time: string
  booking_cutoff_at: string
}

export interface MessDetailData {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  students: StudentDirectoryItem[]
  staff: StaffMember[]
  meals: MessMealRow[]
}

export async function getMesses() {
  const { data, error } = await supabase
    .from('messes')
    .select(
      'id,name,description,is_active,created_at,students(id),staff_assignments(id),meals(id)',
    )
    .order('name')
  if (error) throw error
  return (data ?? []) as unknown as MessWithCounts[]
}

export async function getMessesSimple() {
  const { data, error } = await supabase
    .from('messes')
    .select('id,name,is_active')
    .order('name')
  if (error) throw error
  return (data ?? []) as unknown as MessSummary[]
}

export async function createMess(input: { name: string; description?: string; is_active: boolean }) {
  const { data, error } = await supabase
    .from('messes')
    .insert({
      name: input.name,
      description: input.description || null,
      is_active: input.is_active,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function updateMess(
  id: string,
  input: { name: string; description?: string; is_active: boolean },
) {
  const { error } = await supabase
    .from('messes')
    .update({
      name: input.name,
      description: input.description || null,
      is_active: input.is_active,
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteMess(id: string) {
  const { error } = await supabase.from('messes').delete().eq('id', id)
  if (error) throw error
}

export async function getMessDetail(id: string): Promise<MessDetailData> {
  const [{ data: mess, error }, students, staff, meals] = await Promise.all([
    supabase
      .from('messes')
      .select('id,name,description,is_active,created_at')
      .eq('id', id)
      .single(),
    getMessStudents(id),
    getMessStaff(id),
    getMessMeals(id),
  ])
  if (error) throw error
  return {
    ...(mess as unknown as Omit<MessDetailData, 'students' | 'staff' | 'meals'>),
    students,
    staff,
    meals,
  }
}

export async function getMessStudents(messId: string) {
  const { data, error } = await supabase
    .from('students')
    .select(
      `
      id, roll_number, mess_id, default_booking_preference, created_at,
      profile:profiles!inner(id,name,email,is_active),
      mess:messes(id,name)
      `,
    )
    .eq('mess_id', messId)
    .order('roll_number')
  if (error) throw error
  return (data ?? []) as unknown as StudentDirectoryItem[]
}

export async function getMessStaff(messId: string) {
  const { data, error } = await supabase
    .from('staff_assignments')
    .select('id,staff_id,profile:profiles!inner(id,name,email,role,is_active,created_at)')
    .eq('mess_id', messId)
  if (error) throw error

  const rows = (data ?? []) as unknown as {
    id: string
    staff_id: string
    profile: Omit<StaffMember, 'staff_assignments'>
  }[]

  return rows.map<StaffMember>((row) => ({
    ...row.profile,
    staff_assignments: [{ id: row.id, mess_id: messId, mess: null }],
  }))
}

export async function getMessMeals(messId: string) {
  const { data, error } = await supabase
    .from('meals')
    .select('id,category,title,meal_date,start_time,end_time,booking_cutoff_at')
    .eq('mess_id', messId)
    .gte('meal_date', todayIST())
    .order('meal_date')
    .order('start_time')
    .limit(24)
  if (error) throw error
  return (data ?? []) as unknown as MessMealRow[]
}

export async function getAdminStudents() {
  const { data, error } = await supabase
    .from('students')
    .select(
      `
      id, roll_number, mess_id, default_booking_preference, created_at,
      profile:profiles!inner(id,name,email,is_active),
      mess:messes(id,name)
      `,
    )
    .order('roll_number')
  if (error) throw error
  return (data ?? []) as unknown as StudentDirectoryItem[]
}

export async function adminCreateStudent(input: {
  name: string
  email: string
  roll_number: string
  mess_id: string
  default_booking_preference: 'opted_in' | 'opted_out'
  is_active: boolean
}) {
  const { data, error } = await supabase.rpc('admin_create_student', {
    p_name: input.name,
    p_email: input.email,
    p_roll_number: input.roll_number,
    p_mess_id: input.mess_id,
    p_preference: input.default_booking_preference,
    p_is_active: input.is_active,
  })
  if (error) throw error
  return data as { student_id: string; profile_id: string }
}

export async function adminUpdateStudent(input: {
  student_id: string
  name: string
  email: string
  roll_number: string
  mess_id: string
  default_booking_preference: 'opted_in' | 'opted_out'
  is_active: boolean
}) {
  const { data, error } = await supabase.rpc('admin_update_student', {
    p_student_id: input.student_id,
    p_name: input.name,
    p_email: input.email,
    p_roll_number: input.roll_number,
    p_mess_id: input.mess_id,
    p_preference: input.default_booking_preference,
    p_is_active: input.is_active,
  })
  if (error) throw error
  return data as { student_id: string; profile_id: string }
}

export async function getAdminStudentHistory(studentId: string, limit = 30) {
  const { data, error } = await supabase
    .from('meal_bookings')
    .select(
      `
      id, status, initial_status, consumed_at, created_at, updated_at,
      meal:meals!inner(
        id, title, category, meal_date, start_time, end_time, booking_cutoff_at,
        mess:messes(name),
        menu_items(id,name,description,sort_order)
      ),
      booking_events(id,previous_status,new_status,action_source,created_at)
      `,
    )
    .eq('student_id', studentId)
    .order('meal_date', { referencedTable: 'meals', ascending: false })
    .order('start_time', { referencedTable: 'meals', ascending: false })
    .limit(limit)
  if (error) throw error
  const items = (data ?? []) as unknown as BookingHistoryItem[]
  for (const item of items) {
    item.booking_events.sort((a, b) => a.created_at.localeCompare(b.created_at))
  }
  return items
}

export async function getStaffMembers() {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id,name,email,role,is_active,created_at,staff_assignments(id,mess_id,mess:messes(id,name))',
    )
    .eq('role', 'staff')
    .order('name')
  if (error) throw error
  return (data ?? []) as unknown as StaffMember[]
}

export async function adminCreateStaff(input: {
  name: string
  email: string
  mess_ids: string[]
}) {
  const { data, error } = await supabase.rpc('admin_create_staff', {
    p_name: input.name,
    p_email: input.email,
    p_mess_ids: input.mess_ids,
  })
  if (error) throw error
  return data as { profile_id: string }
}

export async function adminUpdateStaff(input: {
  profile_id: string
  name: string
  is_active: boolean
  mess_ids: string[]
}) {
  const { data, error } = await supabase.rpc('admin_update_staff', {
    p_profile_id: input.profile_id,
    p_name: input.name,
    p_is_active: input.is_active,
    p_mess_ids: input.mess_ids,
  })
  if (error) throw error
  return data as { profile_id: string }
}

export async function bulkImportStudents(records: ImportRecord[]) {
  const { data, error } = await supabase.rpc('admin_bulk_import_students', {
    p_records: records as unknown as Json,
  })
  if (error) throw error
  return data as unknown as ImportResult
}

export interface AdminOverviewData {
  totalStudents: number
  activeStudents: number
  totalStaff: number
  totalMesses: number
  activeMesses: number
  todayMeals: number
  todayBookings: number
  optedInToday: number
  consumedToday: number
  messSummaries: {
    id: string
    name: string
    meals: number
    optedIn: number
    optedOut: number
    consumed: number
    students: number
  }[]
}

export async function getAdminOverview(): Promise<AdminOverviewData> {
  const today = todayIST()

  const [
    studentCount,
    activeStudentCount,
    staffCount,
    messCount,
    activeMessCount,
    todayMealRows,
    messRows,
    studentRows,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student')
      .eq('is_active', true),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'staff'),
    supabase.from('messes').select('id', { count: 'exact', head: true }),
    supabase.from('messes').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase
      .from('meals')
      .select('id,mess_id,category,title,meal_bookings(status,consumed_at)')
      .eq('meal_date', today),
    supabase.from('messes').select('id,name').order('name'),
    supabase.from('students').select('id,mess_id'),
  ])

  const adminError =
    studentCount.error ??
    activeStudentCount.error ??
    staffCount.error ??
    messCount.error ??
    activeMessCount.error ??
    todayMealRows.error ??
    messRows.error ??
    studentRows.error
  if (adminError) throw adminError

  const meals = (todayMealRows.data ?? []) as unknown as {
    id: string
    mess_id: string
    category: MealCategory
    title: string
    meal_bookings: { status: string; consumed_at: string | null }[]
  }[]

  const studentsPerMess = new Map<string, number>()
  for (const student of studentRows.data ?? []) {
    studentsPerMess.set(student.mess_id, (studentsPerMess.get(student.mess_id) ?? 0) + 1)
  }

  let todayBookings = 0
  let optedInToday = 0
  let consumedToday = 0
  const summaries = new Map<
    string,
    { id: string; name: string; meals: number; optedIn: number; optedOut: number; consumed: number; students: number }
  >()

  for (const mess of messRows.data ?? []) {
    summaries.set(mess.id, {
      id: mess.id,
      name: mess.name,
      meals: 0,
      optedIn: 0,
      optedOut: 0,
      consumed: 0,
      students: studentsPerMess.get(mess.id) ?? 0,
    })
  }

  for (const meal of meals) {
    const summary = summaries.get(meal.mess_id)
    if (!summary) continue
    summary.meals += 1
    for (const booking of meal.meal_bookings) {
      todayBookings += 1
      if (booking.status === 'opted_in') {
        optedInToday += 1
        summary.optedIn += 1
      } else {
        summary.optedOut += 1
      }
      if (booking.consumed_at) {
        consumedToday += 1
        summary.consumed += 1
      }
    }
  }

  return {
    totalStudents: studentCount.count ?? 0,
    activeStudents: activeStudentCount.count ?? 0,
    totalStaff: staffCount.count ?? 0,
    totalMesses: messCount.count ?? 0,
    activeMesses: activeMessCount.count ?? 0,
    todayMeals: meals.length,
    todayBookings,
    optedInToday,
    consumedToday,
    messSummaries: [...summaries.values()],
  }
}
