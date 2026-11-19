import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Could not load this',
  message = 'Check your connection and try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" />
      </div>
      <p className="font-display text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="size-3.5" />
          Try again
        </Button>
      )}
    </div>
  )
}

export function LoadingList({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-border/70 bg-card p-4 shadow-card">
          <div className="flex items-start gap-3">
            <div className="size-11 animate-pulse rounded-xl bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded-md bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded-md bg-muted" />
              <div className="h-3 w-4/5 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function InlineSpinner({ icon: Icon }: { icon?: LucideIcon }) {
  if (Icon) return <Icon className="size-4 animate-spin" />
  return <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
}
