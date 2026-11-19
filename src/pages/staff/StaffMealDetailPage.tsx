import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Pencil,
  ScanLine,
  TimerOff,
  Trash2,
  UsersRound,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react'
import { useDeleteMeal, useStaffMeal } from '@/hooks/use-staff'
import {
  formatDateTime,
  formatMealDate,
  formatTimeRange,
  initials,
  isCutoffPassed,
  isMealPast,
  relativeDayLabel,
} from '@/lib/utils'
import { getMealCounts } from '@/lib/participation'
import type { ParticipationBooking } from '@/types/app'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState, LoadingList } from '@/components/common/error-state'
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge'
import { MealIcon } from '@/components/meals/meal-icon'

type ListKind = 'in' | 'out' | 'scanned' | 'pending'

function StudentRow({ booking }: { booking: ParticipationBooking }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
      <Avatar className="size-9">
        <AvatarFallback className="text-xs">{initials(booking.student.profile.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">{booking.student.profile.name}</p>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
          {booking.student.roll_number} · {booking.student.profile.email}
        </p>
        {booking.consumed_at && (
          <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-success">
            <CheckCircle2 className="size-3" />
            Scanned {formatDateTime(booking.consumed_at)}
          </p>
        )}
      </div>
      <BookingStatusBadge status={booking.status} consumed={Boolean(booking.consumed_at)} />
    </div>
  )
}

function StudentList({
  bookings,
  emptyTitle,
  emptyDescription,
}: {
  bookings: ParticipationBooking[]
  emptyTitle: string
  emptyDescription: string
}) {
  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={UsersRound}
        title={emptyTitle}
        description={emptyDescription}
        className="py-8"
      />
    )
  }
  return (
    <div className="space-y-2">
      {bookings.map((booking) => (
        <StudentRow key={booking.id} booking={booking} />
      ))}
    </div>
  )
}

export function StaffMealDetailPage() {
  const { mealId } = useParams<{ mealId: string }>()
  const navigate = useNavigate()
  const query = useStaffMeal(mealId)
  const deleteMutation = useDeleteMeal()
  const [tab, setTab] = useState<ListKind>('in')

  const meal = query.data
  const counts = useMemo(() => getMealCounts(meal ?? { meal_bookings: [] }, 0), [meal])

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <LoadingList rows={3} />
      </div>
    )
  }

  if (query.isError || !meal) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <ErrorState
          title="Meal not found"
          message="This meal may belong to another mess or no longer exists."
          onRetry={() => query.refetch()}
        />
      </div>
    )
  }

  const booked = meal.meal_bookings
  const lists: Record<ListKind, ParticipationBooking[]> = {
    in: booked.filter((booking) => booking.status === 'opted_in'),
    out: booked.filter((booking) => booking.status === 'opted_out'),
    scanned: booked.filter((booking) => booking.consumed_at),
    pending: booked.filter((booking) => booking.status === 'opted_in' && !booking.consumed_at),
  }

  const past = isMealPast(meal)
  const closed = isCutoffPassed(meal.booking_cutoff_at)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div className="flex items-center gap-1.5">
          <Button asChild size="sm" variant="outline">
            <Link to={`/staff/meals/${meal.id}/edit`}>
              <Pencil className="size-3.5" />
              Edit
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to={`/staff/scanner?meal=${meal.id}`}>
              <ScanLine className="size-3.5" />
              Scan
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-card">
        <div className="flex items-start gap-3">
          <MealIcon category={meal.category} className="size-12 rounded-2xl" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-display text-lg font-semibold leading-tight">{meal.title}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {relativeDayLabel(meal.meal_date)} · {formatMealDate(meal.meal_date)} ·{' '}
                  {formatTimeRange(meal.start_time, meal.end_time)}
                </p>
              </div>
              <Badge variant={past ? 'muted' : closed ? 'warning' : 'success'}>
                {past ? 'Served' : closed ? 'Locked' : 'Open'}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="outline">{meal.mess?.name}</Badge>
              <Badge variant="muted" className="capitalize">
                {meal.category}
              </Badge>
              <Badge variant={closed ? 'muted' : 'default'}>
                {closed ? 'Booking closed' : 'Bookings open'}
              </Badge>
            </div>
          </div>
        </div>
        {meal.description && (
          <p className="mt-3 border-t border-border/60 pt-3 text-xs leading-relaxed text-muted-foreground">
            {meal.description}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold">Participation</p>
          <span className="text-[10px] text-muted-foreground">{counts.total} students in mess</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          <div className="rounded-xl bg-muted/70 py-2 text-center">
            <p className="text-lg font-semibold tabular">{counts.optedIn}</p>
            <p className="text-[9px] text-muted-foreground">Opted in</p>
          </div>
          <div className="rounded-xl bg-muted/70 py-2 text-center">
            <p className="text-lg font-semibold tabular">{counts.optedOut}</p>
            <p className="text-[9px] text-muted-foreground">Opted out</p>
          </div>
          <div className="rounded-xl bg-success-soft py-2 text-center text-success">
            <p className="text-lg font-semibold tabular">{counts.scanned}</p>
            <p className="text-[9px]">Scanned</p>
          </div>
          <div className="rounded-xl bg-warning-soft py-2 text-center text-warning">
            <p className="text-lg font-semibold tabular">{counts.pending}</p>
            <p className="text-[9px]">Pending</p>
          </div>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Service progress</span>
            <span className="tabular">{counts.rate}%</span>
          </div>
          <Progress value={counts.rate} indicatorClassName="bg-success" />
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold">Menu</p>
          <span className="text-[10px] text-muted-foreground">{meal.menu_items.length} items</span>
        </div>
        {meal.menu_items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No menu items added yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {meal.menu_items
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((item) => (
                <span
                  key={item.id}
                  className="rounded-full border border-border/70 bg-muted/60 px-2.5 py-1 text-[11px] font-medium"
                >
                  {item.name}
                </span>
              ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <UtensilsCrossed className="size-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Student lists</p>
        </div>
        <Tabs value={tab} onValueChange={(value) => setTab(value as ListKind)}>
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="in">In ({counts.optedIn})</TabsTrigger>
            <TabsTrigger value="out">Out ({counts.optedOut})</TabsTrigger>
            <TabsTrigger value="scanned">Scanned ({counts.scanned})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          </TabsList>
          <TabsContent value="in">
            <StudentList
              bookings={lists.in}
              emptyTitle="No one opted in"
              emptyDescription="Students have either opted out or are not assigned to this mess."
            />
          </TabsContent>
          <TabsContent value="out">
            <StudentList
              bookings={lists.out}
              emptyTitle="No opt-outs"
              emptyDescription="Everyone with a booking is currently opted in."
            />
          </TabsContent>
          <TabsContent value="scanned">
            <StudentList
              bookings={lists.scanned}
              emptyTitle="No scans yet"
              emptyDescription="Scanned meal passes will appear here during service."
            />
          </TabsContent>
          <TabsContent value="pending">
            <StudentList
              bookings={lists.pending}
              emptyTitle="No pending students"
              emptyDescription="Every opted-in student has been scanned."
            />
          </TabsContent>
        </Tabs>
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-2 rounded-2xl bg-muted/60 p-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          {closed ? <TimerOff className="size-3.5" /> : <Clock3 className="size-3.5" />}
          {closed ? 'Booking changes locked' : 'Students can still change bookings'}
        </span>
        <span className="tabular">
          {meal.meal_bookings.filter((booking) => booking.status === 'opted_out').length} opted out
        </span>
      </div>

      {!past && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full text-destructive">
              <Trash2 className="size-3.5" />
              Delete this meal
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this meal?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the meal, its menus, bookings and events. Past meals cannot
                be deleted. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  deleteMutation.mutate(meal.id, {
                    onSuccess: () => navigate('/staff/meals'),
                  })
                }
              >
                Delete meal
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {lists.pending.length === 0 && counts.optedIn > 0 && (
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-success">
          <CheckCircle2 className="size-3.5" />
          Everyone opted in has been served
        </div>
      )}
      {counts.optedOut > 0 && (
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          <XCircle className="size-3.5" />
          Opted-out bookings are not valid for scanning
        </div>
      )}
    </div>
  )
}
