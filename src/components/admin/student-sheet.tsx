import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { History, LoaderCircle, Mail, Save, UserRound } from 'lucide-react'
import { useAdminStudentHistory, useCreateStudent, useUpdateStudent } from '@/hooks/use-admin'
import { studentSchema, type StudentFormValues } from '@/lib/validations'
import {
  cn,
  formatDateTime,
  formatMealDate,
  formatTimeRange,
  initials,
  pluralize,
} from '@/lib/utils'
import type { BookingHistoryItem, MessSummary, StudentDirectoryItem } from '@/types/app'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState, LoadingList } from '@/components/common/error-state'
import { FormField } from '@/components/common/form-field'
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge'
import { MealIcon } from '@/components/meals/meal-icon'

function HistoryEntry({ item }: { item: BookingHistoryItem }) {
  const events = [...item.booking_events].sort((a, b) => a.created_at.localeCompare(b.created_at))
  return (
    <article className="rounded-xl border border-border/70 bg-card p-3">
      <div className="flex items-start gap-2.5">
        <MealIcon category={item.meal.category} className="size-9 rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{item.meal.title}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {formatMealDate(item.meal.meal_date, 'EEE, d MMM')} ·{' '}
                {formatTimeRange(item.meal.start_time, item.meal.end_time)} · {item.meal.mess?.name}
              </p>
            </div>
            <BookingStatusBadge status={item.status} consumed={Boolean(item.consumed_at)} />
          </div>
          <p className="mt-1 line-clamp-1 text-[10px] text-muted-foreground">
            {item.meal.menu_items.map((menuItem) => menuItem.name).join(' · ') || 'No menu recorded'}
          </p>
          {events.length > 0 && (
            <div className="mt-2 space-y-0.5 border-t border-border/60 pt-1.5">
              {events.map((event) => (
                <p key={event.id} className="text-[9px] leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">{formatDateTime(event.created_at)}</span>{' '}
                  · {event.previous_status ?? 'none'} → {event.new_status} · {event.action_source}
                </p>
              ))}
            </div>
          )}
          {item.consumed_at && (
            <p className="mt-1 text-[9px] font-medium text-success">
              Consumed {formatDateTime(item.consumed_at)}
            </p>
          )}
        </div>
      </div>
    </article>
  )
}

export function StudentSheet({
  open,
  onOpenChange,
  student,
  messes,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: StudentDirectoryItem | null
  messes: MessSummary[]
}) {
  const isEditing = Boolean(student)
  const createMutation = useCreateStudent()
  const updateMutation = useUpdateStudent()
  const [tabState, setTabState] = useState<{ key: string; value: 'details' | 'history' }>({
    key: 'closed',
    value: 'details',
  })
  const sheetKey = open ? (student?.id ?? 'new') : 'closed'
  const tab = tabState.key === sheetKey ? tabState.value : 'details'
  const pending = createMutation.isPending || updateMutation.isPending
  const defaultMessId = messes[0]?.id ?? ''

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: '',
      email: '',
      roll_number: '',
      mess_id: '',
      default_booking_preference: 'opted_in',
      is_active: true,
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      name: student?.profile.name ?? '',
      email: student?.profile.email ?? '',
      roll_number: student?.roll_number ?? '',
      mess_id: student?.mess_id ?? defaultMessId,
      default_booking_preference: student?.default_booking_preference ?? 'opted_in',
      is_active: student?.profile.is_active ?? true,
    })
  }, [open, student, defaultMessId, form])

  const historyQuery = useAdminStudentHistory(
    open && student && tab === 'history' ? student.id : undefined,
  )

  const onSubmit = form.handleSubmit((values) => {
    const input = {
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      roll_number: values.roll_number.trim(),
      mess_id: values.mess_id,
      default_booking_preference: values.default_booking_preference,
      is_active: values.is_active,
    }

    if (student) {
      updateMutation.mutate(
        { student_id: student.id, ...input },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      createMutation.mutate(input, { onSuccess: () => onOpenChange(false) })
    }
  })

  const preference = useWatch({ control: form.control, name: 'default_booking_preference' })

  const handleOpenChange = (next: boolean) => {
    if (!next) setTabState({ key: 'closed', value: 'details' })
    onOpenChange(next)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] gap-0 overflow-y-auto p-0">
        <div className="border-b border-border/60 p-5 pr-12">
          <SheetTitle>{isEditing ? 'Student account' : 'Add a student'}</SheetTitle>
          <SheetDescription className="mt-1">
            {isEditing
              ? 'Update details, transfer messes, or review booking history.'
              : 'Provision an @iiita.ac.in Google account. No password is created.'}
          </SheetDescription>
          {student && (
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-muted/60 p-3">
              <Avatar className="size-10">
                <AvatarFallback className="text-xs">{initials(student.profile.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{student.profile.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {student.roll_number} · {student.profile.email}
                </p>
              </div>
              <Badge variant={student.profile.is_active ? 'success' : 'destructive'}>
                {student.profile.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          )}
        </div>

        {isEditing && (
          <Tabs
            value={tab}
            onValueChange={(value) =>
              setTabState({ key: sheetKey, value: value as 'details' | 'history' })
            }
          >
            <div className="px-5 pt-4">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="details">
                  <UserRound className="size-3.5" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="history">
                  <History className="size-3.5" />
                  History
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="details" className="mt-0">
              <form onSubmit={onSubmit} className="space-y-4 p-5" noValidate>
                <FormField
                  label="Full name"
                  htmlFor="student-name"
                  required
                  error={form.formState.errors.name?.message}
                >
                  <Input
                    id="student-name"
                    aria-invalid={Boolean(form.formState.errors.name)}
                    {...form.register('name')}
                  />
                </FormField>

                <FormField
                  label="Institute email"
                  htmlFor="student-email"
                  required
                  error={form.formState.errors.email?.message}
                  hint={student ? 'Locked after first sign-in' : undefined}
                >
                  <Input
                    id="student-email"
                    type="email"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    placeholder="name@iiita.ac.in"
                    aria-invalid={Boolean(form.formState.errors.email)}
                    {...form.register('email')}
                  />
                </FormField>

                <FormField
                  label="Roll number"
                  htmlFor="student-roll"
                  required
                  error={form.formState.errors.roll_number?.message}
                >
                  <Input
                    id="student-roll"
                    placeholder="e.g. IIT2023001"
                    autoCapitalize="characters"
                    aria-invalid={Boolean(form.formState.errors.roll_number)}
                    {...form.register('roll_number')}
                  />
                </FormField>

                <FormField
                  label="Mess assignment"
                  required
                  error={form.formState.errors.mess_id?.message}
                  hint={student ? 'Transfers keep old bookings intact' : undefined}
                >
                  <Controller
                    control={form.control}
                    name="mess_id"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger aria-invalid={Boolean(form.formState.errors.mess_id)}>
                          <SelectValue placeholder="Choose a mess" />
                        </SelectTrigger>
                        <SelectContent>
                          {messes.map((mess) => (
                            <SelectItem key={mess.id} value={mess.id}>
                              {mess.name}
                              {!mess.is_active ? ' (inactive)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>

                <FormField label="Default booking preference">
                  <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                    {(['opted_in', 'opted_out'] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          form.setValue('default_booking_preference', option, { shouldValidate: true })
                        }
                        className={cn(
                          'h-9 rounded-lg text-xs font-semibold transition-all',
                          preference === option
                            ? 'bg-card text-foreground shadow-sm'
                            : 'text-muted-foreground',
                        )}
                      >
                        {option === 'opted_in' ? 'Opt in' : 'Opt out'}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    Applies to newly scheduled meals only. Existing bookings are never overwritten.
                  </p>
                </FormField>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/40 p-3">
                  <div>
                    <p className="text-xs font-semibold">Account active</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Deactivated students keep their history but cannot sign in or book meals.
                    </p>
                  </div>
                  <Controller
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label="Student account active"
                      />
                    )}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                  {isEditing ? 'Save student' : 'Create student account'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="history" className="mt-0 p-5">
              {historyQuery.isLoading && <LoadingList rows={3} />}
              {historyQuery.isError && (
                <ErrorState
                  title="History could not load"
                  message="Please try again."
                  onRetry={() => historyQuery.refetch()}
                />
              )}
              {!historyQuery.isLoading && !historyQuery.isError && (
                <>
                  <p className="mb-3 text-[11px] text-muted-foreground">
                    {pluralize(historyQuery.data?.length ?? 0, 'booking')} · newest first
                  </p>
                  {(historyQuery.data?.length ?? 0) === 0 ? (
                    <EmptyState
                      icon={History}
                      title="No bookings yet"
                      description="Bookings appear once this student is assigned to meals."
                      className="py-8"
                    />
                  ) : (
                    <div className="space-y-2">
                      {historyQuery.data?.map((item) => (
                        <HistoryEntry key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        )}

        {!isEditing && (
          <form onSubmit={onSubmit} className="space-y-4 p-5" noValidate>
            <FormField
              label="Full name"
              htmlFor="new-student-name"
              required
              error={form.formState.errors.name?.message}
            >
              <Input
                id="new-student-name"
                aria-invalid={Boolean(form.formState.errors.name)}
                {...form.register('name')}
              />
            </FormField>

            <FormField
              label="Institute email"
              htmlFor="new-student-email"
              required
              error={form.formState.errors.email?.message}
            >
              <Input
                id="new-student-email"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="name@iiita.ac.in"
                aria-invalid={Boolean(form.formState.errors.email)}
                {...form.register('email')}
              />
            </FormField>

            <FormField
              label="Roll number"
              htmlFor="new-student-roll"
              required
              error={form.formState.errors.roll_number?.message}
            >
              <Input
                id="new-student-roll"
                placeholder="e.g. IIT2023001"
                autoCapitalize="characters"
                aria-invalid={Boolean(form.formState.errors.roll_number)}
                {...form.register('roll_number')}
              />
            </FormField>

            <FormField
              label="Mess assignment"
              required
              error={form.formState.errors.mess_id?.message}
            >
              <Controller
                control={form.control}
                name="mess_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-invalid={Boolean(form.formState.errors.mess_id)}>
                      <SelectValue placeholder="Choose a mess" />
                    </SelectTrigger>
                    <SelectContent>
                      {messes.map((mess) => (
                        <SelectItem key={mess.id} value={mess.id}>
                          {mess.name}
                          {!mess.is_active ? ' (inactive)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField label="Default booking preference">
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                {(['opted_in', 'opted_out'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      form.setValue('default_booking_preference', option, { shouldValidate: true })
                    }
                    className={cn(
                      'h-9 rounded-lg text-xs font-semibold transition-all',
                      preference === option
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground',
                    )}
                  >
                    {option === 'opted_in' ? 'Opt in' : 'Opt out'}
                  </button>
                ))}
              </div>
            </FormField>

            <div className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-[10px] leading-relaxed text-muted-foreground">
              <Mail className="mt-0.5 size-3.5 shrink-0" />
              The student signs in with Google using this exact @iiita.ac.in address. The account is
              linked automatically on first sign-in.
            </div>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
              Create student account
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
