import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, Mail, Save, ShieldCheck } from 'lucide-react'
import { useCreateStaff, useUpdateStaff } from '@/hooks/use-admin'
import { staffFormSchema, type StaffFormValues } from '@/lib/validations'
import { initials } from '@/lib/utils'
import type { MessSummary, StaffMember } from '@/types/app'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { FormField } from '@/components/common/form-field'
import { MessChecklist } from '@/components/admin/mess-checklist'

export function StaffSheet({
  open,
  onOpenChange,
  staff,
  messes,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff: StaffMember | null
  messes: MessSummary[]
}) {
  const isEditing = Boolean(staff)
  const createMutation = useCreateStaff()
  const updateMutation = useUpdateStaff()
  const pending = createMutation.isPending || updateMutation.isPending

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      name: '',
      email: '',
      mess_ids: [],
      is_active: true,
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      name: staff?.name ?? '',
      email: staff?.email ?? '',
      mess_ids: staff?.staff_assignments.map((assignment) => assignment.mess_id) ?? [],
      is_active: staff?.is_active ?? true,
    })
  }, [open, staff, form])

  const onSubmit = form.handleSubmit((values) => {
    const input = {
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      mess_ids: values.mess_ids,
      is_active: values.is_active,
    }

    if (staff) {
      updateMutation.mutate(
        {
          profile_id: staff.id,
          name: input.name,
          is_active: input.is_active,
          mess_ids: input.mess_ids,
        },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      createMutation.mutate(
        { name: input.name, email: input.email, mess_ids: input.mess_ids },
        { onSuccess: () => onOpenChange(false) },
      )
    }
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] gap-0 overflow-y-auto p-0">
        <div className="border-b border-border/60 p-5 pr-12">
          <SheetTitle>{isEditing ? 'Staff account' : 'Add staff member'}</SheetTitle>
          <SheetDescription className="mt-1">
            {isEditing
              ? 'Change mess assignments or deactivate counter access.'
              : 'Provision an @iiita.ac.in Google account with mess-scoped access.'}
          </SheetDescription>
          {staff && (
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-muted/60 p-3">
              <Avatar className="size-10">
                <AvatarFallback className="text-xs">{initials(staff.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{staff.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">{staff.email}</p>
              </div>
              <Badge variant={staff.is_active ? 'success' : 'destructive'}>
                {staff.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-5" noValidate>
          <FormField
            label="Full name"
            htmlFor="staff-name"
            required
            error={form.formState.errors.name?.message}
          >
            <Input
              id="staff-name"
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register('name')}
            />
          </FormField>

          <FormField
            label="Institute email"
            htmlFor="staff-email"
            required
            error={form.formState.errors.email?.message}
            hint={isEditing ? 'Email is fixed' : undefined}
          >
            <Input
              id="staff-email"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="name@iiita.ac.in"
              disabled={isEditing}
              aria-invalid={Boolean(form.formState.errors.email)}
              {...form.register('email')}
            />
          </FormField>

          <FormField
            label="Assigned messes"
            required
            error={form.formState.errors.mess_ids?.message}
            hint="Staff see only these messes"
          >
            <Controller
              control={form.control}
              name="mess_ids"
              render={({ field }) => (
                <MessChecklist
                  messes={messes}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={pending}
                />
              )}
            />
          </FormField>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/40 p-3">
            <div>
              <p className="text-xs font-semibold">Account active</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Inactive staff cannot sign in or scan meal passes.
              </p>
            </div>
            <Controller
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={!isEditing}
                  aria-label="Staff account active"
                />
              )}
            />
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-[10px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-secondary" />
            Staff access is enforced by Postgres RLS. They can manage meals, view students and scan
            passes only for the messes selected here.
          </div>

          {!isEditing && (
            <div className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-[10px] leading-relaxed text-muted-foreground">
              <Mail className="mt-0.5 size-3.5 shrink-0" />
              The staff member signs in with Google using this exact @iiita.ac.in address.
            </div>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isEditing ? 'Save staff account' : 'Create staff account'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
