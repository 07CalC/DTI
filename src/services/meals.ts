import { supabase } from '@/lib/supabase'
import { todayIST } from '@/lib/utils'
import type {
  BookingHistoryItem,
  MealForStudent,
  MealPass,
} from '@/types/app'

const STUDENT_MEAL_SELECT = `
  id, mess_id, category, title, description, meal_date, start_time, end_time,
  booking_cutoff_at,
  mess:messes(id,name),
  menu_items(id,name,description,sort_order),
  meal_bookings(id,status,consumed_at,initial_status,created_at,updated_at)
`

export async function getUpcomingStudentMeals() {
  const { data, error } = await supabase
    .from('meals')
    .select(STUDENT_MEAL_SELECT)
    .gte('meal_date', todayIST())
    .order('meal_date', { ascending: true })
    .order('start_time', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as MealForStudent[]
}

export async function getStudentMeal(mealId: string) {
  const { data, error } = await supabase
    .from('meals')
    .select(STUDENT_MEAL_SELECT)
    .eq('id', mealId)
    .single()
  if (error) throw error
  return data as unknown as MealForStudent
}

export type HistoryFilter = 'all' | 'opted_in' | 'opted_out' | 'consumed' | 'not_consumed'

export async function getStudentHistory(page: number, pageSize: number, filter: HistoryFilter) {
  let query = supabase
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
      { count: 'exact' },
    )
    .lte('meals.meal_date', todayIST())

  if (filter === 'opted_in' || filter === 'opted_out') query = query.eq('status', filter)
  if (filter === 'consumed') query = query.not('consumed_at', 'is', null)
  if (filter === 'not_consumed') query = query.is('consumed_at', null)

  const from = page * pageSize
  const { data, error, count } = await query
    .order('meal_date', { referencedTable: 'meals', ascending: false })
    .order('start_time', { referencedTable: 'meals', ascending: false })
    .range(from, from + pageSize - 1)

  if (error) throw error
  const items = (data ?? []) as unknown as BookingHistoryItem[]
  for (const item of items) {
    item.booking_events.sort((a, b) => a.created_at.localeCompare(b.created_at))
  }
  return { items, count: count ?? 0 }
}

export async function getMealPass(bookingId: string) {
  const { data, error } = await supabase.rpc('get_my_meal_pass', {
    p_booking_id: bookingId,
  })
  if (error) throw error
  return data as unknown as MealPass
}
