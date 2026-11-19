import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  CalendarPlus,
  Clock3,
  Info,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth'
import { useSaveMeal, useStaffMeal } from '@/hooks/use-staff'
import { mealSchema, type MealFormValues } from '@/lib/validations'
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  cn,
  errorMessage,
  formatMealDate,
  formatTimeRange,
  fromDateTimeLocalValue,
  todayIST,
  toDateTimeLocalValue,
} from '@/lib/utils'
import type { MealCategory } from '@/types/app'
import type { MealSaveInput } from '@/services/staff'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { FormField } from '@/components/common/form-field'
import { PageIntro } from '@/components/common/section-header'
import { MealIcon } from '@/components/meals/meal-icon'

function defaultValues(category: MealCategory = 'breakfast'): MealFormValues {
  const meta = CATEGORY_META[category]
  return {
    category,
    title: meta.label,
    description: '',
    meal_date: todayIST(),
    start_time: meta.defaultStart,
    end_time: meta.defaultEnd,
    cutoff_local: `${todayIST()}T${meta.defaultCutoff}`,
    menu_items: [{ name: '', description: '' }],
  }
}

export function StaffMealFormPage() {
  const { mealId } = useParams<{ mealId: string }>()
  const isEditing = Boolean(mealId)
  const navigate = useNavigate()
  const { me } = useAuth()
  const mealQuery = useStaffMeal(mealId)
  const saveMutation = useSaveMeal()

  const messes = useMemo(() => me?.staff_messes ?? [], [me?.staff_messes])
  const [messId, setMessId] = useState(() =>
    me?.staff_messes?.length === 1 ? me.staff_messes[0].id : '',
  )
  const initializedMeal = useRef<string | null>(null)

  const form = useForm<MealFormValues>({
    resolver: zodResolver(mealSchema),
    defaultValues: defaultValues(),
  })
  const { register, control, handleSubmit, reset, setValue, getValues, setError, formState } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'menu_items' })

  const category = useWatch({ control, name: 'category' })
  const mealDate = useWatch({ control, name: 'meal_date' })
  const cutoffPreview = useWatch({ control, name: 'cutoff_local' })
  const startPreview = useWatch({ control, name: 'start_time' })
  const endPreview = useWatch({ control, name: 'end_time' })
  const datePreview = mealDate
  const previousCategory = useRef<MealCategory>(category)
  const previousDate = useRef(mealDate)

  useEffect(() => {
    const meal = mealQuery.data
    if (!meal || initializedMeal.current === meal.id) return
    initializedMeal.current = meal.id
    setMessId(meal.mess_id)
    reset({
      category: meal.category,
      title: meal.title,
      description: meal.description ?? '',
      meal_date: meal.meal_date,
      start_time: meal.start_time.slice(0, 5),
      end_time: meal.end_time.slice(0, 5),
      cutoff_local: toDateTimeLocalValue(meal.booking_cutoff_at),
      menu_items:
        meal.menu_items.length > 0
          ? [...meal.menu_items]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((item) => ({ name: item.name, description: item.description ?? '' }))
          : [{ name: '', description: '' }],
    })
  }, [mealQuery.data, reset])

  useEffect(() => {
    if (previousCategory.current === category) return
    const oldCategory = previousCategory.current
    previousCategory.current = category
    if (isEditing) return

    const meta = CATEGORY_META[category]
    setValue('start_time', meta.defaultStart)
    setValue('end_time', meta.defaultEnd)
    setValue('cutoff_local', `${getValues('meal_date')}T${meta.defaultCutoff}`)
    const title = getValues('title').trim()
    if (!title || title === CATEGORY_META[oldCategory].label) {
      setValue('title', meta.label)
    }
  }, [category, getValues, isEditing, setValue])

  useEffect(() => {
    if (previousDate.current === mealDate) return
    previousDate.current = mealDate
    const cutoff = getValues('cutoff_local')
    const timePart = cutoff.split('T')[1] ?? '06:30'
    setValue('cutoff_local', `${mealDate}T${timePart}`)
  }, [mealDate, getValues, setValue])

  const onSubmit = handleSubmit((values) => {
    if (!messId) {
      setError('root', { message: 'Choose which mess this meal belongs to.' })
      return
    }

    const input: MealSaveInput = {
      mess_id: messId,
      category: values.category,
      title: values.title.trim(),
      description: values.description?.trim() || undefined,
      meal_date: values.meal_date,
      start_time: values.start_time,
      end_time: values.end_time,
      booking_cutoff_at: fromDateTimeLocalValue(values.cutoff_local),
      menu_items: values.menu_items.map((item) => ({
        name: item.name.trim(),
        description: item.description?.trim() || undefined,
      })),
    }

    saveMutation.mutate(
      { input, mealId },
      {
        onSuccess: (savedId) => navigate(`/staff/meals/${savedId}`, { replace: true }),
        onError: (error) => setError('root', { message: errorMessage(error) }),
      },
    )
  })

  const backButton = (
    <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate(-1)}>
      <ArrowLeft className="size-4" />
      Back
    </Button>
  )

  if (isEditing && mealQuery.isLoading) {
    return (
      <div className="space-y-4">
        {backButton}
        <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
        <div className="space-y-3">
          <div className="h-28 animate-pulse rounded-2xl bg-muted" />
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    )
  }

  if (isEditing && (mealQuery.isError || !mealQuery.data)) {
    return (
      <div className="space-y-4">
        {backButton}
        <ErrorState
          title="Meal not found"
          message="This meal may belong to another mess or no longer exist."
          onRetry={() => mealQuery.refetch()}
        />
      </div>
    )
  }

  if (messes.length === 0) {
    return (
      <div className="space-y-4">
        {backButton}
        <EmptyState
          icon={CalendarPlus}
          title="No mess assigned"
          description="Ask an administrator to assign you to a mess before creating meals."
        />
      </div>
    )
  }

  const selectedMess = messes.find((mess) => mess.id === messId) ?? (messes.length === 1 ? messes[0] : null)

  return (
    <div className="space-y-5">
      {backButton}

      <PageIntro
        eyebrow={isEditing ? 'Mess operations' : 'Publish a meal'}
        title={isEditing ? 'Edit meal' : 'Create a meal'}
        description={
          isEditing
            ? 'Update the menu, service window or cutoff. Existing bookings and event history are preserved.'
            : 'Choose a category, set the service window, and student bookings will be generated automatically.'
        }
      />

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <section className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-card">
          <p className="text-xs font-semibold">Mess</p>
          {messes.length === 1 ? (
            <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                <CalendarPlus className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{messes[0].name}</p>
                <p className="text-[10px] text-muted-foreground">Your assigned mess</p>
              </div>
            </div>
          ) : (
            <FormField label="Serving mess" required>
              <Select value={messId} onValueChange={setMessId}>
                <SelectTrigger>
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
            </FormField>
          )}
        </section>

        <section className="space-y-4 rounded-2xl border border-border/70 bg-card p-4 shadow-card">
          <div>
            <p className="text-xs font-semibold">Meal category</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Categories cannot be repeated for the same mess and date.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORY_ORDER.map((option) => {
              const meta = CATEGORY_META[option]
              const active = category === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setValue('category', option, { shouldValidate: true })}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border p-2.5 text-left transition-all',
                    active
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border bg-card hover:bg-muted/50',
                  )}
                >
                  <MealIcon category={option} className="size-9 rounded-xl" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{meta.label}</p>
                    <p className="mt-0.5 text-[9px] text-muted-foreground">
                      {formatTimeRange(meta.defaultStart, meta.defaultEnd)}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          <FormField label="Meal title" htmlFor="meal-title" required error={formState.errors.title?.message}>
            <Input
              id="meal-title"
              placeholder="e.g. North Indian lunch"
              aria-invalid={Boolean(formState.errors.title)}
              {...register('title')}
            />
          </FormField>

          <FormField
            label="Description"
            htmlFor="meal-description"
            hint="Optional"
            error={formState.errors.description?.message}
          >
            <Textarea
              id="meal-description"
              rows={2}
              placeholder="Anything students should know about this meal"
              {...register('description')}
            />
          </FormField>
        </section>

        <section className="space-y-4 rounded-2xl border border-border/70 bg-card p-4 shadow-card">
          <div>
            <p className="text-xs font-semibold">Service window</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">All times are Asia/Kolkata (IST).</p>
          </div>

          <FormField
            label="Serving date"
            htmlFor="meal-date"
            required
            error={formState.errors.meal_date?.message}
          >
            <Input
              id="meal-date"
              type="date"
              min={isEditing ? undefined : todayIST()}
              aria-invalid={Boolean(formState.errors.meal_date)}
              {...register('meal_date')}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Starts"
              htmlFor="meal-start"
              required
              error={formState.errors.start_time?.message}
            >
              <Input
                id="meal-start"
                type="time"
                aria-invalid={Boolean(formState.errors.start_time)}
                {...register('start_time')}
              />
            </FormField>
            <FormField label="Ends" htmlFor="meal-end" required error={formState.errors.end_time?.message}>
              <Input
                id="meal-end"
                type="time"
                aria-invalid={Boolean(formState.errors.end_time)}
                {...register('end_time')}
              />
            </FormField>
          </div>

          <FormField
            label="Booking cutoff"
            htmlFor="meal-cutoff"
            required
            hint="Students cannot change bookings after this"
            error={formState.errors.cutoff_local?.message}
          >
            <Input
              id="meal-cutoff"
              type="datetime-local"
              aria-invalid={Boolean(formState.errors.cutoff_local)}
              {...register('cutoff_local')}
            />
          </FormField>

          <div className="rounded-xl bg-muted/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Preview
            </p>
            <p className="mt-1 text-xs font-semibold">
              {selectedMess?.name ?? 'Mess'} · {CATEGORY_META[category].label} ·{' '}
              {formatMealDate(datePreview, 'EEE, d MMM')}
            </p>
            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock3 className="size-3" />
              Service {formatTimeRange(startPreview, endPreview)} · cutoff{' '}
              {cutoffPreview ? cutoffPreview.replace('T', ' · ') : '—'}
            </p>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold">Menu</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">At least one item is required.</p>
            </div>
            <Badge variant="muted">{fields.length} items</Badge>
          </div>

          {formState.errors.menu_items?.root?.message && (
            <p className="text-[11px] font-medium text-destructive">
              {formState.errors.menu_items.root.message}
            </p>
          )}
          {formState.errors.menu_items?.message && (
            <p className="text-[11px] font-medium text-destructive">{formState.errors.menu_items.message}</p>
          )}

          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-xl border border-border/70 bg-muted/30 p-2.5">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Input
                      placeholder={`Item ${index + 1} name`}
                      aria-invalid={Boolean(formState.errors.menu_items?.[index]?.name)}
                      className="h-9 bg-card text-sm"
                      {...register(`menu_items.${index}.name`)}
                    />
                    <Input
                      placeholder="Optional note (e.g. Jain available)"
                      className="h-9 bg-card text-xs"
                      {...register(`menu_items.${index}.description`)}
                    />
                    {formState.errors.menu_items?.[index]?.name?.message && (
                      <p className="text-[10px] font-medium text-destructive">
                        {formState.errors.menu_items[index]?.name?.message}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="mt-0.5 text-muted-foreground hover:text-destructive"
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                    aria-label={`Remove item ${index + 1}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => append({ name: '', description: '' })}
          >
            <Plus className="size-3.5" />
            Add menu item
          </Button>
        </section>

        {formState.errors.root?.message && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
            {formState.errors.root.message}
          </div>
        )}

        {!isEditing && (
          <div className="flex items-start gap-2 rounded-2xl bg-muted/70 p-3 text-[11px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0 text-secondary" />
            A booking is created for every student in the mess using their default preference. Students
            can override it until the cutoff, and every change is recorded as an event.
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : isEditing ? (
            <Save className="size-4" />
          ) : (
            <CalendarPlus className="size-4" />
          )}
          {saveMutation.isPending
            ? 'Saving meal…'
            : isEditing
              ? 'Save changes'
              : 'Publish meal & generate bookings'}
        </Button>
      </form>
    </div>
  )
}
