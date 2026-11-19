import { Check, MapPin, QrCode, TimerOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { MealForStudent } from '@/types/app'
import {
  CATEGORY_META,
  cn,
  formatMealDate,
  formatTimeRange,
  isCutoffPassed,
  isMealPast,
  relativeDayLabel,
} from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge'
import { MealIcon } from '@/components/meals/meal-icon'
import { CutoffLabel } from '@/components/meals/cutoff'
import { useSetBookingStatus } from '@/hooks/use-meals'

export function MealCard({ meal, compact = false }: { meal: MealForStudent; compact?: boolean }) {
  const booking = meal.meal_bookings[0]
  const mutation = useSetBookingStatus()
  const closed = isCutoffPassed(meal.booking_cutoff_at) || isMealPast(meal)
  const consumed = Boolean(booking?.consumed_at)
  const optedIn = booking?.status === 'opted_in'
  const pending = mutation.isPending

  const changeStatus = (status: 'opted_in' | 'opted_out') => {
    if (booking?.status === status) return
    mutation.mutate({ mealId: meal.id, status })
  }

  return (
    <article
      className={cn(
        'rounded-2xl border border-border/70 bg-card shadow-card transition-opacity',
        closed && 'opacity-[0.88]',
        compact ? 'p-4' : 'p-5',
      )}
    >
      <div className="flex items-start gap-3">
        <MealIcon category={meal.category} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-display text-[15px] font-semibold leading-tight">{meal.title}</p>
              <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                {relativeDayLabel(meal.meal_date)} · {formatMealDate(meal.meal_date)} ·{' '}
                {formatTimeRange(meal.start_time, meal.end_time)}
              </p>
            </div>
            <BookingStatusBadge status={booking?.status} consumed={consumed} />
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" />
              {meal.mess?.name ?? 'Your mess'}
            </span>
            <span className="text-border">·</span>
            <span className={cn(CATEGORY_META[meal.category].tone, 'rounded-full px-2 py-0.5 font-semibold')}>
              {CATEGORY_META[meal.category].label}
            </span>
          </div>

          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {meal.menu_items.length > 0
              ? meal.menu_items.map((item) => item.name).join(' · ')
              : 'Menu will be updated soon'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
        <div className="min-w-0">
          {closed ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <TimerOff className="size-3" />
              Booking closed
            </span>
          ) : (
            <CutoffLabel cutoffAt={meal.booking_cutoff_at} />
          )}
          {consumed && (
            <span className="mt-0.5 flex items-center gap-1 text-[11px] text-success">
              <Check className="size-3" />
              Marked at the counter
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {optedIn && booking && !consumed && (
            <Button asChild size="sm" variant="soft" className="h-8 px-2.5">
              <Link to={`/student/pass/${booking.id}`}>
                <QrCode className="size-3.5" />
                Pass
              </Link>
            </Button>
          )}
          <div className="flex rounded-lg bg-muted p-0.5">
            <button
              type="button"
              disabled={closed || pending || consumed}
              onClick={() => changeStatus('opted_in')}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50',
                optedIn ? 'bg-card text-success shadow-sm' : 'text-muted-foreground',
              )}
            >
              Opt in
            </button>
            <button
              type="button"
              disabled={closed || pending || consumed}
              onClick={() => changeStatus('opted_out')}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50',
                booking?.status === 'opted_out'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground',
              )}
            >
              Opt out
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
