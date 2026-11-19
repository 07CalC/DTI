import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  MapPin,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { useMealPass } from '@/hooks/use-meals'
import {
  formatDateTime,
  formatMealDate,
  formatTimeRange,
  relativeDayLabel,
  truncate,
} from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { MealIcon } from '@/components/meals/meal-icon'

export function MealPassPage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const query = useMealPass(bookingId)
  const [qr, setQr] = useState<{ token: string; url: string } | null>(null)
  const pass = query.data
  const token = pass?.token ?? null

  useEffect(() => {
    if (!token) return
    let cancelled = false
    QRCode.toDataURL(token, {
      width: 720,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#241f1a', light: '#ffffff' },
    }).then((url) => {
      if (!cancelled) setQr({ token, url })
    })
    return () => {
      cancelled = true
    }
  }, [token])

  const qrDataUrl = token && qr?.token === token ? qr.url : null

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-28 animate-pulse rounded-lg bg-muted" />
        <div className="aspect-[3/4.2] animate-pulse rounded-[1.7rem] bg-muted" />
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <ErrorState
          title="Meal pass not available"
          message="This pass may belong to a different account or the meal booking is no longer active."
          onRetry={() => query.refetch()}
        />
      </div>
    )
  }

  if (!pass) return null

  const unavailable = !pass.token
  const consumed = Boolean(pass.consumed_at)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Badge variant="outline" className="bg-card">
          <ShieldCheck />
          Single-use pass
        </Badge>
      </div>

      <div className="overflow-hidden rounded-[1.7rem] border border-border/70 bg-card shadow-float">
        <div className="flex items-center justify-between bg-secondary px-5 py-4 text-secondary-foreground">
          <div className="flex items-center gap-2">
            <QrCode className="size-4" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
              Meal pass
            </span>
          </div>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold capitalize text-white/85">
            {pass.meal.category}
          </span>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-3">
            <MealIcon category={pass.meal.category} />
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold leading-tight">{pass.meal.title}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {relativeDayLabel(pass.meal.meal_date)} · {formatMealDate(pass.meal.meal_date)} ·{' '}
                {formatTimeRange(pass.meal.start_time, pass.meal.end_time)}
              </p>
            </div>
          </div>

          <div className="relative mx-auto mt-5 aspect-square w-full max-w-[276px] overflow-hidden rounded-3xl border border-border bg-white p-3 shadow-inner">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Meal booking QR code"
                className={`size-full object-contain transition-all ${consumed ? 'opacity-20 blur-[1px] grayscale' : ''}`}
              />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
                {unavailable ? <LockKeyhole className="size-8" /> : <QrCode className="size-8" />}
                <p className="text-xs font-medium">{unavailable ? 'No active QR' : 'Generating QR…'}</p>
              </div>
            )}

            {consumed && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40">
                <div className="flex items-center gap-2 rounded-full bg-success px-4 py-2 text-sm font-semibold text-white shadow-lg">
                  <CheckCircle2 className="size-4" />
                  Already scanned
                </div>
                <p className="mt-2 rounded-full bg-white/90 px-3 py-1 text-[10px] font-medium text-muted-foreground">
                  {pass.consumed_at ? formatDateTime(pass.consumed_at) : ''}
                </p>
              </div>
            )}

            {!consumed && unavailable && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 p-6 text-center">
                <LockKeyhole className="size-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-semibold">Pass unavailable</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  This meal is opted out. Opt back in before the cutoff to get a pass.
                </p>
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-dashed border-border pt-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Student
                </p>
                <p className="mt-1 text-sm font-semibold">{pass.student.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{pass.student.roll_number}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Mess
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold">
                  <MapPin className="size-3" />
                  {pass.meal.mess_name}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/70 px-3 py-2.5">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                <Clock3 className="size-3" />
                Pass ID
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {pass.token ? truncate(pass.token, 18) : 'INACTIVE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {unavailable && !consumed && (
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-card">
          <EmptyState
            icon={LockKeyhole}
            title="You're opted out"
            description="Opt back in from the meal card before the booking cutoff to activate a pass."
            action={
              <Button asChild size="sm">
                <Link to="/student/meals">Back to meals</Link>
              </Button>
            }
          />
        </div>
      )}

      <div className="flex items-start gap-2 rounded-2xl bg-muted/70 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-secondary" />
        <p>
          Show this screen at the counter. The QR contains only a random booking token — never your
          name, roll number or email. Refreshes automatically after a scan.
        </p>
      </div>

      <Button variant="outline" size="sm" className="w-full" onClick={() => query.refetch()}>
        <RefreshCw className={`size-3.5 ${query.isFetching ? 'animate-spin' : ''}`} />
        Refresh pass status
      </Button>
    </div>
  )
}
