import { z } from 'zod'
import { fromZonedTime } from 'date-fns-tz'
import { IST } from '@/lib/utils'

const iiitaEmail = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .toLowerCase()
  .regex(/^[a-z0-9._%+-]+@iiita\.ac\.in$/, 'Use an @iiita.ac.in email address')

export const mealSchema = z
  .object({
    category: z.enum(['breakfast', 'lunch', 'snacks', 'dinner']),
    title: z.string().trim().min(2, 'Add a meal title'),
    description: z.string().trim().optional(),
    meal_date: z.string().min(1, 'Choose a date'),
    start_time: z.string().min(1, 'Start time is required'),
    end_time: z.string().min(1, 'End time is required'),
    cutoff_local: z.string().min(1, 'Cutoff is required'),
    menu_items: z
      .array(
        z.object({
          name: z.string().trim().min(1, 'Menu item name is required'),
          description: z.string().trim().optional(),
        }),
      )
      .min(1, 'Add at least one menu item'),
  })
  .superRefine((values, ctx) => {
    if (values.end_time <= values.start_time) {
      ctx.addIssue({
        code: 'custom',
        path: ['end_time'],
        message: 'End time must be after start time',
      })
    }

    try {
      const start = fromZonedTime(`${values.meal_date}T${values.start_time}`, IST)
      const cutoff = fromZonedTime(values.cutoff_local, IST)
      if (cutoff.getTime() > start.getTime()) {
        ctx.addIssue({
          code: 'custom',
          path: ['cutoff_local'],
          message: 'Cutoff must be at or before the meal start time',
        })
      }
    } catch {
      ctx.addIssue({
        code: 'custom',
        path: ['cutoff_local'],
        message: 'Invalid cutoff date/time',
      })
    }
  })

export type MealFormValues = z.infer<typeof mealSchema>

export const studentSchema = z.object({
  name: z.string().trim().min(2, 'Full name is required'),
  email: iiitaEmail,
  roll_number: z.string().trim().min(3, 'Roll number is required'),
  mess_id: z.string().uuid('Choose a mess'),
  default_booking_preference: z.enum(['opted_in', 'opted_out']),
  is_active: z.boolean(),
})

export type StudentFormValues = z.infer<typeof studentSchema>

export const staffCreateSchema = z.object({
  name: z.string().trim().min(2, 'Full name is required'),
  email: iiitaEmail,
  mess_ids: z.array(z.string().uuid()),
})

export type StaffCreateFormValues = z.infer<typeof staffCreateSchema>

export const staffEditSchema = z.object({
  name: z.string().trim().min(2, 'Full name is required'),
  mess_ids: z.array(z.string().uuid()),
  is_active: z.boolean(),
})

export type StaffEditFormValues = z.infer<typeof staffEditSchema>

export const staffFormSchema = z.object({
  name: z.string().trim().min(2, 'Full name is required'),
  email: iiitaEmail,
  mess_ids: z.array(z.string().uuid()).min(1, 'Assign at least one mess'),
  is_active: z.boolean(),
})

export type StaffFormValues = z.infer<typeof staffFormSchema>

export const messSchema = z.object({
  name: z.string().trim().min(2, 'Mess name is required'),
  description: z.string().trim().optional(),
  is_active: z.boolean(),
})

export type MessFormValues = z.infer<typeof messSchema>
