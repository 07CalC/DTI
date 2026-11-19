import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Plus, Store, UsersRound, UtensilsCrossed } from 'lucide-react'
import { useMesses } from '@/hooks/use-admin'
import { cn, formatDateTime, pluralize } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState, LoadingList } from '@/components/common/error-state'
import { PageIntro } from '@/components/common/section-header'
import { MessFormDialog } from '@/components/admin/mess-form-dialog'

type Filter = 'all' | 'active' | 'inactive'

export function AdminMessesPage() {
  const query = useMesses()
  const [filter, setFilter] = useState<Filter>('all')
  const [createOpen, setCreateOpen] = useState(false)

  const messes = useMemo(() => {
    const all = query.data ?? []
    if (filter === 'active') return all.filter((mess) => mess.is_active)
    if (filter === 'inactive') return all.filter((mess) => !mess.is_active)
    return all
  }, [query.data, filter])

  const totalStudents = (query.data ?? []).reduce((sum, mess) => sum + mess.students.length, 0)

  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Campus administration"
        title="Messes"
        description={`${pluralize(query.data?.length ?? 0, 'mess', 'messes')} · ${totalStudents} students assigned campus-wide.`}
        action={
          <Button size="icon" className="shrink-0 rounded-2xl" onClick={() => setCreateOpen(true)}>
            <Plus className="size-5" />
          </Button>
        }
      />

      <div className="flex gap-1.5">
        {(['all', 'active', 'inactive'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[11px] font-semibold capitalize',
              filter === option
                ? 'border-secondary bg-secondary text-secondary-foreground'
                : 'border-border bg-card text-muted-foreground',
            )}
          >
            {option}
          </button>
        ))}
      </div>

      {query.isLoading && <LoadingList rows={4} />}
      {query.isError && (
        <ErrorState
          title="Messes could not load"
          message="Please try again."
          onRetry={() => query.refetch()}
        />
      )}

      {!query.isLoading && !query.isError && messes.length === 0 && (
        <div className="rounded-2xl border border-border/70 bg-card shadow-card">
          <EmptyState
            icon={Store}
            title={filter === 'all' ? 'No messes yet' : `No ${filter} messes`}
            description={
              filter === 'all'
                ? 'Create the first mess, then assign students and staff to it.'
                : 'Change the filter or create a mess.'
            }
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-3.5" />
                Create mess
              </Button>
            }
          />
        </div>
      )}

      <div className="space-y-2.5">
        {messes.map((mess) => (
          <Link
            key={mess.id}
            to={`/admin/messes/${mess.id}`}
            className="block rounded-2xl border border-border/70 bg-card p-4 shadow-card transition-colors hover:bg-muted/30"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Store className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-semibold">{mess.name}</p>
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                      {mess.description || `Created ${formatDateTime(mess.created_at, 'd MMM yyyy')}`}
                    </p>
                  </div>
                  <Badge variant={mess.is_active ? 'success' : 'muted'}>
                    {mess.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <UsersRound className="size-3" />
                    {pluralize(mess.students.length, 'student')}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <UtensilsCrossed className="size-3" />
                    {pluralize(mess.staff_assignments.length, 'staff member')}
                  </span>
                  <span>{pluralize(mess.meals.length, 'meal')}</span>
                </div>
              </div>
              <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl bg-muted/70 p-3 text-[11px] leading-relaxed text-muted-foreground">
        Deactivating a mess hides it from normal operations but keeps all historical meals, bookings
        and reports intact. A mess cannot be deleted while students, staff or meals reference it.
      </div>

      <MessFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
