import { supabase } from '@/lib/supabase'
import type { MealCategory, MealTemplate } from '@/types/app'

export interface MealTemplateSaveInput {
  mess_id: string
  day_of_week: number
  category: MealCategory
  title: string
  description?: string
  start_time: string
  end_time: string
  cutoff_offset_minutes: number
  is_active: boolean
  menu_items: { name: string; description?: string }[]
}

const MEAL_TEMPLATE_SELECT = `
  id, mess_id, day_of_week, category, title, description, start_time,
  end_time, cutoff_offset_minutes, is_active, updated_at,
  menu_items:meal_template_items(id,name,description,sort_order)
`

export async function getMealTemplates(messIds: string[]) {
  if (messIds.length === 0) return []

  try {
    await materializeRecurringMeals(messIds, 21)
  } catch (error) {
    console.warn('Could not generate recurring meals', error)
  }

  const { data, error } = await supabase
    .from('meal_templates')
    .select(MEAL_TEMPLATE_SELECT)
    .in('mess_id', messIds)
    .order('day_of_week')
    .order('start_time')
  if (error) throw error
  return (data ?? []) as unknown as MealTemplate[]
}

export async function saveMealTemplate(input: MealTemplateSaveInput) {
  const { data, error } = await supabase
    .from('meal_templates')
    .upsert(
      {
        mess_id: input.mess_id,
        day_of_week: input.day_of_week,
        category: input.category,
        title: input.title,
        description: input.description || null,
        start_time: input.start_time,
        end_time: input.end_time,
        cutoff_offset_minutes: input.cutoff_offset_minutes,
        is_active: input.is_active,
      },
      { onConflict: 'mess_id,day_of_week,category' },
    )
    .select('id')
    .single()
  if (error) throw error

  const { error: deleteError } = await supabase
    .from('meal_template_items')
    .delete()
    .eq('template_id', data.id)
  if (deleteError) throw deleteError

  if (input.menu_items.length > 0) {
    const { error: itemError } = await supabase.from('meal_template_items').insert(
      input.menu_items.map((item, index) => ({
        template_id: data.id,
        name: item.name,
        description: item.description || null,
        sort_order: index,
      })),
    )
    if (itemError) throw itemError
  }

  return data.id
}

export async function deleteMealTemplate(templateId: string) {
  const { error } = await supabase.from('meal_templates').delete().eq('id', templateId)
  if (error) throw error
}

export async function materializeRecurringMeals(
  messIds: string[] | null,
  days = 21,
  refresh = false,
) {
  const { data, error } = await supabase.rpc('materialize_recurring_meals', {
    p_mess_ids: messIds,
    p_days: days,
    p_refresh: refresh,
  })
  if (error) throw error
  return (data ?? 0) as number
}
