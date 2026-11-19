import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, Save } from 'lucide-react'
import { useCreateMess, useUpdateMess } from '@/hooks/use-admin'
import { messSchema, type MessFormValues } from '@/lib/validations'
import { Button } from '@/components/ui/button'
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

export interface MessFormTarget {
  id: string
  name: string
  description: string | null
  is_active: boolean
}

export function MessFormDialog({
  open,
  onOpenChange,
  mess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mess?: MessFormTarget | null
}) {
  const createMutation = useCreateMess()
  const updateMutation = useUpdateMess()
  const isEditing = Boolean(mess)
  const pending = createMutation.isPending || updateMutation.isPending

  const form = useForm<MessFormValues>({
    resolver: zodResolver(messSchema),
    defaultValues: { name: '', description: '', is_active: true },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      name: mess?.name ?? '',
      description: mess?.description ?? '',
      is_active: mess?.is_active ?? true,
    })
  }, [open, mess, form])

  const isActive = useWatch({ control: form.control, name: 'is_active' })

  const onSubmit = form.handleSubmit((values) => {
    const input = {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      is_active: values.is_active,
    }
    if (mess) {
      updateMutation.mutate(
        { id: mess.id, input },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      createMutation.mutate(input, { onSuccess: () => onOpenChange(false) })
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit mess' : 'Create mess'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the mess details or change whether students can use it.'
              : 'New messes start empty. Students and staff can be assigned afterwards.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormField
            label="Mess name"
            htmlFor="mess-name"
            required
            error={form.formState.errors.name?.message}
          >
            <Input
              id="mess-name"
              placeholder="e.g. BH5"
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register('name')}
            />
          </FormField>

          <FormField
            label="Description"
            htmlFor="mess-description"
            hint="Optional"
            error={form.formState.errors.description?.message}
          >
            <Textarea
              id="mess-description"
              rows={3}
              placeholder="Location or notes for this mess"
              {...form.register('description')}
            />
          </FormField>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/40 p-3">
            <div>
              <p className="text-xs font-semibold">Active</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Inactive messes remain visible to admins but are hidden from normal use.
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={(checked) => form.setValue('is_active', checked)}
              aria-label="Mess active"
            />
          </div>

          {form.formState.errors.root?.message && (
            <p className="text-[11px] font-medium text-destructive">{form.formState.errors.root.message}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
              {isEditing ? 'Save changes' : 'Create mess'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
