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
