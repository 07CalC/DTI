import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  ShieldCheck,
  Store,
  UsersRound,
  UtensilsCrossed,
} from 'lucide-react'
import { useAdminOverview } from '@/hooks/use-admin'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ErrorState } from '@/components/common/error-state'
import { PageIntro, SectionHeader } from '@/components/common/section-header'
import { StatCard } from '@/components/common/stat-card'

function percent(value: number, total: number) {
  if (total <= 0) return 0
  return Math.round((value / total) * 100)
}

export function AdminOverviewPage() {
  const query = useAdminOverview()
  const data = query.data

  if (query.isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-16 animate-pulse rounded-2xl bg-muted" />
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (query.isError || !data) {
    return (
      <ErrorState
        title="Overview could not load"
        message="We couldn't fetch the campus-wide mess summary."
        onRetry={() => query.refetch()}
      />
    )
  }

  const participation = percent(data.optedInToday, data.todayBookings)
  const served = percent(data.consumedToday, data.optedInToday)

  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Campus administration"
        title="Overview"
        description="All messes, accounts and today's meal operations at a glance."
        action={
          <Button asChild size="icon" className="shrink-0 rounded-2xl">
            <Link to="/admin/reports" aria-label="Open reports">
              <ClipboardList className="size-5" />
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          icon={UsersRound}
          label="Students"
          value={data.totalStudents}
          hint={`${data.activeStudents} active`}
          tone="primary"
        />
        <StatCard
          icon={Store}
          label="Messes"
          value={data.totalMesses}
          hint={`${data.activeMesses} active`}
          tone="success"
        />
        <StatCard
          icon={ShieldCheck}
          label="Staff accounts"
          value={data.totalStaff}
          hint="Counter & mess operations"
          tone="default"
        />
        <StatCard
          icon={CalendarDays}
          label="Meals today"
          value={data.todayMeals}
          hint={`${data.todayBookings} bookings`}
          tone="warning"
        />
      </div>

      <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-card">
        <SectionHeader
          title="Today's participation"
          description="Across every active mess"
          className="mb-3"
        />
        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded-xl bg-muted/70 py-2.5 text-center">
            <p className="text-lg font-semibold tabular">{data.todayBookings}</p>
            <p className="text-[9px] text-muted-foreground">Bookings</p>
          </div>
          <div className="rounded-xl bg-success-soft py-2.5 text-center text-success">
            <p className="text-lg font-semibold tabular">{data.optedInToday}</p>
            <p className="text-[9px]">Opted in</p>
          </div>
          <div className="rounded-xl bg-warning-soft py-2.5 text-center text-warning">
            <p className="text-lg font-semibold tabular">{data.consumedToday}</p>
            <p className="text-[9px]">Consumed</p>
          </div>
        </div>

        <div className="mt-3 space-y-2.5">
          <div>
            <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Opt-in share of today&apos;s bookings</span>
              <span className="tabular">{participation}%</span>
            </div>
            <Progress value={participation} />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Served among opted-in students</span>
              <span className="tabular">{served}%</span>
            </div>
            <Progress value={served} indicatorClassName="bg-success" />
          </div>
        </div>
      </section>

      <section>
        <SectionHeader
          title="Mess breakdown"
          description="Today's activity by mess"
          action={
            <Link
              to="/admin/messes"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary"
            >
              Manage <ArrowRight className="size-3" />
            </Link>
          }
        />
        <div className="space-y-2.5">
          {data.messSummaries.map((mess) => {
            const messParticipation = percent(mess.optedIn, mess.optedIn + mess.optedOut)
            return (
              <Link
                key={mess.id}
                to={`/admin/messes/${mess.id}`}
                className="block rounded-2xl border border-border/70 bg-card p-4 shadow-card transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold">{mess.name}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {mess.students} students · {mess.meals} meals today
                    </p>
                  </div>
                  <Badge variant={messParticipation >= 70 ? 'success' : messParticipation > 0 ? 'warning' : 'muted'}>
                    {messParticipation}% opted in
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                  <div className="rounded-lg bg-muted/70 py-1.5">
                    <p className="text-sm font-semibold tabular">{mess.optedIn}</p>
                    <p className="text-[9px] text-muted-foreground">In</p>
                  </div>
                  <div className="rounded-lg bg-muted/70 py-1.5">
                    <p className="text-sm font-semibold tabular">{mess.optedOut}</p>
                    <p className="text-[9px] text-muted-foreground">Out</p>
                  </div>
                  <div className="rounded-lg bg-success-soft py-1.5 text-success">
                    <p className="text-sm font-semibold tabular">{mess.consumed}</p>
                    <p className="text-[9px]">Served</p>
                  </div>
                </div>

                {mess.meals > 0 && (
                  <div className="mt-2.5">
                    <Progress
                      value={percent(mess.consumed, Math.max(1, mess.optedIn))}
                      indicatorClassName={cn('bg-success')}
                    />
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/admin/import"
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/70 bg-card py-3.5 text-center shadow-card"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <FileSpreadsheet className="size-4" />
          </span>
          <span className="text-[10px] font-semibold">Bulk import</span>
        </Link>
        <Link
          to="/admin/reports"
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/70 bg-card py-3.5 text-center shadow-card"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UtensilsCrossed className="size-4" />
          </span>
          <span className="text-[10px] font-semibold">Rebate report</span>
        </Link>
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl bg-muted/70 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-secondary" />
        Accounts are provisioned by email and link to Google on first sign-in. Roles and mess access
        are enforced by database policies, not just the interface.
      </div>
    </div>
  )
}
