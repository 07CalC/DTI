import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getMealPass, getStudentHistory, getStudentMeal, getUpcomingStudentMeals, type HistoryFilter } from '@/services/meals'
import { setMyBookingStatus, updateMyPreference } from '@/services/bookings'
import { errorMessage } from '@/lib/utils'
import type { BookingStatus } from '@/types/app'

export const HISTORY_PAGE_SIZE = 10

export function useUpcomingMeals() {
  return useQuery({
    queryKey: ['student-meals'],
    queryFn: getUpcomingStudentMeals,
    staleTime: 15_000,
  })
}

export function useStudentMeal(mealId: string | undefined) {
  return useQuery({
    queryKey: ['student-meal', mealId],
    queryFn: () => getStudentMeal(mealId!),
    enabled: Boolean(mealId),
  })
}

export function useStudentHistory(filter: HistoryFilter, page: number) {
  return useQuery({
    queryKey: ['student-history', filter, page],
    queryFn: () => getStudentHistory(page, HISTORY_PAGE_SIZE, filter),
    staleTime: 15_000,
    placeholderData: (previous) => previous,
  })
}

export function useMealPass(bookingId: string | undefined) {
  return useQuery({
    queryKey: ['meal-pass', bookingId],
    queryFn: () => getMealPass(bookingId!),
    enabled: Boolean(bookingId),
    retry: false,
    refetchInterval: 15_000,
  })
}

export function useSetBookingStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ mealId, status }: { mealId: string; status: BookingStatus }) =>
      setMyBookingStatus(mealId, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['student-meals'] })
      queryClient.invalidateQueries({ queryKey: ['student-meal'] })
      queryClient.invalidateQueries({ queryKey: ['student-history'] })
      queryClient.invalidateQueries({ queryKey: ['meal-pass'] })
      queryClient.invalidateQueries({ queryKey: ['staff-meals'] })
      toast.success(data.status === 'opted_in' ? 'Meal booked' : 'Opted out of this meal')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}

export function useUpdatePreference() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (preference: BookingStatus) => updateMyPreference(preference),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      toast.success('Default preference saved for future meals')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}
