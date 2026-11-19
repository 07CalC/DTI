import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, QrCode, ShieldCheck } from 'lucide-react'
import { useUpcomingMeals } from '@/hooks/use-meals'
import {
  formatMealDate,
  isMealPast,
  relativeDayLabel,
} from '@/lib/utils'
import type { MealForStudent } from '@/types/app'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState, LoadingList } from '@/components/common/error-state'
import { PageIntro } from '@/components/common/section-header'
import { SegmentedButtons } from '@/components/common/segmented-buttons'
import { MealCard } from '@/components/meals/MealCard'
import { Button } from '@/components/ui/button'

type MealFilter = 'all' | 'opted_in' | 'opted_out'

export function StudentMealsPage() {
  const query = useUpcomingMeals()
  const [filter, setFilter] = useState<MealFilter>('all')

  const meals = useMemo(
    () => (query.data ?? []).filter((meal) => !isMealPast(meal)),
    [query.data],
  )

  const optedIn = meals.filter((meal) => meal.meal_bookings[0]?.status === 'opted_in')
  const optedOut = meals.filter((meal) => meal.meal_bookings[0]?.status === 'opted_out')
  const nextPass = optedIn.find((meal) => !meal.meal_bookings[0]?.consumed_at)

  const filtered = filter === 'all' ? meals : filter === 'opted_in' ? optedIn : optedOut
  const grouped = filtered.reduce<Record<string, MealForStudent[]>>((groups, meal) => {
    groups[meal.meal_date] ??= []
    groups[meal.meal_date].push(meal)
    return groups
  }, {})

  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="This week"
        title="My meals"
        description="Your mess, your bookings, and every meal pass in one place."
      />

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Upcoming', value: meals.length },
          { label: 'Opted in', value: optedIn.length },
          { label: 'Opted out', value: optedOut.length },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border/70 bg-card p-3 text-center shadow-card">
            <p className="font-display text-xl font-semibold tabular">{stat.value}</p>
            <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {nextPass && (
        <div className="flex items-center gap-3 rounded-2xl bg-secondary p-4 text-secondary-foreground shadow-card">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/10">
            <QrCode className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Your next meal pass is ready</p>
            <p className="mt-0.5 truncate text-[11px] text-white/65">
              {nextPass.title} · {relativeDayLabel(nextPass.meal_date)}
            </p>
          </div>
          <Button asChild size="sm" variant="secondary" className="bg-white text-ink hover:bg-white/90">
            <Link to={`/student/pass/${nextPass.meal_bookings[0].id}`}>Open</Link>
          </Button>
        </div>
      )}

      <SegmentedButtons
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All meals' },
          { value: 'opted_in', label: 'Opted in' },
          { value: 'opted_out', label: 'Opted out' },
        ]}
      />

      {query.isLoading && <LoadingList rows={4} />}
      {query.isError && (
        <ErrorState
          title="Could not load meals"
          message="Please check your connection and try again."
          onRetry={() => query.refetch()}
        />
      )}

      {!query.isLoading && !query.isError && filtered.length === 0 && (
        <div className="rounded-2xl border border-border/70 bg-card shadow-card">
          <EmptyState
            icon={CalendarDays}
            title={filter === 'all' ? 'No upcoming meals' : `No ${filter === 'opted_in' ? 'opted-in' : 'opted-out'} meals`}
            description="When your mess publishes meals, they will appear here with their menus and cutoff times."
          />
        </div>
      )}

      {Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, dateMeals]) => (
          <section key={date}>
            <div className="mb-2 flex items-center gap-2 px-0.5">
              <h2 className="text-xs font-semibold">{relativeDayLabel(date)}</h2>
              <span className="text-[11px] text-muted-foreground">{formatMealDate(date, 'd MMM')}</span>
              <div className="h-px flex-1 bg-border/70" />
            </div>
            <div className="space-y-2.5">
              {dateMeals.map((meal) => (
                <MealCard key={meal.id} meal={meal} compact />
              ))}
            </div>
          </section>
        ))}

      <div className="flex items-start gap-2 rounded-2xl bg-muted/70 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-secondary" />
        Meal passes are single-use and checked at the counter. Screenshots work, but sharing a pass
        lets someone else consume your meal.
      </div>
    </div>
  )
}
