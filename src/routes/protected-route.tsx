import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { useAuth, roleHome } from '@/contexts/auth'
import type { UserRole } from '@/types/app'

export function FullScreenLoader({ label = 'Loading MessMate' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <LoaderCircle className="size-5 animate-spin" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

export function ProtectedRoute({ allowed }: { allowed: UserRole[] }) {
  const { session, me, loading, meError } = useAuth()
  const location = useLocation()

  if (loading) return <FullScreenLoader />

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (meError) {
    return <Navigate to="/access-denied" replace />
  }

  if (!me || !me.profile.is_active) {
    return <Navigate to="/access-denied" replace />
  }

  if (!allowed.includes(me.profile.role)) {
    return <Navigate to={roleHome(me.profile.role)} replace />
  }

  return <Outlet />
}
