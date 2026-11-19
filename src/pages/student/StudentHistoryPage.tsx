import { useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  History as HistoryIcon,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react'
import { useStudentHistory, HISTORY_PAGE_SIZE } from '@/hooks/use-meals'
import type { HistoryFilter } from '@/services/meals'
import { cn, formatDateTime, formatMealDate, formatTimeRange, pluralize } from '@/lib/utils'
import type { BookingHistoryItem } from '@/types/app'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState, LoadingList } from '@/components/common/error-state'
import { PageIntro } from '@/components/common/section-header'
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge'
import { MealIcon } from '@/components/meals/meal-icon'

const FILTERS: { value: HistoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'opted_in', label: 'Opted in' },
  { value: 'opted_out', label: 'Opted out' },
  { value: 'consumed', label: 'Consumed' },
  { value: 'not_consumed', label: 'Not consumed' },
]

function eventAt(item: BookingHistoryItem, status: 'opted_in' | 'opted_out') {
  return [...item.booking_events].reverse().find((event) => event.new_status === status)?.created_at
}

function HistoryCard({ item }: { item: BookingHistoryItem }) {
  const optedInAt = eventAt(item, 'opted_in')
  const optedOutAt = eventAt(item, 'opted_out')

  return (
    <article className="rounded-2xl border border-border/70 bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        <MealIcon category={item.meal.category} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display text-sm font-semibold leading-tight">{item.meal.title}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatMealDate(item.meal.meal_date, 'EEE, d MMM')} ·{' '}
                {formatTimeRange(item.meal.start_time, item.meal.end_time)}
              </p>
            </div>
            <BookingStatusBadge status={item.status} consumed={Boolean(item.consumed_at)} />
          </div>

          <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
            {item.meal.menu_items.map((menuItem) => menuItem.name).join(' · ') || 'Menu not recorded'}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.consumed_at ? (
              <Badge variant="success">
                <CheckCircle2 />
                Consumed {formatDateTime(item.consumed_at)}
              </Badge>
            ) : (
              <Badge variant="outline">
                <XCircle />
                {item.status === 'opted_out' ? 'Not attending' : 'Not scanned'}
              </Badge>
            )}
            <Badge variant="muted">{item.meal.mess?.name ?? 'Mess'}</Badge>
          </div>

          <div className="mt-3 grid gap-1 rounded-xl bg-muted/60 p-2.5 text-[10px] leading-relaxed text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">Opt-in:</span>{' '}
              {optedInAt ? formatDateTime(optedInAt) : '—'}
            </p>
            <p>
              <span className="font-semibold text-foreground">Opt-out:</span>{' '}
              {optedOutAt ? formatDateTime(optedOutAt) : '—'}
            </p>
            <p>
              <span className="font-semibold text-foreground">Booked as:</span>{' '}
              {item.initial_status === 'opted_in' ? 'Opted in by default' : 'Opted out by default'}
            </p>
          </div>
        </div>
      </div>
    </article>
  )
}

export function StudentHistoryPage() {
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const [page, setPage] = useState(0)
  const query = useStudentHistory(filter, page)

  const changeFilter = (next: HistoryFilter) => {
    setFilter(next)
    setPage(0)
  }

  const count = query.data?.count ?? 0
  const items = query.data?.items ?? []
  const totalPages = Math.max(1, Math.ceil(count / HISTORY_PAGE_SIZE))

  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Your record"
        title="Meal history"
        description="Every booking transition is kept for transparency and mess rebate calculations."
      />

      <div className="-mx-4 overflow-x-auto px-4 no-scrollbar">
        <div className="flex w-max gap-1.5">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => changeFilter(option.value)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors',
                filter === option.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {!query.isLoading && !query.isError && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{pluralize(count, 'meal')} found</span>
          <span>
            Page {page + 1} of {totalPages}
          </span>
        </div>
      )}

      {query.isLoading && <LoadingList rows={4} />}
      {query.isError && (
        <ErrorState
          title="History could not load"
          message="Please try again in a moment."
          onRetry={() => query.refetch()}
        />
      )}

      {!query.isLoading && !query.isError && items.length === 0 && (
        <div className="rounded-2xl border border-border/70 bg-card shadow-card">
          <EmptyState
            icon={filter === 'all' ? HistoryIcon : CalendarDays}
            title="Nothing here yet"
            description={
              filter === 'all'
                ? 'Past meals will show up here after your first mess day.'
                : 'No meals match this filter right now.'
            }
          />
        </div>
      )}

      <div className="space-y-2.5">
        {items.map((item) => (
          <HistoryCard key={item.id} item={item} />
        ))}
      </div>

      {items.length > 0 && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            <ChevronLeft className="size-3.5" />
            Newer
          </Button>
          <span className="text-[10px] text-muted-foreground">
            {page * HISTORY_PAGE_SIZE + 1}–{Math.min(count, (page + 1) * HISTORY_PAGE_SIZE)} of {count}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Older
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-2xl bg-muted/70 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <UtensilsCrossed className="mt-0.5 size-3.5 shrink-0" />
        Booking events use server time (UTC) and are displayed in Asia/Kolkata. Historical meals stay
        linked to the mess where they were served, even after a transfer.
      </div>
    </div>
  )
}
