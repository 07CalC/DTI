import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ChevronRight, LogOut, Menu, ShieldCheck, UtensilsCrossed } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth'
import { cn, initials } from '@/lib/utils'
import type { UserRole } from '@/types/app'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import {
  DRAWER_EXTRAS,
  navForRole,
  titleForPath,
} from '@/components/navigation/nav-config'

export function AppLayout({ role }: { role: UserRole }) {
  const { me, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const nav = navForRole(role)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  const title = titleForPath(location.pathname, role)
  const isActive = (to: string) => {
    if (to === '/student/home') return location.pathname === to
    return location.pathname === to || location.pathname.startsWith(`${to}/`)
  }

  const handleSignOut = async () => {
    await signOut()
    queryClient.clear()
    navigate('/login', { replace: true })
    toast.success('Signed out')
  }

  const extras = DRAWER_EXTRAS[role].filter((item) => !nav.some((navItem) => navItem.to === item.to))
  const messLabel =
    role === 'student'
      ? me?.student?.mess.name
      : role === 'staff'
        ? me?.staff_messes.map((mess) => mess.name).join(' · ') || 'No mess assigned'
        : 'All messes'

  return (
    <div className="min-h-dvh bg-[#ece4d8] bg-grain">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-background shadow-[0_0_60px_rgba(66,45,25,0.16)]">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-background/90 px-3 pt-safe backdrop-blur-xl">
          <Button variant="ghost" size="icon-sm" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
          <h1 className="font-display text-[15px] font-semibold tracking-tight">{title}</h1>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-full outline-none ring-primary/30 focus-visible:ring-2"
            aria-label="Open account menu"
          >
            <Avatar className="size-8 border border-border">
              <AvatarFallback className="text-xs">{initials(me?.profile.name ?? 'MM')}</AvatarFallback>
            </Avatar>
          </button>
        </header>

        <main className="flex-1 px-4 pb-28 pt-4">
          <Outlet />
        </main>

        <div className="pointer-events-none fixed bottom-0 left-1/2 z-30 w-full max-w-[440px] -translate-x-1/2 bg-gradient-to-t from-background via-background/95 to-transparent pb-safe pt-3">
          <nav className="pointer-events-auto mx-3 mb-2 flex items-center justify-around rounded-2xl border border-border/70 bg-card/95 px-1 py-1.5 shadow-float backdrop-blur-xl">
            {nav.map((item) => {
              const Icon = item.icon
              const active = isActive(item.to)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-8 items-center justify-center rounded-xl transition-all',
                      active ? 'bg-primary/10' : 'bg-transparent',
                    )}
                  >
                    <Icon className="size-[18px]" strokeWidth={active ? 2.4 : 2} />
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="gap-0 p-0">
            <SheetTitle className="sr-only">MessMate navigation</SheetTitle>
            <div className="border-b border-border/60 p-5 pb-4">
              <div className="mb-5 flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <UtensilsCrossed className="size-4" />
                </div>
                <div>
                  <p className="font-display text-base font-semibold leading-none">MessMate</p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    IIIT Allahabad
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Avatar className="size-11 border border-border">
                  <AvatarFallback>{initials(me?.profile.name ?? 'MM')}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{me?.profile.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{me?.profile.email}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="capitalize">
                  {role}
                </Badge>
                <Badge variant="muted">{messLabel}</Badge>
                {me?.student && <Badge variant="outline">{me.student.roll_number}</Badge>}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Navigate
              </p>
              <div className="space-y-0.5">
                {[...nav, ...extras].map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.to)
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setDrawerOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                        active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted',
                      )}
                    >
                      <Icon className="size-4" />
                      <span className="flex-1">{item.label}</span>
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    </Link>
                  )
                })}
              </div>

              <p className="px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Account
              </p>
              <div className="space-y-0.5">
                {role === 'student' && (
                  <Link
                    to="/student/profile"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted"
                  >
                    <ShieldCheck className="size-4" />
                    Preferences & privacy
                    <ChevronRight className="ml-auto size-3.5 text-muted-foreground" />
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-destructive/5"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </div>
            </div>

            <div className="border-t border-border/60 p-5">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                MessMate is a student mess utility prototype for IIIT Allahabad. Bookings close at
                each meal&apos;s cutoff time.
              </p>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
