import { useEffect } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, Plus, Save, Trash2 } from 'lucide-react'
import { useDeleteMealTemplate, useSaveMealTemplate } from '@/hooks/use-staff'
import { mealPlanSchema, type MealPlanFormValues } from '@/lib/validations'
import { CATEGORY_META, defaultCutoffOffset, formatTimeRange } from '@/lib/utils'
import type { MealCategory, MealTemplate } from '@/types/app'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/common/form-field'
import { MealIcon } from '@/components/meals/meal-icon'

export function MealPlanDialog({
  open,
  onOpenChange,
  messId,
  dayOfWeek,
  dayLabel,
  category,
  template,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  messId: string
  dayOfWeek: number
  dayLabel: string
  category: MealCategory
  template: MealTemplate | null
}) {
  const saveMutation = useSaveMealTemplate()
  const deleteMutation = useDeleteMealTemplate()
  const meta = CATEGORY_META[category]
  const pending = saveMutation.isPending || deleteMutation.isPending

  const form = useForm<MealPlanFormValues>({
    resolver: zodResolver(mealPlanSchema),
    defaultValues: {
      category,
      title: meta.label,
      description: '',
      start_time: meta.defaultStart,
      end_time: meta.defaultEnd,
      cutoff_offset_hours: defaultCutoffOffset(category) / 60,
      is_active: true,
      menu_items: [{ name: '', description: '' }],
    },
  })
  const { register, control, handleSubmit, reset, setError, formState } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'menu_items' })
  const isActive = useWatch({ control, name: 'is_active' })
  const startTime = useWatch({ control, name: 'start_time' })
  const endTime = useWatch({ control, name: 'end_time' })

  useEffect(() => {
    if (!open) return
    reset({
      category,
      title: template?.title ?? meta.label,
      description: template?.description ?? '',
      start_time: template?.start_time.slice(0, 5) ?? meta.defaultStart,
      end_time: template?.end_time.slice(0, 5) ?? meta.defaultEnd,
      cutoff_offset_hours:
        (template?.cutoff_offset_minutes ?? defaultCutoffOffset(category)) / 60,
      is_active: template?.is_active ?? true,
      menu_items:
        template && template.menu_items.length > 0
          ? [...template.menu_items]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((item) => ({ name: item.name, description: item.description ?? '' }))
          : [{ name: '', description: '' }],
    })
  }, [category, meta, open, reset, template])

  const onSubmit = handleSubmit((values) => {
    if (!messId) {
      setError('root', { message: 'Choose a mess first.' })
      return
    }

    saveMutation.mutate(
      {
        mess_id: messId,
        day_of_week: dayOfWeek,
        category: values.category,
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        start_time: values.start_time,
        end_time: values.end_time,
        cutoff_offset_minutes: Math.round(values.cutoff_offset_hours * 60),
        is_active: values.is_active,
        menu_items: values.menu_items.map((item) => ({
          name: item.name.trim(),
          description: item.description?.trim() || undefined,
        })),
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (error) => setError('root', { message: error.message }),
      },
    )
  })

  const handleDelete = () => {
    if (!template) return
    deleteMutation.mutate(
      { templateId: template.id, messId },
      {
        onSuccess: () => onOpenChange(false),
        onError: (error) => setError('root', { message: error.message }),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[430px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <MealIcon category={category} className="size-9 rounded-xl" />
            <span>
              {meta.label}
              <span className="ml-1.5 font-sans text-xs font-medium text-muted-foreground">
                · {dayLabel}
              </span>
            </span>
          </DialogTitle>
          <DialogDescription>
            This menu repeats every {dayLabel}. Upcoming meals are generated automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormField label="Meal title" htmlFor="plan-title" required error={formState.errors.title?.message}>
            <Input
              id="plan-title"
              placeholder={`e.g. ${meta.label} special`}
              aria-invalid={Boolean(formState.errors.title)}
              {...register('title')}
            />
          </FormField>

          <FormField
            label="Description"
            htmlFor="plan-description"
            hint="Optional"
            error={formState.errors.description?.message}
          >
            <Textarea
              id="plan-description"
              rows={2}
              placeholder="Anything students should know about this meal"
              {...register('description')}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Starts"
              htmlFor="plan-start"
              required
              error={formState.errors.start_time?.message}
            >
              <Input
                id="plan-start"
                type="time"
                aria-invalid={Boolean(formState.errors.start_time)}
                {...register('start_time')}
              />
            </FormField>
            <FormField
              label="Ends"
              htmlFor="plan-end"
              required
              error={formState.errors.end_time?.message}
            >
              <Input
                id="plan-end"
                type="time"
                aria-invalid={Boolean(formState.errors.end_time)}
                {...register('end_time')}
              />
            </FormField>
          </div>

          <FormField
            label="Booking cutoff (hours)"
            htmlFor="plan-cutoff"
            required
            hint="Decimals allowed, e.g. 1.5"
            error={formState.errors.cutoff_offset_hours?.message}
          >
            <Input
              id="plan-cutoff"
              type="number"
              inputMode="decimal"
              min={0}
              max={24}
              step={0.5}
              aria-invalid={Boolean(formState.errors.cutoff_offset_hours)}
              {...register('cutoff_offset_hours', { valueAsNumber: true })}
            />
          </FormField>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/40 p-3">
            <div>
              <p className="text-xs font-semibold">Repeat weekly</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {isActive
                  ? `New ${meta.label.toLowerCase()} meals will be generated every ${dayLabel}.`
                  : 'Paused. Already generated meals stay in the calendar.'}
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={(checked) => form.setValue('is_active', checked)}
              aria-label="Repeat this meal weekly"
            />
          </div>

          <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold">Menu</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {formatTimeRange(startTime || meta.defaultStart, endTime || meta.defaultEnd)} · at least one item
                </p>
              </div>
              <Badge variant="muted">{fields.length} items</Badge>
            </div>

            {formState.errors.menu_items?.root?.message && (
              <p className="text-[11px] font-medium text-destructive">
                {formState.errors.menu_items.root.message}
              </p>
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
          </div>

          {formState.errors.root?.message && (
            <p className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-[11px] text-destructive">
              {formState.errors.root.message}
            </p>
          )}

          <DialogFooter className="items-center sm:justify-between">
            {template ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/5 hover:text-destructive"
                    disabled={pending}
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove this weekly meal?</AlertDialogTitle>
                    <AlertDialogDescription>
                      New {meta.label.toLowerCase()} meals will stop being generated for {dayLabel}.
                      Meals already in the calendar are kept.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {saveMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save menu
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
