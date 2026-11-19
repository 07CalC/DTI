import { useMemo, useState } from 'react'
import { ChevronRight, Plus, Search, UsersRound } from 'lucide-react'
import { useAdminStudents, useMessesSimple } from '@/hooks/use-admin'
import { cn, initials, pluralize } from '@/lib/utils'
import type { StudentDirectoryItem } from '@/types/app'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState, LoadingList } from '@/components/common/error-state'
import { PageIntro } from '@/components/common/section-header'
import { StatCard } from '@/components/common/stat-card'
import { StudentSheet } from '@/components/admin/student-sheet'

type StatusFilter = 'all' | 'active' | 'inactive'

export function AdminStudentsPage() {
  const studentsQuery = useAdminStudents()
  const messesQuery = useMessesSimple()
  const [search, setSearch] = useState('')
  const [messFilter, setMessFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selected, setSelected] = useState<StudentDirectoryItem | null>(null)

  const students = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data])
  const messes = useMemo(() => messesQuery.data ?? [], [messesQuery.data])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return students.filter((student) => {
      if (messFilter !== 'all' && student.mess_id !== messFilter) return false
      if (statusFilter === 'active' && !student.profile.is_active) return false
      if (statusFilter === 'inactive' && student.profile.is_active) return false
      if (!term) return true
      return (
        student.profile.name.toLowerCase().includes(term) ||
        student.roll_number.toLowerCase().includes(term) ||
        student.profile.email.toLowerCase().includes(term)
      )
    })
  }, [students, messFilter, statusFilter, search])

  const active = students.filter((student) => student.profile.is_active).length
  const optedIn = students.filter(
    (student) => student.default_booking_preference === 'opted_in',
  ).length

  const openCreate = () => {
    setSelected(null)
    setSheetOpen(true)
  }

  const openStudent = (student: StudentDirectoryItem) => {
    setSelected(student)
    setSheetOpen(true)
  }

  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Campus administration"
        title="Students"
        description="Provision accounts, transfer messes, and review complete booking history."
        action={
          <Button size="icon" className="shrink-0 rounded-2xl" onClick={openCreate} aria-label="Add student">
            <Plus className="size-5" />
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard icon={UsersRound} label="Students" value={students.length} hint={`${active} active`} tone="primary" />
        <StatCard
          icon={UsersRound}
          label="Default opt-in"
          value={optedIn}
          hint={`${students.length - optedIn} opt out`}
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

      <div className="-mx-4 overflow-x-auto px-4 no-scrollbar">
        <div className="flex w-max gap-1.5">
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
          <span className="mx-0.5 w-px bg-border" />
          <button
            type="button"
            onClick={() => setMessFilter('all')}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[11px] font-semibold',
              messFilter === 'all'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground',
            )}
          >
            All messes
          </button>
          {messes.map((mess) => (
            <button
              key={mess.id}
              type="button"
              onClick={() => setMessFilter(mess.id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-[11px] font-semibold',
                messFilter === mess.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground',
              )}
            >
              {mess.name}
            </button>
          ))}
        </div>
      </div>

      {studentsQuery.isLoading && <LoadingList rows={5} />}

      {studentsQuery.isError && (
        <ErrorState
          title="Students could not load"
          message="Please try again."
          onRetry={() => studentsQuery.refetch()}
        />
      )}

      {!studentsQuery.isLoading && !studentsQuery.isError && filtered.length === 0 && (
        <div className="rounded-2xl border border-border/70 bg-card shadow-card">
          <EmptyState
            icon={UsersRound}
            title={students.length === 0 ? 'No students yet' : 'No matches'}
            description={
              students.length === 0
                ? 'Create an account or use bulk import to provision students.'
                : 'Try a different search or filter.'
            }
            action={
              students.length === 0 ? (
                <Button size="sm" onClick={openCreate}>
                  <Plus className="size-3.5" />
                  Add student
                </Button>
              ) : undefined
            }
          />
        </div>
      )}

      {!studentsQuery.isLoading && !studentsQuery.isError && filtered.length > 0 && (
        <>
          <p className="text-[11px] text-muted-foreground">
            {pluralize(filtered.length, 'student')} shown
            {search.trim() ? ` for “${search.trim()}”` : ''}
          </p>
          <div className="space-y-2">
            {filtered.map((student) => (
              <button
                key={student.id}
                type="button"
                onClick={() => openStudent(student)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-card p-3.5 text-left shadow-card transition-colors hover:bg-muted/30"
              >
                <Avatar className="size-10">
                  <AvatarFallback className="text-xs">{initials(student.profile.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-semibold">{student.profile.name}</p>
                    {!student.profile.is_active && <Badge variant="destructive">Inactive</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {student.roll_number} · {student.profile.email}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <Badge variant="muted">{student.mess?.name ?? 'No mess'}</Badge>
                    <Badge variant={student.default_booking_preference === 'opted_in' ? 'success' : 'outline'}>
                      {student.default_booking_preference === 'opted_in' ? 'Opt in default' : 'Opt out default'}
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </>
      )}

      <div className="rounded-2xl bg-muted/70 p-3 text-[11px] leading-relaxed text-muted-foreground">
        Transferring a student changes future meal generation only. Historical bookings remain linked
        to the mess where they were served. Use bulk import to provision many accounts at once.
      </div>

      <StudentSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        student={selected}
        messes={messes}
      />
    </div>
  )
}
