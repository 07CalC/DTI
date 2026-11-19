import { supabase } from '@/lib/supabase'
import type { MealCategory, ReportRow } from '@/types/app'

export interface ReportFilters {
  messId?: string
  studentId?: string
  from: string
  to: string
  category?: MealCategory
}

export async function getAdminReport(filters: ReportFilters) {
  const { data, error } = await supabase.rpc('admin_report', {
    p_mess_id: filters.messId,
    p_student_id: filters.studentId,
    p_from: filters.from,
    p_to: filters.to,
    p_category: filters.category,
  })
  if (error) throw error
  return (data ?? []) as unknown as ReportRow[]
}
