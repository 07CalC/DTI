import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { useAuth, roleHome } from '@/contexts/auth'
import { Button } from '@/components/ui/button'

export function AuthCallbackPage() {
  const { session, me, loading } = useAuth()
  const [params] = useSearchParams()
  const [timedOut, setTimedOut] = useState(false)
  const error = params.get('error_description') ?? params.get('error')

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), 12_000)
    return () => window.clearTimeout(timer)
  }, [])

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-8 text-center">
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
          <p className="font-display font-semibold text-destructive">Sign-in could not be completed</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{error}</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/login">Back to sign in</Link>
        </Button>
      </div>
    )
  }

  if (!loading) {
    if (session && me?.profile.is_active) {
      return <Navigate to={roleHome(me.profile.role)} replace />
    }
    if (session && (!me || !me.profile.is_active)) {
      return <Navigate to="/access-denied" replace />
    }
    if (timedOut) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-8 text-center">
          <p className="font-display font-semibold">Sign-in took too long</p>
          <p className="text-sm text-muted-foreground">
            Your session was not established. Please return and try again.
          </p>
          <Button asChild variant="outline">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      )
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <LoaderCircle className="size-5 animate-spin" />
      </div>
      <p className="font-display text-sm font-semibold">Verifying your institute account…</p>
      <p className="max-w-[260px] text-center text-xs leading-relaxed text-muted-foreground">
        Checking that your account is active and provisioned for a mess.
      </p>
    </div>
  )
}
