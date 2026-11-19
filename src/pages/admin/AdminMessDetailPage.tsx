import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  Mail,
  Pencil,
  Store,
  Trash2,
  UsersRound,
  UtensilsCrossed,
} from 'lucide-react'
import { useDeleteMess, useMessDetail } from '@/hooks/use-admin'
import {
  CATEGORY_META,
  formatDateTime,
  formatMealDate,
  formatTimeRange,
  initials,
  pluralize,
  relativeDayLabel,
} from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState, LoadingList } from '@/components/common/error-state'
import { StatCard } from '@/components/common/stat-card'
import { MessFormDialog } from '@/components/admin/mess-form-dialog'

export function AdminMessDetailPage() {
  const { messId } = useParams<{ messId: string }>()
  const navigate = useNavigate()
  const query = useMessDetail(messId)
  const deleteMutation = useDeleteMess()
  const [editOpen, setEditOpen] = useState(false)

  const mess = query.data

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
        <LoadingList rows={3} />
      </div>
    )
  }

  if (query.isError || !mess) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate('/admin/messes')}>
          <ArrowLeft className="size-4" />
          Back to messes
        </Button>
        <ErrorState
          title="Mess not found"
          message="It may have been removed, or you may not have access."
          onRetry={() => query.refetch()}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate('/admin/messes')}>
          <ArrowLeft className="size-4" />
          Messes
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="size-3.5" />
          Edit
        </Button>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-card">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Store className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="font-display text-xl font-semibold leading-tight">{mess.name}</h1>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Created {formatDateTime(mess.created_at, 'd MMM yyyy')}
                </p>
              </div>
              <Badge variant={mess.is_active ? 'success' : 'muted'}>
                {mess.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {mess.description && (
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{mess.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard icon={UsersRound} label="Students" value={mess.students.length} tone="primary" />
        <StatCard icon={UtensilsCrossed} label="Staff" value={mess.staff.length} tone="default" />
        <StatCard icon={CalendarDays} label="Upcoming meals" value={mess.meals.length} tone="success" />
      </div>

      <Tabs defaultValue="students">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="students">Students ({mess.students.length})</TabsTrigger>
          <TabsTrigger value="staff">Staff ({mess.staff.length})</TabsTrigger>
          <TabsTrigger value="meals">Meals ({mess.meals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-2">
          {mess.students.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="No students"
              description="Assign students to this mess from the Students section."
              className="rounded-2xl border border-border/70 bg-card py-8 shadow-card"
            />
          ) : (
            mess.students.map((student) => (
              <div
                key={student.id}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3"
              >
                <Avatar className="size-9">
                  <AvatarFallback className="text-xs">{initials(student.profile.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-xs font-semibold">{student.profile.name}</p>
                    {!student.profile.is_active && <Badge variant="destructive">Inactive</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {student.roll_number} · {student.profile.email}
                  </p>
                </div>
                <Badge variant={student.default_booking_preference === 'opted_in' ? 'success' : 'outline'}>
                  {student.default_booking_preference === 'opted_in' ? 'Opt in' : 'Opt out'}
                </Badge>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="staff" className="space-y-2">
          {mess.staff.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="No staff assigned"
              description="Assign staff members to operate this mess's meals and scanner."
              className="rounded-2xl border border-border/70 bg-card py-8 shadow-card"
            />
          ) : (
            mess.staff.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3"
              >
                <Avatar className="size-9">
                  <AvatarFallback className="text-xs">{initials(member.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{member.name}</p>
                  <p className="mt-0.5 inline-flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                    <Mail className="size-2.5" />
                    {member.email}
                  </p>
                </div>
                <Badge variant={member.is_active ? 'success' : 'destructive'}>
                  {member.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="meals" className="space-y-2">
          {mess.meals.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title="No upcoming meals"
              description="Staff publish meals for this mess. They will appear here."
              className="rounded-2xl border border-border/70 bg-card py-8 shadow-card"
            />
          ) : (
            mess.meals.map((meal) => (
              <div key={meal.id} className="rounded-xl border border-border/60 bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{meal.title}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {relativeDayLabel(meal.meal_date)} · {formatMealDate(meal.meal_date)} ·{' '}
                      {formatTimeRange(meal.start_time, meal.end_time)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${CATEGORY_META[meal.category].tone}`}
                  >
                    {CATEGORY_META[meal.category].label}
                  </span>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Link
        to="/admin/students"
        className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-card"
      >
        <div className="flex size-9 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
          <UsersRound className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">Manage students campus-wide</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {pluralize(mess.students.length, 'student')} currently assigned to {mess.name}.
          </p>
        </div>
      </Link>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full text-destructive">
            <Trash2 className="size-3.5" />
            Delete mess
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {mess.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              A mess can only be deleted when no students, staff or meals reference it. If it is in
              use, deactivate it instead — history stays intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteMutation.mutate(mess.id, {
                  onSuccess: () => navigate('/admin/messes', { replace: true }),
                })
              }
            >
              Delete mess
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MessFormDialog open={editOpen} onOpenChange={setEditOpen} mess={mess} />
    </div>
  )
}
