import { useEffect, useState } from 'react'
import { Clock3 } from 'lucide-react'
import { cn, cutoffLabel, formatCountdown, isCutoffPassed } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export function CutoffLabel({
  cutoffAt,
  className,
  showIcon = true,
}: {
  cutoffAt: string
  className?: string
  showIcon?: boolean
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(timer)
  }, [])

  const remaining = new Date(cutoffAt).getTime() - now
  const closed = remaining <= 0

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-medium',
        closed ? 'text-muted-foreground' : 'text-primary',
        className,
      )}
    >
      {showIcon && <Clock3 className="size-3" />}
      {closed ? 'Booking closed' : cutoffLabel(cutoffAt)}
    </span>
  )
}

export function Countdown({
  cutoffAt,
  className,
}: {
  cutoffAt: string
  className?: string
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const remaining = new Date(cutoffAt).getTime() - now
  if (remaining <= 0) return <span className={className}>Closed</span>
  return <span className={cn('tabular', className)}>{formatCountdown(remaining)}</span>
}

export function CutoffBadge({ cutoffAt }: { cutoffAt: string }) {
  const closed = isCutoffPassed(cutoffAt)
  return (
    <Badge variant={closed ? 'muted' : 'warning'}>
      {closed ? 'Closed' : cutoffLabel(cutoffAt)}
    </Badge>
  )
}
