import { CheckCircle2, CircleSlash, QrCode } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BookingStatus } from '@/types/app'
import { Badge } from '@/components/ui/badge'

export function BookingStatusBadge({
  status,
  consumed,
  className,
}: {
  status: BookingStatus | null | undefined
  consumed?: boolean
  className?: string
}) {
  if (status === 'opted_in') {
    return (
      <Badge variant="success" className={className}>
        <CheckCircle2 />
        {consumed ? 'Scanned' : 'Opted in'}
      </Badge>
    )
  }
  return (
    <Badge variant={status === 'opted_out' ? 'muted' : 'outline'} className={cn(className)}>
      <CircleSlash />
      {status === 'opted_out' ? 'Opted out' : 'Not booked'}
    </Badge>
  )
}

export function ScannedBadge() {
  return (
    <Badge variant="secondary">
      <QrCode />
      Scanned
    </Badge>
  )
}
