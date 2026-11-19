import { useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  CalendarCheck2,
  LogOut,
  Mail,
  ShieldCheck,
  University,
  UtensilsCrossed,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth'
import { useUpdatePreference } from '@/hooks/use-meals'
import { initials } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { PageIntro } from '@/components/common/section-header'

export function StudentProfilePage() {
  const { me, signOut } = useAuth()
  const navigate = useNavigate()
  const preferenceMutation = useUpdatePreference()
  const preference = me?.student?.default_booking_preference ?? 'opted_in'
  const optInByDefault = preference === 'opted_in'

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out')
    navigate('/login', { replace: true })
  }

  return (
    <div className="space-y-5">
      <PageIntro eyebrow="Account" title="Profile" />

      <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-card">
        <Avatar className="size-16 border border-border">
          <AvatarFallback className="text-lg">{initials(me?.profile.name ?? 'Student')}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold">{me?.profile.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{me?.profile.email}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="success">
              <BadgeCheck />
              Active
            </Badge>
            <Badge variant="secondary" className="capitalize">
              {me?.profile.role}
            </Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-muted">
              <University className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                Roll number
              </p>
              <p className="mt-0.5 text-sm font-semibold">{me?.student?.roll_number}</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-muted">
              <UtensilsCrossed className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                Assigned mess
              </p>
              <p className="mt-0.5 text-sm font-semibold">{me?.student?.mess.name}</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-muted">
              <Mail className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                Institute email
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold">{me?.profile.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarCheck2 className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Default booking preference</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {optInByDefault ? 'You are opted in' : 'You are opted out'} for newly scheduled
                    meals.
                  </p>
                </div>
                <Switch
                  checked={optInByDefault}
                  disabled={preferenceMutation.isPending}
                  onCheckedChange={(checked) =>
                    preferenceMutation.mutate(checked ? 'opted_in' : 'opted_out')
                  }
                  aria-label="Opt in by default"
                />
              </div>
              <div className="mt-3 rounded-xl bg-muted/70 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                Changing this affects <span className="font-semibold text-foreground">future</span>{' '}
                meals only. Existing bookings stay exactly as they are — override individual meals
                from the meal card before the cutoff.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-card">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-secondary" />
          <div>
            <p className="text-sm font-semibold">Google-only, admin-provisioned access</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              MessMate never stores a password. Only provisioned @iiita.ac.in Google accounts can
              access this mess. Ask the mess committee to change your mess assignment.
            </p>
          </div>
        </div>
      </div>

      <Button variant="outline" className="w-full text-destructive" onClick={handleSignOut}>
        <LogOut className="size-4" />
        Sign out
      </Button>

      <p className="pb-2 text-center text-[10px] text-muted-foreground">MessMate · IIIT Allahabad</p>
    </div>
  )
}
