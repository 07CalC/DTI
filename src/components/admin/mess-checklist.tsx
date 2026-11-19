import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MessSummary } from '@/types/app'
import { Badge } from '@/components/ui/badge'

export function MessChecklist({
  messes,
  value,
  onChange,
  disabled,
}: {
  messes: MessSummary[]
  value: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
}) {
  const toggle = (messId: string) => {
    onChange(value.includes(messId) ? value.filter((id) => id !== messId) : [...value, messId])
  }

  if (messes.length === 0) {
    return (
      <p className="rounded-xl bg-muted/60 p-3 text-[11px] text-muted-foreground">
        No messes exist yet. Create a mess first.
      </p>
    )
  }

  return (
    <div className="space-y-1.5">
      {messes.map((mess) => {
        const checked = value.includes(mess.id)
        return (
          <button
            key={mess.id}
            type="button"
            disabled={disabled}
            onClick={() => toggle(mess.id)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-60',
              checked ? 'border-primary/40 bg-primary/5' : 'border-border bg-card hover:bg-muted/50',
            )}
          >
            <span
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card',
              )}
            >
              {checked && <Check className="size-3.5" />}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-semibold">{mess.name}</span>
            {!mess.is_active && <Badge variant="muted">Inactive</Badge>}
          </button>
        )
      })}
    </div>
  )
}
