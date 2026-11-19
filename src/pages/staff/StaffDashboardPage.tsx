import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  QrCode,
  ScanLine,
  Timer,
  UsersRound,
  UtensilsCrossed,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth'
import { useMessStudentCounts, useStaffMeals } from '@/hooks/use-staff'
import type { StaffMealListItem } from '@/services/staff'
import { getMealCounts } from '@/lib/participation'
import {
  cutoffLabel,
  formatMealDate,
  formatTimeRange,
  isCutoffPassed,
  isMealPast,
  relativeDayLabel,
  todayIST,
} from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState, LoadingList } from '@/components/common/error-state'
import { PageIntro, SectionHeader } from '@/components/common/section-header'
import { StatCard } from '@/components/common/stat-card'
import { MealIcon } from '@/components/meals/meal-icon'

function TodayMealCard({
  meal,
  totalStudents,
}: {
  meal: StaffMealListItem
  totalStudents: number
}) {
  const counts = getMealCounts(meal, totalStudents)
  const past = isMealPast(meal)

  return (
    <article className="rounded-2xl border border-border/70 bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        <MealIcon category={meal.category} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold">{meal.title}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatTimeRange(meal.start_time, meal.end_time)} · {meal.mess?.name}
              </p>
            </div>
            <Badge variant={past ? 'muted' : isCutoffPassed(meal.booking_cutoff_at) ? 'warning' : 'success'}>
              {past ? 'Served' : isCutoffPassed(meal.booking_cutoff_at) ? 'Locked' : 'Open'}
            </Badge>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-1.5">
            <div className="rounded-lg bg-muted/70 px-1 py-1.5 text-center">
              <p className="text-sm font-semibold tabular">{counts.optedIn}</p>
              <p className="text-[9px] text-muted-foreground">In</p>
            </div>
            <div className="rounded-lg bg-muted/70 px-1 py-1.5 text-center">
              <p className="text-sm font-semibold tabular">{counts.optedOut}</p>
              <p className="text-[9px] text-muted-foreground">Out</p>
            </div>
            <div className="rounded-lg bg-success-soft px-1 py-1.5 text-center text-success">
              <p className="text-sm font-semibold tabular">{counts.scanned}</p>
              <p className="text-[9px]">Scanned</p>
            </div>
            <div className="rounded-lg bg-warning-soft px-1 py-1.5 text-center text-warning">
              <p className="text-sm font-semibold tabular">{counts.pending}</p>
              <p className="text-[9px]">Pending</p>
            </div>
          </div>

          <div className="mt-2.5">
            <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Scan progress</span>
              <span className="tabular">{counts.rate}%</span>
            </div>
            <Progress value={counts.rate} indicatorClassName="bg-success" />
          </div>

          <div className="mt-3 flex gap-1.5">
            <Button asChild size="sm" variant="soft" className="h-8 flex-1">
              <Link to={`/staff/meals/${meal.id}`}>
                <ClipboardCheck className="size-3.5" />
                Participation
              </Link>
            </Button>
            <Button asChild size="sm" className="h-8 flex-1">
              <Link to={`/staff/scanner?meal=${meal.id}`}>
                <ScanLine className="size-3.5" />
                Scan
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}

export function StaffDashboardPage() {
  const { me } = useAuth()
  const todayQuery = useStaffMeals('today')
  const upcomingQuery = useStaffMeals('upcoming')
  const countsQuery = useMessStudentCounts()

  const messIds = me?.staff_messes.map((mess) => mess.id) ?? []
  const todayMeals = (todayQuery.data ?? []).filter((meal) => messIds.includes(meal.mess_id))
  const counts = countsQuery.data ?? {}

  const totals = todayMeals.reduce(
    (acc, meal) => {
      const mealStats = getMealCounts(meal, counts[meal.mess_id] ?? 0)
      return {
        optedIn: acc.optedIn + mealStats.optedIn,
        optedOut: acc.optedOut + mealStats.optedOut,
        scanned: acc.scanned + mealStats.scanned,
        pending: acc.pending + mealStats.pending,
      }
    },
    { optedIn: 0, optedOut: 0, scanned: 0, pending: 0 },
  )

  const upcoming = (upcomingQuery.data ?? [])
    .filter((meal) => meal.meal_date > todayIST())
    .slice(0, 3)

  const loading = todayQuery.isLoading || countsQuery.isLoading
  const error = todayQuery.isError || countsQuery.isError

  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Mess operations"
        title="Today at the mess"
        description={
          me?.staff_messes.length
            ? me.staff_messes.map((mess) => mess.name).join(' · ')
            : 'No mess assigned yet'
        }
        action={
          <Button asChild size="icon" className="shrink-0 rounded-2xl">
            <Link to="/staff/scanner" aria-label="Open scanner">
              <QrCode className="size-5" />
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard icon={UtensilsCrossed} label="Meals today" value={todayMeals.length} tone="primary" />
        <StatCard icon={CheckCircle2} label="Opted in" value={totals.optedIn} tone="success" />
        <StatCard icon={ScanLine} label="Scanned" value={totals.scanned} hint={`${totals.pending} pending`} tone="default" />
        <StatCard icon={UsersRound} label="Opted out" value={totals.optedOut} tone="warning" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Link
          to="/staff/scanner"
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/70 bg-card py-3 text-center shadow-card"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ScanLine className="size-4" />
          </span>
          <span className="text-[10px] font-semibold">Scan pass</span>
        </Link>
        <Link
          to="/staff/menu"
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/70 bg-card py-3 text-center shadow-card"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <CalendarDays className="size-4" />
          </span>
          <span className="text-[10px] font-semibold">Weekly menu</span>
        </Link>
        <Link
          to="/staff/students"
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/70 bg-card py-3 text-center shadow-card"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
            <UsersRound className="size-4" />
          </span>
          <span className="text-[10px] font-semibold">Students</span>
        </Link>
      </div>

      {loading && <LoadingList rows={2} />}
      {error && (
        <ErrorState
          title="Dashboard could not load"
          message="We couldn't fetch today's mess activity."
          onRetry={() => {
            todayQuery.refetch()
            countsQuery.refetch()
          }}
        />
      )}

      {!loading && !error && (
        <>
          <section>
            <SectionHeader
              title="Today's service"
              description="Live opt-in and scan counts"
              action={
                <Link to="/staff/meals" className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                  All meals <ArrowRight className="size-3" />
                </Link>
              }
            />
            {todayMeals.length === 0 ? (
              <div className="rounded-2xl border border-border/70 bg-card shadow-card">
                <EmptyState
                  icon={CalendarClock}
                  title="No meals today"
                  description="Create today's meals or check the upcoming schedule."
                  action={
                    <Button asChild size="sm">
                      <Link to="/staff/menu">
                        <CalendarDays className="size-3.5" /> Weekly menu
                      </Link>
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayMeals.map((meal) => (
                  <TodayMealCard
                    key={meal.id}
                    meal={meal}
                    totalStudents={counts[meal.mess_id] ?? 0}
                  />
                ))}
              </div>
            )}
          </section>

          {upcoming.length > 0 && (
            <section>
              <SectionHeader title="Next up" description="Upcoming published meals" />
              <div className="space-y-2">
                {upcoming.map((meal) => (
                  <Link
                    key={meal.id}
                    to={`/staff/meals/${meal.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-card"
                  >
                    <MealIcon category={meal.category} className="size-9 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{meal.title}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {relativeDayLabel(meal.meal_date)} · {formatMealDate(meal.meal_date, 'd MMM')} ·{' '}
                        {formatTimeRange(meal.start_time, meal.end_time)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-medium text-muted-foreground">
                        {isCutoffPassed(meal.booking_cutoff_at) ? 'Locked' : cutoffLabel(meal.booking_cutoff_at)}
                      </p>
                      <p className="mt-0.5 text-[9px] text-muted-foreground">
                        {meal.meal_bookings.filter((booking) => booking.status === 'opted_in').length} in
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="flex items-center gap-2.5 rounded-2xl bg-muted/70 p-3 text-[11px] leading-relaxed text-muted-foreground">
            <Timer className="size-4 shrink-0 text-secondary" />
            Bookings lock automatically at the cutoff. Keep the scanner open during service for the
            fastest check-in flow.
          </div>
        </>
      )}
    </div>
  )
}
