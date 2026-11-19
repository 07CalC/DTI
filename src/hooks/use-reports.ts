import { useQuery } from '@tanstack/react-query'
import { getAdminReport, type ReportFilters } from '@/services/reports'

export function useAdminReport(filters: ReportFilters, enabled: boolean) {
  return useQuery({
    queryKey: ['admin-report', filters],
    queryFn: () => getAdminReport(filters),
    enabled,
    staleTime: 30_000,
  })
}
