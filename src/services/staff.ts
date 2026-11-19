import { supabase } from '@/lib/supabase'
import { todayIST } from '@/lib/utils'
import { materializeRecurringMeals } from '@/services/meal-plans'
import type {
  BookingStatus,
  MealCategory,
  MealRecord,
  ParticipationBooking,
  ScanResult,
  StudentDirectoryItem,
} from '@/types/app'

export interface MealSaveInput {
  mess_id: string
  category: MealCategory
  title: string
  description?: string
  meal_date: string
  start_time: string
  end_time: string
  booking_cutoff_at: string
  menu_items: { name: string; description?: string }[]
}

const MEAL_LIST_SELECT = `
  id, mess_id, category, title, description, meal_date, start_time, end_time,
  booking_cutoff_at, template_id, created_at, updated_at,
  mess:messes(id,name),
  menu_items(id,name,description,sort_order),
  meal_bookings(id,status,consumed_at,initial_status,created_at,updated_at,student_id)
`

const MEAL_WITH_STUDENTS_SELECT = `
  id, mess_id, category, title, description, meal_date, start_time, end_time,
  booking_cutoff_at, template_id, created_at, updated_at,
  mess:messes(id,name),
  menu_items(id,name,description,sort_order),
  meal_bookings(
    id,status,initial_status,consumed_at,created_at,updated_at,
    student:students!inner(
      id,roll_number,default_booking_preference,
      profile:profiles!inner(id,name,email),
      mess:messes(id,name)
    )
  )
`

export type StaffMealListItem = MealRecord & {
  meal_bookings: {
    id: string
    status: BookingStatus
    consumed_at: string | null
    initial_status: BookingStatus
    created_at: string
    updated_at: string
    student_id: string
  }[]
}

export type StaffMealDetail = MealRecord & {
  meal_bookings: ParticipationBooking[]
}

export async function getStaffMeals(messIds: string[], scope: 'today' | 'upcoming' | 'past') {
  if (messIds.length === 0) return []

  // The upcoming view is the staff app's main entry point. Use it to fill in
  // any missing meals from the weekly plan before reading the calendar.
  if (scope === 'upcoming') {
    try {
      await materializeRecurringMeals(messIds, 21)
    } catch (error) {
      console.warn('Could not generate recurring meals', error)
    }
  }

  let query = supabase.from('meals').select(MEAL_LIST_SELECT).in('mess_id', messIds)

  if (scope === 'today') query = query.eq('meal_date', todayIST())
  if (scope === 'upcoming') query = query.gte('meal_date', todayIST())
  if (scope === 'past') query = query.lt('meal_date', todayIST())

  const { data, error } = await query
    .order('meal_date', { ascending: scope !== 'past' })
    .order('start_time', { ascending: scope !== 'past' })
    .limit(scope === 'past' ? 60 : 40)

  if (error) throw error
  return (data ?? []) as unknown as StaffMealListItem[]
}

export async function getStaffMeal(mealId: string) {
  const { data, error } = await supabase
    .from('meals')
    .select(MEAL_WITH_STUDENTS_SELECT)
    .eq('id', mealId)
    .single()
  if (error) throw error
  return data as unknown as StaffMealDetail
}

export async function getStaffStudents(messIds: string[]) {
  if (messIds.length === 0) return []
  const { data, error } = await supabase
    .from('students')
    .select(
      `
      id, roll_number, mess_id, default_booking_preference, created_at,
      profile:profiles!inner(id,name,email,is_active),
      mess:messes(id,name)
      `,
    )
    .in('mess_id', messIds)
    .order('roll_number')
  if (error) throw error
  return (data ?? []) as unknown as StudentDirectoryItem[]
}

export async function getStudentCountsByMess(messIds: string[]) {
  if (messIds.length === 0) return {} as Record<string, number>
  const { data, error } = await supabase
    .from('students')
    .select('id,mess_id')
    .in('mess_id', messIds)
  if (error) throw error
  const counts: Record<string, number> = {}
  for (const student of data ?? []) {
    counts[student.mess_id] = (counts[student.mess_id] ?? 0) + 1
  }
  return counts
}

export async function saveMeal(input: MealSaveInput, mealId?: string) {
  if (mealId) {
    const { data, error } = await supabase
      .from('meals')
      .update({
        category: input.category,
        title: input.title,
        description: input.description || null,
        meal_date: input.meal_date,
        start_time: input.start_time,
        end_time: input.end_time,
        booking_cutoff_at: input.booking_cutoff_at,
        // Editing a generated meal turns it into a one-off override so the
        // weekly plan will not overwrite the change on its next sync.
        template_id: null,
      })
      .eq('id', mealId)
      .select('id')
      .single()
    if (error) throw error

    const { error: deleteError } = await supabase.from('menu_items').delete().eq('meal_id', mealId)
    if (deleteError) throw deleteError

    if (input.menu_items.length > 0) {
      const { error: menuError } = await supabase.from('menu_items').insert(
        input.menu_items.map((item, index) => ({
          meal_id: mealId,
          name: item.name,
          description: item.description || null,
          sort_order: index,
        })),
      )
      if (menuError) throw menuError
    }

    return data.id
  }

  const { data, error } = await supabase
    .from('meals')
    .insert({
      mess_id: input.mess_id,
      category: input.category,
      title: input.title,
      description: input.description || null,
      meal_date: input.meal_date,
      start_time: input.start_time,
      end_time: input.end_time,
      booking_cutoff_at: input.booking_cutoff_at,
    })
    .select('id')
    .single()
  if (error) throw error

  if (input.menu_items.length > 0) {
    const { error: menuError } = await supabase.from('menu_items').insert(
      input.menu_items.map((item, index) => ({
        meal_id: data.id,
        name: item.name,
        description: item.description || null,
        sort_order: index,
      })),
    )
    if (menuError) throw menuError
  }

  return data.id
}

export async function deleteMeal(mealId: string) {
  const { error } = await supabase.from('meals').delete().eq('id', mealId)
  if (error) throw error
}

export async function scanBooking(token: string) {
  const { data, error } = await supabase.rpc('scan_booking', { p_token: token })
  if (error) throw error
  return data as unknown as ScanResult
}

export async function scanBookingManual(mealId: string, rollNumber: string) {
  const { data, error } = await supabase.rpc('scan_booking_manual', {
    p_meal_id: mealId,
    p_roll_number: rollNumber,
  })
  if (error) throw error
  return data as unknown as ScanResult
}
