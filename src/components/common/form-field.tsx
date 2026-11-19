import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={htmlFor} className="text-xs font-semibold">
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-[11px] font-medium text-destructive">{error}</p>}
    </div>
  )
}
