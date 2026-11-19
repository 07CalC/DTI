import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  adminCreateStaff,
  adminCreateStudent,
  adminUpdateStaff,
  adminUpdateStudent,
  bulkImportStudents,
  createMess,
  deleteMess,
  getAdminOverview,
  getAdminStudentHistory,
  getAdminStudents,
  getMessDetail,
  getMesses,
  getMessesSimple,
  getStaffMembers,
  updateMess,
} from '@/services/admin'
import { errorMessage } from '@/lib/utils'
import type { ImportRecord } from '@/types/app'

export function useMesses() {
  return useQuery({ queryKey: ['messes'], queryFn: getMesses, staleTime: 30_000 })
}

export function useMessesSimple() {
  return useQuery({ queryKey: ['messes-simple'], queryFn: getMessesSimple, staleTime: 30_000 })
}

export function useMessDetail(messId: string | undefined) {
  return useQuery({
    queryKey: ['mess-detail', messId],
    queryFn: () => getMessDetail(messId!),
    enabled: Boolean(messId),
  })
}

export function useCreateMess() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createMess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messes'] })
      queryClient.invalidateQueries({ queryKey: ['messes-simple'] })
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
      toast.success('Mess created')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}

export function useUpdateMess() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateMess>[1] }) =>
      updateMess(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messes'] })
      queryClient.invalidateQueries({ queryKey: ['messes-simple'] })
      queryClient.invalidateQueries({ queryKey: ['mess-detail'] })
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
      toast.success('Mess updated')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}

export function useDeleteMess() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteMess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messes'] })
      queryClient.invalidateQueries({ queryKey: ['messes-simple'] })
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
      toast.success('Mess deleted')
    },
    onError: (error) =>
      toast.error(
        /foreign key|violates/i.test(errorMessage(error))
          ? 'This mess still has students, staff or meals. Deactivate it instead.'
          : errorMessage(error),
      ),
  })
}

export function useAdminStudents() {
  return useQuery({ queryKey: ['admin-students'], queryFn: getAdminStudents, staleTime: 15_000 })
}

export function useCreateStudent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: adminCreateStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-students'] })
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
      queryClient.invalidateQueries({ queryKey: ['messes'] })
      queryClient.invalidateQueries({ queryKey: ['mess-detail'] })
      toast.success('Student account created')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}

export function useUpdateStudent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: adminUpdateStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-students'] })
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
      queryClient.invalidateQueries({ queryKey: ['messes'] })
      queryClient.invalidateQueries({ queryKey: ['mess-detail'] })
      queryClient.invalidateQueries({ queryKey: ['admin-student-history'] })
      toast.success('Student updated')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}

export function useAdminStudentHistory(studentId: string | undefined) {
  return useQuery({
    queryKey: ['admin-student-history', studentId],
    queryFn: () => getAdminStudentHistory(studentId!),
    enabled: Boolean(studentId),
  })
}

export function useStaffMembers() {
  return useQuery({ queryKey: ['staff-members'], queryFn: getStaffMembers, staleTime: 15_000 })
}

export function useCreateStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: adminCreateStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-members'] })
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
      queryClient.invalidateQueries({ queryKey: ['messes'] })
      toast.success('Staff account created')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}

export function useUpdateStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: adminUpdateStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-members'] })
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
      queryClient.invalidateQueries({ queryKey: ['messes'] })
      toast.success('Staff assignments updated')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}

export function useBulkImport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (records: ImportRecord[]) => bulkImportStudents(records),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-students'] })
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
      queryClient.invalidateQueries({ queryKey: ['messes'] })
      toast.success(`Imported ${result.inserted} student${result.inserted === 1 ? '' : 's'}`)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin-overview'],
    queryFn: getAdminOverview,
    staleTime: 20_000,
  })
}
