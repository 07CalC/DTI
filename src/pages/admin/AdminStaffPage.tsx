import { useMemo, useState } from 'react'
import { ChevronRight, Plus, Search, ShieldCheck, UsersRound } from 'lucide-react'
import { useMessesSimple, useStaffMembers } from '@/hooks/use-admin'
import { cn, initials, pluralize } from '@/lib/utils'
import type { StaffMember } from '@/types/app'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState, LoadingList } from '@/components/common/error-state'
import { PageIntro } from '@/components/common/section-header'
import { StatCard } from '@/components/common/stat-card'
import { StaffSheet } from '@/components/admin/staff-sheet'

type StatusFilter = 'all' | 'active' | 'inactive'

export function AdminStaffPage() {
  const staffQuery = useStaffMembers()
  const messesQuery = useMessesSimple()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selected, setSelected] = useState<StaffMember | null>(null)

  const staff = useMemo(() => staffQuery.data ?? [], [staffQuery.data])
  const messes = useMemo(() => messesQuery.data ?? [], [messesQuery.data])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return staff.filter((member) => {
      if (statusFilter === 'active' && !member.is_active) return false
      if (statusFilter === 'inactive' && member.is_active) return false
      if (!term) return true
      return (
        member.name.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term) ||
        member.staff_assignments.some((assignment) =>
          (assignment.mess?.name ?? '').toLowerCase().includes(term),
        )
      )
    })
  }, [staff, search, statusFilter])

  const active = staff.filter((member) => member.is_active).length
  const assigned = staff.filter((member) => member.staff_assignments.length > 0).length

  const openCreate = () => {
    setSelected(null)
    setSheetOpen(true)
  }

  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Campus administration"
        title="Staff"
        description="Provision counter accounts and control which messes they can operate."
        action={
          <Button size="icon" className="shrink-0 rounded-2xl" onClick={openCreate} aria-label="Add staff member">
            <Plus className="size-5" />
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          icon={UsersRound}
          label="Staff accounts"
          value={staff.length}
          hint={`${active} active`}
          tone="primary"
        />
        <StatCard
          icon={ShieldCheck}
          label="Assigned"
          value={assigned}
          hint={`${staff.length - assigned} without mess`}
          tone="success"
        />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, email or mess"
          className="pl-9"
          aria-label="Search staff"
        />
      </div>

      <div className="flex gap-1.5">
        {(['all', 'active', 'inactive'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setStatusFilter(option)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[11px] font-semibold capitalize',
              statusFilter === option
                ? 'border-secondary bg-secondary text-secondary-foreground'
                : 'border-border bg-card text-muted-foreground',
            )}
          >
            {option}
          </button>
        ))}
      </div>

      {staffQuery.isLoading && <LoadingList rows={4} />}

      {staffQuery.isError && (
        <ErrorState
          title="Staff could not load"
          message="Please try again."
          onRetry={() => staffQuery.refetch()}
        />
      )}

      {!staffQuery.isLoading && !staffQuery.isError && filtered.length === 0 && (
        <div className="rounded-2xl border border-border/70 bg-card shadow-card">
          <EmptyState
            icon={UsersRound}
            title={staff.length === 0 ? 'No staff yet' : 'No matches'}
            description={
              staff.length === 0
                ? 'Create a staff account to let someone publish meals and scan passes.'
                : 'Try a different search or filter.'
            }
            action={
              staff.length === 0 ? (
                <Button size="sm" onClick={openCreate}>
                  <Plus className="size-3.5" />
                  Add staff
                </Button>
              ) : undefined
            }
          />
        </div>
      )}

      {!staffQuery.isLoading && !staffQuery.isError && filtered.length > 0 && (
        <>
          <p className="text-[11px] text-muted-foreground">
            {pluralize(filtered.length, 'staff account')} shown
          </p>
          <div className="space-y-2">
            {filtered.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => {
                  setSelected(member)
                  setSheetOpen(true)
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-card p-3.5 text-left shadow-card transition-colors hover:bg-muted/30"
              >
                <Avatar className="size-10">
                  <AvatarFallback className="text-xs">{initials(member.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-semibold">{member.name}</p>
                    {!member.is_active && <Badge variant="destructive">Inactive</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{member.email}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {member.staff_assignments.length === 0 ? (
                      <Badge variant="muted">No mess assigned</Badge>
                    ) : (
                      member.staff_assignments.map((assignment) => (
                        <Badge key={assignment.id} variant="secondary">
                          {assignment.mess?.name ?? 'Mess'}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </>
      )}

      <div className="rounded-2xl bg-muted/70 p-3 text-[11px] leading-relaxed text-muted-foreground">
        Staff only see meals, students, bookings and scans for their assigned messes. Removing an
        assignment revokes access immediately on the next request.
      </div>

      <StaffSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        staff={selected}
        messes={messes}
      />
    </div>
  )
}
