import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Pencil,
  Plus,
  ScanLine,
  UtensilsCrossed,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth'
import { useMessStudentCounts, useStaffMeals } from '@/hooks/use-staff'
import type { StaffMealListItem } from '@/services/staff'
import { getMealCounts } from '@/lib/participation'
import {
  cn,
  cutoffLabel,
  formatMealDate,
  formatTimeRange,
  isCutoffPassed,
  relativeDayLabel,
} from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState, LoadingList } from '@/components/common/error-state'
import { PageIntro } from '@/components/common/section-header'
import { MealIcon } from '@/components/meals/meal-icon'
import type { ReactNode } from 'react'

function MealRow({ meal, totalStudents }: { meal: StaffMealListItem; totalStudents: number }) {
  const counts = getMealCounts(meal, totalStudents)
  const closed = isCutoffPassed(meal.booking_cutoff_at)

  return (
    <article className="rounded-2xl border border-border/70 bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        <MealIcon category={meal.category} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold">{meal.title}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {relativeDayLabel(meal.meal_date)} · {formatMealDate(meal.meal_date, 'd MMM')} ·{' '}
                {formatTimeRange(meal.start_time, meal.end_time)}
              </p>
            </div>
            <Badge variant={closed ? 'muted' : 'success'}>
              {closed ? 'Closed' : 'Open'}
            </Badge>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
            <span className="font-semibold text-foreground">{meal.mess?.name}</span>
            <span>·</span>
            <span>{counts.optedIn} in</span>
            <span>{counts.optedOut} out</span>
            <span>{counts.scanned} scanned</span>
          </div>

          <p className="mt-2 line-clamp-1 text-[11px] text-muted-foreground">
            {meal.menu_items.map((item) => item.name).join(' · ') || 'No menu added'}
          </p>

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock3 className="size-3" />
              {closed ? `Cutoff was ${formatMealDate(meal.meal_date, 'd MMM')}` : cutoffLabel(meal.booking_cutoff_at)}
            </span>
            <div className="flex gap-1">
              <Button asChild size="sm" variant="outline" className="h-8 px-2.5">
                <Link to={`/staff/meals/${meal.id}`}>View</Link>
              </Button>
              <Button asChild size="sm" variant="soft" className="h-8 px-2.5">
                <Link to={`/staff/meals/${meal.id}/edit`}>
                  <Pencil className="size-3.5" />
                  Edit
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

function MealList({
  meals,
  counts,
  loading,
  error,
  onRetry,
  empty,
}: {
  meals: StaffMealListItem[]
  counts: Record<string, number>
  loading: boolean
  error: boolean
  onRetry: () => void
  empty: ReactNode
}) {
  if (loading) return <LoadingList rows={4} />
  if (error) return <ErrorState title="Meals could not load" onRetry={onRetry} />
  if (meals.length === 0) return <>{empty}</>

  return (
    <div className="space-y-2.5">
      {meals.map((meal) => (
        <MealRow key={meal.id} meal={meal} totalStudents={counts[meal.mess_id] ?? 0} />
      ))}
    </div>
  )
}

function filterMeals(meals: StaffMealListItem[], messFilter: string) {
  return messFilter === 'all' ? meals : meals.filter((meal) => meal.mess_id === messFilter)
}

export function StaffMealsPage() {
  const { me } = useAuth()
  const [tab, setTab] = useState('upcoming')
  const [messFilter, setMessFilter] = useState('all')
  const upcomingQuery = useStaffMeals('upcoming')
  const pastQuery = useStaffMeals('past')
  const countsQuery = useMessStudentCounts()
  const counts = countsQuery.data ?? {}

  const upcoming = useMemo(
    () => filterMeals(upcomingQuery.data ?? [], messFilter),
    [upcomingQuery.data, messFilter],
  )
  const past = useMemo(
    () => filterMeals(pastQuery.data ?? [], messFilter),
    [pastQuery.data, messFilter],
  )

  const upcomingGroups = upcoming.reduce<Record<string, StaffMealListItem[]>>((groups, meal) => {
    groups[meal.meal_date] ??= []
    groups[meal.meal_date].push(meal)
    return groups
  }, {})

  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Mess operations"
        title="Meals"
        description="Publish menus, tune timings, and review past service."
        action={
          <Button asChild size="icon" className="shrink-0 rounded-2xl">
            <Link to="/staff/meals/new" aria-label="Create meal">
              <Plus className="size-5" />
            </Link>
          </Button>
        }
      />

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
              All messes
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
                {mess.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="upcoming">
            <CalendarDays className="size-3.5" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="past">
            <Clock3 className="size-3.5" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          <MealList
            meals={upcoming}
            counts={counts}
            loading={upcomingQuery.isLoading || countsQuery.isLoading}
            error={upcomingQuery.isError}
            onRetry={() => upcomingQuery.refetch()}
            empty={
              <div className="rounded-2xl border border-border/70 bg-card shadow-card">
                <EmptyState
                  icon={CalendarDays}
                  title="No upcoming meals"
                  description="Publish your next meal and student bookings will be generated automatically."
                  action={
                    <Button asChild size="sm">
                      <Link to="/staff/meals/new">
                        <Plus className="size-3.5" /> Create meal
                      </Link>
                    </Button>
                  }
                />
              </div>
            }
          />
          {upcoming.length > 0 && (
            <p className="text-center text-[10px] text-muted-foreground">
              {upcoming.length} meals across {Object.keys(upcomingGroups).length} days
            </p>
          )}
        </TabsContent>

        <TabsContent value="past">
          <MealList
            meals={past}
            counts={counts}
            loading={pastQuery.isLoading || countsQuery.isLoading}
            error={pastQuery.isError}
            onRetry={() => pastQuery.refetch()}
            empty={
              <div className="rounded-2xl border border-border/70 bg-card shadow-card">
                <EmptyState
                  icon={UtensilsCrossed}
                  title="No past meals yet"
                  description="Historical meals and their participation remain available here."
                />
              </div>
            }
          />
        </TabsContent>
      </Tabs>

      <Link
        to="/staff/scanner"
        className="flex items-center gap-3 rounded-2xl bg-secondary p-4 text-secondary-foreground shadow-card"
      >
        <div className="flex size-10 items-center justify-center rounded-xl bg-white/10">
          <ScanLine className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Open the meal scanner</p>
          <p className="mt-0.5 text-[11px] text-white/65">Verify meal passes at the counter.</p>
        </div>
        <ChevronRight className="size-4 text-white/60" />
      </Link>
    </div>
  )
}
