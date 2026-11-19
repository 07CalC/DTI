import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'default',
  className,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  hint?: string
  tone?: 'default' | 'primary' | 'success' | 'warning'
  className?: string
}) {
  const toneClasses = {
    default: 'bg-muted text-foreground',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
  }

  return (
    <div className={cn('rounded-2xl border border-border/70 bg-card p-4 shadow-card', className)}>
      <div className={cn('mb-3 flex size-9 items-center justify-center rounded-xl', toneClasses[tone])}>
        <Icon className="size-4" strokeWidth={2} />
      </div>
      <p className="font-display text-2xl font-semibold leading-none tabular">{value}</p>
      <p className="mt-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground/80">{hint}</p>}
    </div>
  )
}
