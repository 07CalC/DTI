import { Link, useNavigate } from 'react-router-dom'
import { Building2, LogOut, MailQuestion } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth'
import { Button } from '@/components/ui/button'

export function AccessDeniedPage() {
  const { session, me, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out')
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background bg-grain px-6 pt-safe">
      <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-warning-soft text-warning">
          <Building2 className="size-6" strokeWidth={1.8} />
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Access not available</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {me && !me.profile.is_active
            ? 'This account has been deactivated. Contact the mess committee if you think this is a mistake.'
            : 'Your Google account is not linked to a provisioned MessMate profile yet. Only students and staff added by a mess administrator can use the app.'}
        </p>

        <div className="mt-6 rounded-2xl border border-border/70 bg-card p-4 shadow-card">
          <div className="flex items-start gap-3">
            <MailQuestion className="mt-0.5 size-4 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">Signed in as</p>
              <p className="mt-1 truncate text-sm font-medium">
                {me?.profile.email ?? session?.user.email ?? 'No active session'}
              </p>
              {me && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Status: {me.profile.is_active ? 'Active' : 'Deactivated'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-muted/70 p-4 text-xs leading-relaxed text-muted-foreground">
          Ask the mess administrator to add your <span className="font-semibold text-foreground">@iiita.ac.in</span>{' '}
          email and assign you to a mess. Once added, sign in again with Google.
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={handleSignOut} className="w-full">
            <LogOut className="size-4" />
            Sign out & try another account
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
