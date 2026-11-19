import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Html5Qrcode } from 'html5-qrcode'
import {
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock3,
  HelpCircle,
  Keyboard,
  LoaderCircle,
  ScanLine,
  ShieldAlert,
  UserX,
  XCircle,
} from 'lucide-react'
import { useScanBooking, useScanManual, useStaffMeals } from '@/hooks/use-staff'
import type { ScanResult, ScanResultCode } from '@/types/app'
import {
  CATEGORY_META,
  cn,
  errorMessage,
  formatDateTime,
  formatMealDate,
  formatTimeRange,
} from '@/lib/utils'
import type { StaffMealListItem } from '@/services/staff'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageIntro } from '@/components/common/section-header'
import { SegmentedButtons } from '@/components/common/segmented-buttons'
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge'

const RESULT_META: Record<
  ScanResultCode,
  { title: string; tone: string; icon: typeof CheckCircle2; hint: string }
> = {
  valid: {
    title: 'Valid booking',
    tone: 'border-success/30 bg-success-soft text-success',
    icon: CheckCircle2,
    hint: 'Meal pass accepted and marked as consumed.',
  },
  already_scanned: {
    title: 'Already scanned',
    tone: 'border-warning/30 bg-warning-soft text-warning',
    icon: AlertTriangle,
    hint: 'This pass has already been used. Do not serve again.',
  },
  not_started: {
    title: 'Scanning not open yet',
    tone: 'border-warning/30 bg-warning-soft text-warning',
    icon: Clock3,
    hint: 'This pass can only be scanned during the meal service window.',
  },
  meal_ended: {
    title: 'Scanning window closed',
    tone: 'border-destructive/25 bg-destructive/5 text-destructive',
    icon: XCircle,
    hint: 'The service window for this meal has ended.',
  },
  opted_out: {
    title: 'Student opted out',
    tone: 'border-destructive/25 bg-destructive/5 text-destructive',
    icon: XCircle,
    hint: 'Opted-out bookings are not valid for service.',
  },
  invalid: {
    title: 'Invalid QR',
    tone: 'border-border bg-muted/70 text-muted-foreground',
    icon: HelpCircle,
    hint: 'This code is not a recognised MessMate meal pass.',
  },
  forbidden: {
    title: 'Different mess',
    tone: 'border-destructive/25 bg-destructive/5 text-destructive',
    icon: ShieldAlert,
    hint: 'This pass belongs to a mess you are not assigned to.',
  },
  not_booked: {
    title: 'No booking found',
    tone: 'border-border bg-muted/70 text-muted-foreground',
    icon: UserX,
    hint: 'The student has no booking for this meal.',
  },
}

function ScanResultCard({
  result,
  onNext,
  nextLabel,
}: {
  result: ScanResult
  onNext: () => void
  nextLabel: string
}) {
  const meta = RESULT_META[result.result] ?? RESULT_META.invalid
  const Icon = meta.icon

  return (
    <div className={cn('overflow-hidden rounded-2xl border shadow-card', meta.tone)}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/60">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-semibold">{meta.title}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed opacity-80">
              {result.message ?? meta.hint}
            </p>
          </div>
        </div>

        {(result.student_name || result.meal_title) && (
          <div className="mt-3 space-y-2 rounded-xl bg-white/60 p-3 text-foreground">
            {result.student_name && (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{result.student_name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{result.roll_number}</p>
                </div>
                {result.status && (
                  <BookingStatusBadge
                    status={result.status}
                    consumed={Boolean(result.consumed_at || result.result === 'valid')}
                  />
                )}
              </div>
            )}

            <div className="grid gap-1 border-t border-border/60 pt-2 text-[11px]">
              {result.mess_name && (
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Mess</span>
                  <span className="font-semibold">{result.mess_name}</span>
                </p>
              )}
              {result.meal_title && (
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Meal</span>
                  <span className="text-right font-semibold">
                    {result.meal_title}
                    {result.meal_category && (
                      <span className="ml-1 font-normal text-muted-foreground">
                        · {CATEGORY_META[result.meal_category].label}
                      </span>
                    )}
                  </span>
                </p>
              )}
              {result.meal_date && (
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-semibold">{formatMealDate(result.meal_date)}</span>
                </p>
              )}
              {(result.scanned_at || result.consumed_at) && (
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Scanned</span>
                  <span className="font-semibold">
                    {formatDateTime(result.scanned_at ?? result.consumed_at!)}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-current/10 p-3">
        <Button
          onClick={onNext}
          className="w-full bg-ink text-white hover:bg-ink/90"
          size="sm"
        >
          <ScanLine className="size-3.5" />
          {nextLabel}
        </Button>
      </div>
    </div>
  )
}

export function StaffScannerPage() {
  const [params] = useSearchParams()
  const todayQuery = useStaffMeals('today')
  const upcomingQuery = useStaffMeals('upcoming')
  const scanMutation = useScanBooking()
  const manualMutation = useScanManual()

  const [mode, setMode] = useState<'camera' | 'manual'>('camera')
  const [cameraState, setCameraState] = useState<'idle' | 'starting' | 'running' | 'error'>('idle')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [sessionScans, setSessionScans] = useState<{ id: number; result: ScanResult; at: string }[]>([])
  const [pickedMealId, setPickedMealId] = useState('')
  const [rollNumber, setRollNumber] = useState('')

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const busyRef = useRef(false)
  const lastScanRef = useRef<{ text: string; at: number }>({ text: '', at: 0 })
  const scanCounter = useRef(0)
  const rollInputRef = useRef<HTMLInputElement | null>(null)

  const mealOptions = useMemo(() => {
    const seen = new Set<string>()
    const all = [...(todayQuery.data ?? []), ...(upcomingQuery.data ?? [])]
    return all
      .filter((meal) => {
        if (seen.has(meal.id)) return false
        seen.add(meal.id)
        return true
      })
      .sort((a, b) =>
        a.meal_date === b.meal_date
          ? a.start_time.localeCompare(b.start_time)
          : a.meal_date.localeCompare(b.meal_date),
      )
  }, [todayQuery.data, upcomingQuery.data])

  const todayMeals = useMemo(
    () => mealOptions.filter((meal) => (todayQuery.data ?? []).some((item) => item.id === meal.id)),
    [mealOptions, todayQuery.data],
  )

  // Derive the default meal instead of syncing it with an effect. An explicit
  // pick always wins; otherwise prefer a ?meal= deep link, then today's first
  // meal, then the next upcoming one.
  const requestedMealId = params.get('meal')
  const defaultMeal =
    (requestedMealId ? mealOptions.find((meal) => meal.id === requestedMealId) : undefined) ??
    todayMeals[0] ??
    mealOptions[0]
  const selectedMealId = pickedMealId || defaultMeal?.id || ''

  const pushResult = (next: ScanResult) => {
    setResult(next)
    scanCounter.current += 1
    setSessionScans((current) => [
      { id: scanCounter.current, result: next, at: new Date().toISOString() },
      ...current,
    ].slice(0, 8))
  }

  const handleDecoded = (decodedText: string) => {
    const token = decodedText.trim()
    if (!token || busyRef.current) return

    const now = Date.now()
    if (lastScanRef.current.text === token && now - lastScanRef.current.at < 3000) return
    lastScanRef.current = { text: token, at: now }
    busyRef.current = true

    try {
      scannerRef.current?.pause(true)
    } catch {
      // Camera may already be stopping.
    }

    setResult(null)
    scanMutation.mutate(token, {
      onSuccess: (next) => pushResult(next),
      onError: () => {
        lastScanRef.current = { text: '', at: 0 }
        try {
          scannerRef.current?.resume()
        } catch {
          // Ignore resume errors when the camera stopped.
        }
      },
      onSettled: () => {
        busyRef.current = false
      },
    })
  }

  const startCamera = async () => {
    if (cameraState === 'starting' || cameraState === 'running') return
    setCameraState('starting')
    setCameraError(null)

    try {
      // Load the QR decoder on demand so it stays out of the main bundle for
      // students and admins who never open the scanner.
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode('mm-qr-reader', { verbose: false })
      scannerRef.current = scanner

      await scanner.start(
        // html5-qrcode only accepts a facing mode string or `{ exact }`.
        // Passing `{ ideal: 'environment' }` throws before the camera opens.
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.floor(Math.min(width, height) * 0.68)
            return { width: size, height: size }
          },
          aspectRatio: 1,
        },
        handleDecoded,
        () => {
          // Per-frame decode misses are normal; ignore them.
        },
      )
      setCameraState('running')
    } catch (error) {
      setCameraState('error')
      setCameraError(
        /permission|denied|notallowed/i.test(errorMessage(error))
          ? 'Camera permission was denied. Allow camera access in your browser, then try again.'
          : errorMessage(error),
      )
      const pending = scannerRef.current
      scannerRef.current = null
      try {
        pending?.clear()
      } catch {
        // Ignore cleanup errors.
      }
    }
  }

  const stopCamera = async () => {
    const scanner = scannerRef.current
    scannerRef.current = null
    setCameraState('idle')
    if (!scanner) return
    try {
      await scanner.stop()
    } catch {
      // Camera might already be stopped.
    }
    try {
      scanner.clear()
    } catch {
      // Ignore cleanup errors.
    }
  }

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current
      scannerRef.current = null
      if (!scanner) return
      scanner
        .stop()
        .catch(() => undefined)
        .finally(() => {
          try {
            scanner.clear()
          } catch {
            // Ignore cleanup errors.
          }
        })
    }
  }, [])

  const switchMode = (next: 'camera' | 'manual') => {
    if (next === mode) return
    if (next === 'manual') {
      void stopCamera()
    }
    setResult(null)
    setMode(next)
  }

  const handleManualScan = () => {
    if (!selectedMealId || !rollNumber.trim() || manualMutation.isPending) return
    setResult(null)
    manualMutation.mutate(
      { mealId: selectedMealId, rollNumber: rollNumber.trim() },
      {
        onSuccess: (next) => pushResult(next),
        onError: () => undefined,
      },
    )
  }

  const nextCameraScan = () => {
    setResult(null)
    lastScanRef.current = { text: '', at: 0 }
    busyRef.current = false
    try {
      scannerRef.current?.resume()
    } catch {
      // If the camera stopped, the staff member can start it again.
    }
  }

  const nextManualStudent = () => {
    setResult(null)
    setRollNumber('')
    window.setTimeout(() => rollInputRef.current?.focus(), 50)
  }

  const selectedMeal = mealOptions.find((meal) => meal.id === selectedMealId)
  const scanning = cameraState === 'running'
  const loadingMeals = todayQuery.isLoading || upcomingQuery.isLoading

  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Counter operations"
        title="Meal scanner"
        description="Scan a student meal pass or verify by roll number. Every scan is checked on the server."
        action={
          <Badge variant={scanning ? 'success' : 'muted'}>
            <span className={cn('size-1.5 rounded-full', scanning ? 'bg-success' : 'bg-muted-foreground')} />
            {scanning ? 'Live' : 'Idle'}
          </Badge>
        }
      />

      <SegmentedButtons
        value={mode}
        onChange={switchMode}
        options={[
          { value: 'camera', label: 'Camera', icon: <Camera className="size-3.5" /> },
          { value: 'manual', label: 'Manual roll', icon: <Keyboard className="size-3.5" /> },
        ]}
      />

      {mode === 'camera' ? (
        <section className="space-y-3">
          <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-[1.6rem] border border-border/70 bg-ink shadow-float">
            <div id="mm-qr-reader" className="size-full [&_video]:size-full [&_video]:object-cover" />

            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink px-6 text-center text-white/80">
                <div className="flex size-16 items-center justify-center rounded-3xl bg-white/10 text-white">
                  {cameraState === 'error' ? (
                    <CameraOff className="size-7" />
                  ) : cameraState === 'starting' ? (
                    <LoaderCircle className="size-7 animate-spin" />
                  ) : (
                    <ScanLine className="size-7" />
                  )}
                </div>
                <div>
                  <p className="font-display text-sm font-semibold text-white">
                    {cameraState === 'error'
                      ? 'Camera unavailable'
                      : cameraState === 'starting'
                        ? 'Starting camera…'
                        : 'Point at a meal pass'}
                  </p>
                  <p className="mt-1 max-w-[240px] text-[11px] leading-relaxed text-white/55">
                    {cameraError ??
                      'Use the rear camera. Nothing is saved until the server verifies the pass.'}
                  </p>
                </div>
                {cameraState !== 'starting' && (
                  <Button onClick={startCamera} size="sm" className="bg-white text-ink hover:bg-white/90">
                    <Camera className="size-3.5" />
                    {cameraState === 'error' ? 'Try again' : 'Start camera'}
                  </Button>
                )}
              </div>
            )}

            {scanning && (
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-[16%] rounded-3xl border-2 border-white/70 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]">
                  <span className="absolute left-1/2 top-1/2 h-px w-1/2 -translate-x-1/2 bg-primary" />
                </div>
                <span className="absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-black/55 px-3 py-1 text-[10px] font-medium text-white/85 backdrop-blur">
                  Align the QR inside the frame
                </span>
              </div>
            )}

            {scanMutation.isPending && (
              <div className="absolute inset-x-0 top-3 mx-auto flex w-fit items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[10px] font-medium text-white">
                <LoaderCircle className="size-3 animate-spin" />
                Verifying…
              </div>
            )}
          </div>

          {scanning && (
            <Button variant="outline" size="sm" className="w-full" onClick={() => void stopCamera()}>
              <CameraOff className="size-3.5" />
              Stop camera
            </Button>
          )}

          {result ? (
            <ScanResultCard result={result} onNext={nextCameraScan} nextLabel="Scan next student" />
          ) : (
            <div className="flex items-start gap-2 rounded-2xl bg-muted/70 p-3 text-[11px] leading-relaxed text-muted-foreground">
              <ScanLine className="mt-0.5 size-3.5 shrink-0 text-secondary" />
              Camera scanning pauses automatically after a successful decode. Tap “Scan next
              student” to continue, or switch to manual roll lookup if the pass will not scan.
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-3">
          <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-card">
            <div>
              <p className="text-xs font-semibold">Verify by roll number</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Use this fallback when a student cannot show a scannable pass.
              </p>
            </div>

            {loadingMeals ? (
              <div className="h-11 animate-pulse rounded-xl bg-muted" />
            ) : mealOptions.length === 0 ? (
              <p className="rounded-xl bg-muted/70 p-3 text-[11px] text-muted-foreground">
                No published meals are available for your mess yet.
              </p>
            ) : (
              <>
                <Select value={selectedMealId} onValueChange={setPickedMealId}>
                  <SelectTrigger aria-label="Choose a meal">
                    <SelectValue placeholder="Choose a meal" />
                  </SelectTrigger>
                  <SelectContent>
                    {mealOptions.map((meal) => (
                      <SelectItem key={meal.id} value={meal.id}>
                        {CATEGORY_META[meal.category].label} · {meal.title} ·{' '}
                        {formatMealDate(meal.meal_date, 'd MMM')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedMeal && (
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/60 px-3 py-2 text-[10px]">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Clock3 className="size-3" />
                      {formatMealDate(selectedMeal.meal_date)} ·{' '}
                      {formatTimeRange(selectedMeal.start_time, selectedMeal.end_time)}
                    </span>
                    <span className="font-semibold">{selectedMeal.mess?.name}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    ref={rollInputRef}
                    value={rollNumber}
                    onChange={(event) => setRollNumber(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        handleManualScan()
                      }
                    }}
                    placeholder="Student roll number"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-label="Student roll number"
                  />
                  <Button
                    onClick={handleManualScan}
                    disabled={!selectedMealId || !rollNumber.trim() || manualMutation.isPending}
                  >
                    {manualMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <ScanLine className="size-4" />
                    )}
                    Verify
                  </Button>
                </div>
              </>
            )}
          </div>

          {result ? (
            <ScanResultCard result={result} onNext={nextManualStudent} nextLabel="Next student" />
          ) : (
            <div className="flex items-start gap-2 rounded-2xl bg-muted/70 p-3 text-[11px] leading-relaxed text-muted-foreground">
              <Keyboard className="mt-0.5 size-3.5 shrink-0 text-secondary" />
              Manual verification only works for students currently in the selected meal&apos;s mess.
              Opt-outs, duplicates and wrong-mess attempts are rejected by the server.
            </div>
          )}
        </section>
      )}

      {sessionScans.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold">This session</p>
            <span className="text-[10px] text-muted-foreground">{sessionScans.length} scans</span>
          </div>
          <div className="space-y-1.5">
            {sessionScans.map((entry) => {
              const meta = RESULT_META[entry.result.result] ?? RESULT_META.invalid
              const Icon = meta.icon
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card px-3 py-2"
                >
                  <Icon className={cn('size-3.5 shrink-0', meta.tone.split(' ').at(-1))} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold">
                      {entry.result.student_name ?? meta.title}
                      {entry.result.roll_number ? ` · ${entry.result.roll_number}` : ''}
                    </p>
                    <p className="truncate text-[9px] text-muted-foreground">
                      {meta.title}
                      {entry.result.meal_title ? ` · ${entry.result.meal_title}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-[9px] text-muted-foreground">
                    {formatDateTime(entry.at, 'h:mm:ss a')}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {todayMeals.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-card px-3.5 py-3 text-[11px] shadow-card">
          <span className="text-muted-foreground">Today&apos;s service</span>
          <span className="font-semibold">
            {todayMeals.map((meal: StaffMealListItem) => CATEGORY_META[meal.category].label).join(' · ')}
          </span>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-2xl border border-border/70 bg-card p-3 text-[11px] leading-relaxed text-muted-foreground shadow-card">
        <ScanLine className="mt-0.5 size-3.5 shrink-0 text-secondary" />
        <p>
          Single-use, server-verified passes. QR codes contain only a random token; the database
          checks the mess, booking status and duplicate scans before marking a meal consumed.
        </p>
      </div>
    </div>
  )
}
