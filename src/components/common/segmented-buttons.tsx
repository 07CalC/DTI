import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function SegmentedButtons<T extends string>({
  value,
  options,
  onChange,
  disabled,
  className,
}: {
  value: T
  options: { value: T; label: string; icon?: ReactNode }[]
  onChange: (value: T) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-1 rounded-xl bg-muted p-1', className)}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60',
              active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
