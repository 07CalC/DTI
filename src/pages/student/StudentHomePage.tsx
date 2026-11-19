import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  Clock3,
  MapPin,
  QrCode,
  Sparkles,
  TimerOff,
  UtensilsCrossed,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth'
import { useSetBookingStatus, useUpcomingMeals } from '@/hooks/use-meals'
import {
  CATEGORY_META,
  formatMealDate,
  formatTimeRange,
  greeting,
  isCutoffPassed,
  isMealPast,
  relativeDayLabel,
} from '@/lib/utils'
import type { MealForStudent } from '@/types/app'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState, LoadingList } from '@/components/common/error-state'
import { SectionHeader } from '@/components/common/section-header'
import { Countdown } from '@/components/meals/cutoff'
import { MealIcon } from '@/components/meals/meal-icon'
import { MealCard } from '@/components/meals/MealCard'

function NextMealHero({ meal }: { meal: MealForStudent }) {
  const booking = meal.meal_bookings[0]
  const mutation = useSetBookingStatus()
  const closed = isCutoffPassed(meal.booking_cutoff_at) || isMealPast(meal)
  const consumed = Boolean(booking?.consumed_at)
  const optedIn = booking?.status === 'opted_in'

  const change = (status: 'opted_in' | 'opted_out') => {
    if (booking?.status === status) return
    mutation.mutate({ mealId: meal.id, status })
  }

  return (
    <div className="relative overflow-hidden rounded-[1.6rem] bg-secondary p-5 text-secondary-foreground shadow-float">
      <div className="pointer-events-none absolute -right-12 -top-14 size-44 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 size-44 rounded-full bg-primary/30 blur-2xl" />

      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">
            <Sparkles className="size-3" />
            Up next
          </span>
          <span className="rounded-full bg-white/12 px-2.5 py-1 text-[10px] font-semibold text-white/85">
            {CATEGORY_META[meal.category].label}
          </span>
        </div>

        <div className="mt-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-[1.55rem] font-semibold leading-tight tracking-tight">
              {meal.title}
            </h2>
            <p className="mt-1.5 text-xs font-medium text-white/70">
              {relativeDayLabel(meal.meal_date)} · {formatMealDate(meal.meal_date)} ·{' '}
              {formatTimeRange(meal.start_time, meal.end_time)}
            </p>
            <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-white/65">
              <MapPin className="size-3" />
              {meal.mess?.name ?? 'Your mess'}
            </p>
          </div>
          <MealIcon category={meal.category} tone={false} className="size-12 rounded-2xl" />
        </div>

        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-white/70">
          {meal.menu_items.length > 0
            ? meal.menu_items.map((item) => item.name).join(' · ')
            : 'Menu will be updated soon'}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-black/15 p-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/55">
              {closed ? 'Booking window' : 'Booking closes in'}
            </p>
            {closed ? (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-white/80">
                <TimerOff className="size-3.5" />
                Closed for changes
              </p>
            ) : (
              <Countdown cutoffAt={meal.booking_cutoff_at} className="mt-0.5 block text-xl font-semibold" />
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/55">Your status</p>
            <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold">
              {consumed ? (
                <>
                  <Check className="size-3.5 text-emerald-300" /> Scanned
                </>
              ) : optedIn ? (
                <>
                  <Check className="size-3.5 text-emerald-300" /> You&apos;re in
                </>
              ) : (
                'Opted out'
              )}
            </p>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          {optedIn && booking && (
            <Button
              asChild
              variant="secondary"
              className="h-10 flex-1 bg-white text-ink hover:bg-white/90"
            >
              <Link to={`/student/pass/${booking.id}`}>
                <QrCode className="size-4" />
                {consumed ? 'View pass' : 'Open meal pass'}
              </Link>
            </Button>
          )}
          {!consumed && (
            <div className="flex flex-1 rounded-xl bg-white/10 p-1">
              <button
                type="button"
                disabled={closed || mutation.isPending}
                onClick={() => change('opted_in')}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
                  optedIn ? 'bg-white text-secondary shadow-sm' : 'text-white/75'
                }`}
              >
                Opt in
              </button>
              <button
                type="button"
                disabled={closed || mutation.isPending}
                onClick={() => change('opted_out')}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
                  booking?.status === 'opted_out' ? 'bg-white text-secondary shadow-sm' : 'text-white/75'
                }`}
              >
                Opt out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DateGroup({ date, meals }: { date: string; meals: MealForStudent[] }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-0.5">
        <h3 className="text-xs font-semibold text-foreground">{relativeDayLabel(date)}</h3>
        <span className="text-[11px] text-muted-foreground">{formatMealDate(date, 'd MMM')}</span>
        <div className="h-px flex-1 bg-border/70" />
        <span className="text-[10px] font-medium text-muted-foreground">{meals.length} meals</span>
      </div>
      <div className="space-y-2.5">
        {meals.map((meal) => (
          <MealCard key={meal.id} meal={meal} compact />
        ))}
      </div>
    </section>
  )
}

export function StudentHomePage() {
  const { me } = useAuth()
  const query = useUpcomingMeals()

  const meals = query.data ?? []
  const nextMeal = meals.find((meal) => !isMealPast(meal))
  const remaining = meals.filter((meal) => meal.id !== nextMeal?.id)

  const grouped = remaining.reduce<Record<string, MealForStudent[]>>((groups, meal) => {
    groups[meal.meal_date] ??= []
    groups[meal.meal_date].push(meal)
    return groups
  }, {})

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            {greeting()}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
            {me?.profile.name.split(' ')[0] ?? 'Student'}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {me?.student?.mess.name} · {me?.student?.roll_number}
          </p>
        </div>
        <Badge variant="outline" className="mt-1 bg-card">
          <UtensilsCrossed />
          {me?.student?.default_booking_preference === 'opted_in' ? 'Opt in by default' : 'Opt out by default'}
        </Badge>
      </div>

      {query.isLoading && (
        <>
          <div className="h-72 animate-pulse rounded-[1.6rem] bg-muted" />
          <LoadingList rows={2} />
        </>
      )}

      {query.isError && (
        <ErrorState
          title="Meals could not load"
          message="We couldn't reach your mess menu. Please try again."
          onRetry={() => query.refetch()}
        />
      )}

      {!query.isLoading && !query.isError && (
        <>
          {nextMeal ? (
            <NextMealHero meal={nextMeal} />
          ) : (
            <div className="rounded-2xl border border-border/70 bg-card shadow-card">
              <EmptyState
                icon={UtensilsCrossed}
                title="No meals scheduled"
                description="Your mess hasn't published upcoming meals yet. Check back soon."
              />
            </div>
          )}

          {Object.keys(grouped).length > 0 && (
            <section className="space-y-4">
              <SectionHeader
                title="Coming up"
                description="Menus are live from your assigned mess"
                action={
                  <Link
                    to="/student/meals"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary"
                  >
                    My meals
                    <ArrowRight className="size-3" />
                  </Link>
                }
              />
              {Object.entries(grouped)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, dateMeals]) => (
                  <DateGroup key={date} date={date} meals={dateMeals} />
                ))}
            </section>
          )}

          <Link
            to="/student/history"
            className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-card transition-colors hover:bg-muted/40"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Clock3 className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Meal history</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                See what you ate, opted out of, and scanned.
              </p>
            </div>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
        </>
      )}
    </div>
  )
}
