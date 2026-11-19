import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  ClipboardList,
  Download,
  Filter,
  LoaderCircle,
  RefreshCw,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react'
import { useAdminReport } from '@/hooks/use-reports'
import { useAdminStudents, useMessesSimple } from '@/hooks/use-admin'
import { downloadTextFile, toCsv } from '@/lib/csv'
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  addDaysToIST,
  formatDateTime,
  formatMealDate,
  todayIST,
} from '@/lib/utils'
import type { MealCategory, ReportRow } from '@/types/app'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState, LoadingList } from '@/components/common/error-state'
import { FormField } from '@/components/common/form-field'
import { PageIntro } from '@/components/common/section-header'
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge'
import { MealIcon } from '@/components/meals/meal-icon'

function ReportRowCard({ row }: { row: ReportRow }) {
  return (
    <article className="rounded-xl border border-border/60 bg-card p-3">
      <div className="flex items-start gap-2.5">
        <MealIcon category={row.meal_category} className="size-9 rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">
                {row.student_name} · {row.roll_number}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {row.meal_title} · {formatMealDate(row.meal_date, 'EEE, d MMM')} · {row.mess_name}
              </p>
            </div>
            <BookingStatusBadge status={row.status} consumed={Boolean(row.consumed_at)} />
          </div>
          <p className="mt-1 line-clamp-1 text-[10px] text-muted-foreground">{row.menu || 'No menu recorded'}</p>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-muted-foreground">
            <span>Initial: {row.initial_status === 'opted_in' ? 'opted in' : 'opted out'}</span>
            <span>Opt-in: {row.opt_in_at ? formatDateTime(row.opt_in_at) : '—'}</span>
            <span>Opt-out: {row.opt_out_at ? formatDateTime(row.opt_out_at) : '—'}</span>
            <span>{row.events.length} events</span>
          </div>
        </div>
      </div>
    </article>
  )
}

export function AdminReportsPage() {
  const messesQuery = useMessesSimple()
  const studentsQuery = useAdminStudents()
  const [messId, setMessId] = useState('all')
  const [studentId, setStudentId] = useState('all')
  const [category, setCategory] = useState<'all' | MealCategory>('all')
  const [from, setFrom] = useState(addDaysToIST(-30))
  const [to, setTo] = useState(todayIST())

  const messes = useMemo(() => messesQuery.data ?? [], [messesQuery.data])
  const students = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data])
  const validRange = Boolean(from && to && from <= to)

  const filters = useMemo(
    () => ({
      messId: messId === 'all' ? undefined : messId,
      studentId: studentId === 'all' ? undefined : studentId,
      from,
      to,
      category: category === 'all' ? undefined : category,
    }),
    [messId, studentId, from, to, category],
  )

  const reportQuery = useAdminReport(filters, validRange)
  const rows = useMemo(() => reportQuery.data ?? [], [reportQuery.data])

  const studentOptions = useMemo(
    () => (messId === 'all' ? students : students.filter((student) => student.mess_id === messId)),
    [students, messId],
  )

  const summary = useMemo(() => {
    let optedIn = 0
    let optedOut = 0
    let consumed = 0
    const uniqueStudents = new Set<string>()
    for (const row of rows) {
      uniqueStudents.add(row.student_id)
      if (row.status === 'opted_in') optedIn += 1
      else optedOut += 1
      if (row.consumed_at) consumed += 1
    }
    return { optedIn, optedOut, consumed, students: uniqueStudents.size }
  }, [rows])

  const exportCsv = () => {
    if (rows.length === 0) return
    const headers = [
      'Student name',
      'Roll number',
      'Mess',
      'Meal date',
      'Meal category',
      'Meal title',
      'Menu',
      'Booking status',
      'Initial booking status',
      'Opt-in at (UTC)',
      'Opt-out at (UTC)',
      'Consumed at (UTC)',
      'Scan timestamp (UTC)',
      'Booking event history',
    ]
    const data = rows.map((row) => [
      row.student_name,
      row.roll_number,
      row.mess_name,
      row.meal_date,
      row.meal_category,
      row.meal_title,
      row.menu,
      row.status,
      row.initial_status,
      row.opt_in_at ?? '',
      row.opt_out_at ?? '',
      row.consumed_at ?? '',
      row.scanned_at ?? '',
      row.events
        .slice()
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map(
          (event) =>
            `${event.created_at}|${event.previous_status ?? 'none'}>${event.new_status}|${event.action_source}`,
        )
        .join('; '),
    ])
    downloadTextFile(
      `messmate-rebate-${from}-to-${to}.csv`,
      toCsv(headers, data),
    )
  }

  const resetFilters = () => {
    setMessId('all')
    setStudentId('all')
    setCategory('all')
    setFrom(addDaysToIST(-30))
    setTo(todayIST())
  }

  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Rebate data"
        title="Reports"
        description="Export booking and participation data. MessMate deliberately does not apply a rebate formula."
        action={
          <Button
            size="icon"
            variant="outline"
            className="shrink-0 rounded-2xl"
            onClick={() => reportQuery.refetch()}
            aria-label="Refresh report"
          >
            <RefreshCw className={`size-4 ${reportQuery.isFetching ? 'animate-spin' : ''}`} />
          </Button>
        }
      />

      <section className="space-y-4 rounded-2xl border border-border/70 bg-card p-4 shadow-card">
        <div className="flex items-center justify-between">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold">
            <Filter className="size-3.5" />
            Filters
          </p>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={resetFilters}>
            Reset
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="From" htmlFor="report-from">
            <Input
              id="report-from"
              type="date"
              value={from}
              max={to}
              onChange={(event) => setFrom(event.target.value)}
            />
          </FormField>
          <FormField label="To" htmlFor="report-to">
            <Input
              id="report-to"
              type="date"
              value={to}
              min={from}
              onChange={(event) => setTo(event.target.value)}
            />
          </FormField>
        </div>

        {!validRange && (
          <p className="rounded-xl bg-destructive/5 p-2.5 text-[11px] font-medium text-destructive">
            The start date must be on or before the end date.
          </p>
        )}

        <FormField label="Mess">
          <Select
            value={messId}
            onValueChange={(value) => {
              setMessId(value)
              if (value !== 'all') {
                const selected = students.find((student) => student.id === studentId)
                if (selected && selected.mess_id !== value) setStudentId('all')
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All messes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All messes</SelectItem>
              {messes.map((mess) => (
                <SelectItem key={mess.id} value={mess.id}>
                  {mess.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Meal category">
          <Select value={category} onValueChange={(value) => setCategory(value as 'all' | MealCategory)}>
            <SelectTrigger>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORY_ORDER.map((option) => (
                <SelectItem key={option} value={option}>
                  {CATEGORY_META[option].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Student" hint={`${studentOptions.length} in scope`}>
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger>
              <SelectValue placeholder="All students" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All students</SelectItem>
              {studentOptions.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.profile.name} · {student.roll_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </section>

      <div className="grid grid-cols-3 gap-1.5">
        <div className="rounded-xl border border-border/70 bg-card py-2.5 text-center shadow-card">
          <p className="text-lg font-semibold tabular">{rows.length}</p>
          <p className="text-[9px] text-muted-foreground">Bookings</p>
        </div>
        <div className="rounded-xl bg-success-soft py-2.5 text-center text-success">
          <p className="text-lg font-semibold tabular">{summary.consumed}</p>
          <p className="text-[9px]">Consumed</p>
        </div>
        <div className="rounded-xl bg-warning-soft py-2.5 text-center text-warning">
          <p className="text-lg font-semibold tabular">{summary.optedOut}</p>
          <p className="text-[9px]">Opted out</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          {summary.optedIn} opted in · {summary.students} students
        </span>
        <span>Dates inclusive · Asia/Kolkata</span>
      </div>

      <Button className="w-full" onClick={exportCsv} disabled={rows.length === 0 || reportQuery.isFetching}>
        {reportQuery.isFetching ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        Export {rows.length > 0 ? `${rows.length} rows` : 'CSV'}
      </Button>

      {reportQuery.isLoading && <LoadingList rows={3} />}
      {reportQuery.isError && (
        <ErrorState
          title="Report could not load"
          message="Check the filters and try again."
          onRetry={() => reportQuery.refetch()}
        />
      )}

      {!reportQuery.isLoading && !reportQuery.isError && rows.length === 0 && validRange && (
        <div className="rounded-2xl border border-border/70 bg-card shadow-card">
          <EmptyState
            icon={ClipboardList}
            title="No bookings match"
            description="Try a wider date range or clear the mess, category and student filters."
          />
        </div>
      )}

      {rows.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold">Preview</p>
            <span className="text-[10px] text-muted-foreground">First 20 of {rows.length}</span>
          </div>
          <div className="space-y-2">
            {rows.slice(0, 20).map((row) => (
              <ReportRowCard key={row.booking_id} row={row} />
            ))}
          </div>
          {rows.length > 20 && (
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              The CSV export includes all {rows.length} rows, not just this preview.
            </p>
          )}
        </section>
      )}

      <div className="space-y-2 rounded-2xl bg-muted/70 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <p className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-secondary" />
          The export includes every opt-in/opt-out transition timestamp, the initial preference-based
          status, consumption state and scan time.
        </p>
        <p className="flex items-start gap-2">
          <XCircle className="mt-0.5 size-3.5 shrink-0 text-secondary" />
          No rebate amount or formula is calculated here. Use the exported event history to apply the
          mess committee&apos;s own rules.
        </p>
        <p className="flex items-start gap-2">
          <UtensilsCrossed className="mt-0.5 size-3.5 shrink-0 text-secondary" />
          Historical rows stay attached to the original mess and meal even after a student transfer.
        </p>
      </div>
    </div>
  )
}
