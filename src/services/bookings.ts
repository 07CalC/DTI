import { supabase } from '@/lib/supabase'
import type { BookingStatus } from '@/types/app'

export async function setMyBookingStatus(mealId: string, status: BookingStatus) {
  const { data, error } = await supabase.rpc('set_my_booking_status', {
    p_meal_id: mealId,
    p_status: status,
  })
  if (error) throw error
  return data as { booking_id: string; status: BookingStatus; booking_cutoff_at: string }
}

export async function updateMyPreference(preference: BookingStatus) {
  const { data, error } = await supabase.rpc('update_my_preference', {
    p_preference: preference,
  })
  if (error) throw error
  return data as { default_booking_preference: BookingStatus }
}
