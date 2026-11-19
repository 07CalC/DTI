import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, LoaderCircle, ShieldCheck, Sparkles, UtensilsCrossed } from 'lucide-react'
import { useAuth, roleHome } from '@/contexts/auth'
import { GoogleIcon } from '@/components/auth/google-icon'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/utils'

export function LoginPage() {
  const { session, me, loading, signInWithGoogle } = useAuth()
  const [params] = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(
    params.get('error_description') ?? params.get('error') ?? null,
  )

  if (!loading && session) {
    if (me?.profile.is_active) return <Navigate to={roleHome(me.profile.role)} replace />
    if (!me?.profile.is_active) return <Navigate to="/access-denied" replace />
  }

  const handleSignIn = async () => {
    setBusy(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch (signInError) {
      setError(errorMessage(signInError))
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#faf7f2] bg-grain">
      <div className="pointer-events-none absolute -right-24 -top-32 size-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 size-80 rounded-full bg-secondary/10 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-[440px] flex-1 flex-col px-6 pt-safe">
        <div className="flex items-center gap-2 pt-8">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <UtensilsCrossed className="size-4" />
          </div>
          <div>
            <p className="font-display text-base font-semibold leading-none">MessMate</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              IIIT Allahabad
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center py-12">
          <div className="mb-9">
            <div className="mb-6 flex size-16 items-center justify-center rounded-3xl bg-primary/10 text-primary ring-1 ring-primary/10">
              <Sparkles className="size-7" strokeWidth={1.7} />
            </div>
            <h1 className="max-w-[300px] font-display text-[2.15rem] font-semibold leading-[1.12] tracking-tight">
              Your mess, sorted before you&apos;re hungry.
            </h1>
            <p className="mt-4 max-w-[310px] text-[15px] leading-relaxed text-muted-foreground">
              Book meals, carry a secure meal pass, and see exactly what&apos;s cooking at your mess.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Live menus', emoji: '🍛' },
              { label: 'Meal passes', emoji: '▦' },
              { label: 'Rebate-ready', emoji: '✓' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-border/70 bg-card/80 px-3 py-3 text-center shadow-card backdrop-blur"
              >
                <p className="text-lg">{item.emoji}</p>
                <p className="mt-1 text-[10px] font-semibold text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="pb-8">
          {error && (
            <div className="mb-4 flex gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          <Button
            size="lg"
            className="h-13 w-full rounded-2xl bg-ink text-white shadow-float hover:bg-ink/90"
            onClick={handleSignIn}
            disabled={busy}
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <GoogleIcon className="size-4" />}
            {busy ? 'Opening Google…' : 'Continue with Google'}
          </Button>

          <div className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-secondary" />
            <p>
              Only <span className="font-semibold text-foreground">@iiita.ac.in</span> Google accounts
              provisioned by a mess administrator can sign in. No passwords, no public sign-ups.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
