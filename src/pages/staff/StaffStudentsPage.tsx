import { useMemo, useState } from 'react'
import { Search, UsersRound, UtensilsCrossed } from 'lucide-react'
import { useAuth } from '@/contexts/auth'
import { useMessStudentCounts, useStaffStudents } from '@/hooks/use-staff'
import { cn, initials, pluralize } from '@/lib/utils'
import type { StudentDirectoryItem } from '@/types/app'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState, LoadingList } from '@/components/common/error-state'
import { PageIntro } from '@/components/common/section-header'
import { StatCard } from '@/components/common/stat-card'

function StudentRow({ student }: { student: StudentDirectoryItem }) {
  const optedIn = student.default_booking_preference === 'opted_in'
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3.5 shadow-card">
      <Avatar className="size-10">
        <AvatarFallback className="text-xs">{initials(student.profile.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold">{student.profile.name}</p>
          {!student.profile.is_active && <Badge variant="destructive">Inactive</Badge>}
        </div>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {student.roll_number} · {student.profile.email}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <Badge variant="muted">
            <UtensilsCrossed />
            {student.mess?.name ?? 'Mess'}
          </Badge>
          <Badge variant={optedIn ? 'success' : 'outline'}>
            {optedIn ? 'Defaults to opted in' : 'Defaults to opted out'}
          </Badge>
        </div>
      </div>
    </div>
  )
}

export function StaffStudentsPage() {
  const { me } = useAuth()
  const query = useStaffStudents()
  const countsQuery = useMessStudentCounts()
  const [search, setSearch] = useState('')
  const [messFilter, setMessFilter] = useState('all')

  const students = useMemo(() => query.data ?? [], [query.data])
  const counts = countsQuery.data ?? {}

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return students.filter((student) => {
      if (messFilter !== 'all' && student.mess_id !== messFilter) return false
      if (!term) return true
      return (
        student.profile.name.toLowerCase().includes(term) ||
        student.roll_number.toLowerCase().includes(term) ||
        student.profile.email.toLowerCase().includes(term)
      )
    })
  }, [students, search, messFilter])

  const optedIn = students.filter((student) => student.default_booking_preference === 'opted_in').length
  const optedOut = students.length - optedIn
  const inactive = students.filter((student) => !student.profile.is_active).length

  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Mess directory"
        title="Students"
        description="Everyone assigned to your mess. Transfers are handled by administrators."
      />

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard icon={UsersRound} label="Students" value={students.length} tone="primary" />
        <StatCard
          icon={UtensilsCrossed}
          label="Default opt-in"
          value={optedIn}
          hint={`${optedOut} opt out · ${inactive} inactive`}
          tone="success"
        />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, roll number or email"
          className="pl-9"
          aria-label="Search students"
        />
      </div>

      {(me?.staff_messes.length ?? 0) > 1 && (
        <div className="-mx-4 overflow-x-auto px-4 no-scrollbar">
          <div className="flex w-max gap-1.5">
            <button
              type="button"
              onClick={() => setMessFilter('all')}
              className={cn(
                'rounded-full border px-3 py-1.5 text-[11px] font-semibold',
                messFilter === 'all'
                  ? 'border-secondary bg-secondary text-secondary-foreground'
                  : 'border-border bg-card text-muted-foreground',
              )}
            >
              All messes ({students.length})
            </button>
            {me?.staff_messes.map((mess) => (
              <button
                key={mess.id}
                type="button"
                onClick={() => setMessFilter(mess.id)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-[11px] font-semibold',
                  messFilter === mess.id
                    ? 'border-secondary bg-secondary text-secondary-foreground'
                    : 'border-border bg-card text-muted-foreground',
                )}
              >
                {mess.name} ({counts[mess.id] ?? 0})
              </button>
            ))}
          </div>
        </div>
      )}

      {(query.isLoading || countsQuery.isLoading) && <LoadingList rows={5} />}

      {query.isError && (
        <ErrorState
          title="Students could not load"
          message="Please try again in a moment."
          onRetry={() => query.refetch()}
        />
      )}

      {!query.isLoading && !query.isError && filtered.length === 0 && (
        <div className="rounded-2xl border border-border/70 bg-card shadow-card">
          <EmptyState
            icon={UsersRound}
            title={students.length === 0 ? 'No students yet' : 'No matches'}
            description={
              students.length === 0
                ? 'Students assigned to your mess by an administrator will appear here.'
                : 'Try a different name, roll number, email, or mess filter.'
            }
          />
        </div>
      )}

      {!query.isLoading && !query.isError && filtered.length > 0 && (
        <>
          <p className="text-[11px] text-muted-foreground">
            {pluralize(filtered.length, 'student')} shown
            {search.trim() ? ` for “${search.trim()}”` : ''}
          </p>
          <div className="space-y-2.5">
            {filtered.map((student) => (
              <StudentRow key={student.id} student={student} />
            ))}
          </div>
        </>
      )}

      <div className="flex items-start gap-2 rounded-2xl bg-muted/70 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <UsersRound className="mt-0.5 size-3.5 shrink-0 text-secondary" />
        Staff can view students in assigned messes but cannot move them between messes. Contact an
        administrator for transfers or account changes.
      </div>
    </div>
  )
}
