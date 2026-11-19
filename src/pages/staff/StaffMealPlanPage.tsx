import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Pencil,
  Plus,
  RefreshCw,
  UtensilsCrossed,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth'
import { useMealTemplates } from '@/hooks/use-staff'
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  WEEKDAYS,
  cn,
  formatCutoffHours,
  formatTimeRange,
  weekdayIST,
} from '@/lib/utils'
import type { MealCategory, MealTemplate } from '@/types/app'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState, LoadingList } from '@/components/common/error-state'
import { PageIntro } from '@/components/common/section-header'
import { MealIcon } from '@/components/meals/meal-icon'
import { MealPlanDialog } from '@/components/staff/meal-plan-dialog'

function slotKey(day: number, category: MealCategory) {
  return `${day}:${category}`
}

function MealSlot({
  category,
  template,
  onEdit,
}: {
  category: MealCategory
  template: MealTemplate | null
  onEdit: () => void
}) {
  const meta = CATEGORY_META[category]
  const inactive = Boolean(template && !template.is_active)

  return (
    <article
      className={cn(
        'rounded-2xl border bg-card p-3.5 shadow-card transition-opacity',
        template ? 'border-border/70' : 'border-dashed border-border/80',
        inactive && 'opacity-65',
      )}
    >
      <div className="flex items-start gap-3">
        <MealIcon category={category} className="size-10 rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {template?.title ?? meta.label}
              </p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock3 className="size-3" />
                {template
                  ? formatTimeRange(template.start_time, template.end_time)
                  : `${formatTimeRange(meta.defaultStart, meta.defaultEnd)} · not planned`}
              </p>
            </div>
            <Badge variant={inactive ? 'muted' : template ? 'success' : 'outline'}>
              {inactive ? 'Paused' : template ? 'Weekly' : 'Empty'}
            </Badge>
          </div>

          <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
            {template
              ? template.menu_items
                  .slice()
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((item) => item.name)
                  .join(' · ') || 'No menu items yet'
              : `Add a ${meta.label.toLowerCase()} menu to repeat every week.`}
          </p>

          {template && (
            <p className="mt-1.5 text-[9px] text-muted-foreground">
              Bookings close {formatCutoffHours(template.cutoff_offset_minutes)} before service
            </p>
          )}

          <Button
            type="button"
            variant={template ? 'outline' : 'soft'}
            size="sm"
            className="mt-2.5 h-8 w-full"
            onClick={onEdit}
          >
            {template ? <Pencil className="size-3.5" /> : <Plus className="size-3.5" />}
            {template ? 'Edit menu' : 'Plan this meal'}
          </Button>
        </div>
      </div>
    </article>
  )
}

export function StaffMealPlanPage() {
  const { me } = useAuth()
  const templatesQuery = useMealTemplates()
  const messes = useMemo(() => me?.staff_messes ?? [], [me?.staff_messes])
  const [pickedMessId, setPickedMessId] = useState('')
  const [selectedDay, setSelectedDay] = useState(() => weekdayIST())
  const [editingCategory, setEditingCategory] = useState<MealCategory | null>(null)

  const selectedMessId =
    pickedMessId ||
    (messes.length === 1 ? messes[0].id : '') ||
    messes[0]?.id ||
    ''

  const templates = useMemo(
    () => (templatesQuery.data ?? []).filter((template) => template.mess_id === selectedMessId),
    [selectedMessId, templatesQuery.data],
  )

  const bySlot = useMemo(() => {
    const map = new Map<string, MealTemplate>()
    for (const template of templates) {
      map.set(slotKey(template.day_of_week, template.category), template)
    }
    return map
  }, [templates])

  const selectedDayMeta = WEEKDAYS.find((day) => day.value === selectedDay) ?? WEEKDAYS[0]
  const plannedToday = templates.filter((template) => template.day_of_week === selectedDay).length
  const totalPlanned = templates.filter((template) => template.is_active).length
  const editingTemplate = editingCategory
    ? bySlot.get(slotKey(selectedDay, editingCategory)) ?? null
    : null

  if (messes.length === 0) {
    return (
      <div className="space-y-4">
        <PageIntro
          eyebrow="Mess operations"
          title="Weekly menu"
          description="Set a repeating menu for every day and meal."
        />
        <div className="rounded-2xl border border-border/70 bg-card shadow-card">
          <EmptyState
            icon={CalendarDays}
            title="No mess assigned"
            description="Ask an administrator to assign you to a mess before planning meals."
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Mess operations"
        title="Weekly menu"
        description="Set the menu for each day and meal once. Upcoming meals and student bookings are generated automatically."
        action={
          <Badge variant="success">
            <RefreshCw className="size-3" />
            Auto
          </Badge>
        }
      />

      {messes.length > 1 && (
        <Select value={selectedMessId} onValueChange={setPickedMessId}>
          <SelectTrigger aria-label="Choose a mess">
            <SelectValue placeholder="Choose a mess" />
          </SelectTrigger>
          <SelectContent>
            {messes.map((mess) => (
              <SelectItem key={mess.id} value={mess.id}>
                {mess.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="rounded-2xl border border-border/70 bg-card p-3.5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold">Repeating plan</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {totalPlanned === 0
                ? 'No meals planned yet'
                : `${totalPlanned} weekly ${totalPlanned === 1 ? 'meal' : 'meals'} · next 3 weeks generated`}
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="h-8">
            <Link to="/staff/meals">
              View meals
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 no-scrollbar">
        <div className="flex w-max gap-1.5">
          {WEEKDAYS.map((day) => {
            const active = selectedDay === day.value
            const planned = templates.filter(
              (template) => template.day_of_week === day.value && template.is_active,
            ).length
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => setSelectedDay(day.value)}
                className={cn(
                  'relative rounded-xl border px-3 py-2 text-[11px] font-semibold transition-colors',
                  active
                    ? 'border-secondary bg-secondary text-secondary-foreground'
                    : 'border-border bg-card text-muted-foreground',
                )}
              >
                {day.shortLabel}
                {planned > 0 && (
                  <span
                    className={cn(
                      'absolute right-1.5 top-1.5 size-1.5 rounded-full',
                      active ? 'bg-white' : 'bg-success',
                    )}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-display text-base font-semibold">{selectedDayMeta.label}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {plannedToday === 0
              ? 'Nothing planned for this day yet'
              : `${plannedToday} of ${CATEGORY_ORDER.length} meals planned`}
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground">Asia/Kolkata</span>
      </div>

      {templatesQuery.isLoading ? (
        <LoadingList rows={4} />
      ) : templatesQuery.isError ? (
        <ErrorState
          title="Weekly menu could not load"
          message="Please try again."
          onRetry={() => templatesQuery.refetch()}
        />
      ) : (
        <div className="space-y-2.5">
          {CATEGORY_ORDER.map((category) => (
            <MealSlot
              key={category}
              category={category}
              template={bySlot.get(slotKey(selectedDay, category)) ?? null}
              onEdit={() => setEditingCategory(category)}
            />
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-2xl bg-muted/70 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <UtensilsCrossed className="mt-0.5 size-3.5 shrink-0 text-secondary" />
        <p>
          Meals are generated for the next 3 weeks and bookings are added for every student
          automatically. Editing one generated meal from the Meals screen keeps that day as a
          one-off override.
        </p>
      </div>

      <MealPlanDialog
        open={editingCategory !== null}
        onOpenChange={(open) => {
          if (!open) setEditingCategory(null)
        }}
        messId={selectedMessId}
        dayOfWeek={selectedDay}
        dayLabel={selectedDayMeta.label}
        category={editingCategory ?? 'breakfast'}
        template={editingTemplate}
      />
    </div>
  )
}
