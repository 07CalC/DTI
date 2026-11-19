import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth'
import {
  deleteMeal,
  getStaffMeal,
  getStaffMeals,
  getStaffStudents,
  getStudentCountsByMess,
  saveMeal,
  scanBooking,
  scanBookingManual,
  type MealSaveInput,
} from '@/services/staff'
import { errorMessage } from '@/lib/utils'
import {
  deleteMealTemplate,
  getMealTemplates,
  materializeRecurringMeals,
  saveMealTemplate,
  type MealTemplateSaveInput,
} from '@/services/meal-plans'
import type { ScanResult } from '@/types/app'

export function useStaffMeals(scope: 'today' | 'upcoming' | 'past') {
  const { me } = useAuth()
  const messIds = me?.staff_messes.map((mess) => mess.id) ?? []
  return useQuery({
    queryKey: ['staff-meals', scope, messIds],
    queryFn: () => getStaffMeals(messIds, scope),
    enabled: messIds.length > 0,
    staleTime: 15_000,
  })
}

export function useStaffMeal(mealId: string | undefined) {
  return useQuery({
    queryKey: ['staff-meal', mealId],
    queryFn: () => getStaffMeal(mealId!),
    enabled: Boolean(mealId),
    staleTime: 10_000,
  })
}

export function useStaffStudents() {
  const { me } = useAuth()
  const messIds = me?.staff_messes.map((mess) => mess.id) ?? []
  return useQuery({
    queryKey: ['staff-students', messIds],
    queryFn: () => getStaffStudents(messIds),
    enabled: messIds.length > 0,
    staleTime: 30_000,
  })
}

export function useMessStudentCounts() {
  const { me } = useAuth()
  const messIds = me?.staff_messes.map((mess) => mess.id) ?? []
  return useQuery({
    queryKey: ['staff-student-counts', messIds],
    queryFn: () => getStudentCountsByMess(messIds),
    enabled: messIds.length > 0,
    staleTime: 30_000,
  })
}

export function useMealTemplates() {
  const { me } = useAuth()
  const messIds = me?.staff_messes.map((mess) => mess.id) ?? []
  return useQuery({
    queryKey: ['meal-templates', messIds],
    queryFn: () => getMealTemplates(messIds),
    enabled: messIds.length > 0,
    staleTime: 30_000,
  })
}

function invalidateMealViews(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['meal-templates'] })
  queryClient.invalidateQueries({ queryKey: ['staff-meals'] })
  queryClient.invalidateQueries({ queryKey: ['staff-meal'] })
  queryClient.invalidateQueries({ queryKey: ['student-meals'] })
  queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
  queryClient.invalidateQueries({ queryKey: ['mess-detail'] })
}

export function useSaveMealTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: MealTemplateSaveInput) => {
      const templateId = await saveMealTemplate(input)
      // Apply the updated plan to upcoming meals immediately.
      await materializeRecurringMeals([input.mess_id], 21, true)
      return templateId
    },
    onSuccess: () => {
      invalidateMealViews(queryClient)
      toast.success('Weekly menu saved and upcoming meals updated')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}

export function useDeleteMealTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ templateId, messId }: { templateId: string; messId: string }) => {
      await deleteMealTemplate(templateId)
      await materializeRecurringMeals([messId], 21, true)
    },
    onSuccess: () => {
      invalidateMealViews(queryClient)
      toast.success('Removed from the weekly plan')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}

export function useSaveMeal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ input, mealId }: { input: MealSaveInput; mealId?: string }) =>
      saveMeal(input, mealId),
    onSuccess: (_id, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff-meals'] })
      queryClient.invalidateQueries({ queryKey: ['staff-meal'] })
      queryClient.invalidateQueries({ queryKey: ['student-meals'] })
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
      queryClient.invalidateQueries({ queryKey: ['mess-detail'] })
      toast.success(variables.mealId ? 'Meal updated' : 'Meal created and bookings generated')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}

export function useDeleteMeal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (mealId: string) => deleteMeal(mealId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-meals'] })
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
      toast.success('Meal deleted')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}

export function useScanBooking() {
  const queryClient = useQueryClient()
  return useMutation<ScanResult, Error, string>({
    mutationFn: (token) => scanBooking(token),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['staff-meals'] })
      queryClient.invalidateQueries({ queryKey: ['staff-meal'] })
      if (result.result === 'valid') toast.success('Meal pass verified')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}

export function useScanManual() {
  const queryClient = useQueryClient()
  return useMutation<
    ScanResult,
    Error,
    { mealId: string; rollNumber: string }
  >({
    mutationFn: ({ mealId, rollNumber }) => scanBookingManual(mealId, rollNumber),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['staff-meals'] })
      queryClient.invalidateQueries({ queryKey: ['staff-meal'] })
      if (result.result === 'valid') toast.success('Meal pass verified')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}
