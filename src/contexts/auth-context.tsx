import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase, authRedirectUrl } from '@/lib/supabase'
import { AuthContext, type AuthContextValue } from '@/contexts/auth'
import type { MyContext } from '@/types/app'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [initializing, setInitializing] = useState(true)
  const queryClient = useQueryClient()

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setInitializing(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setInitializing(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const meQuery = useQuery({
    queryKey: ['me', session?.user.id],
    enabled: Boolean(session),
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_context')
      if (error) throw error
      return data as unknown as MyContext | null
    },
  })

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: authRedirectUrl,
        queryParams: {
          hd: 'iiita.ac.in',
          prompt: 'select_account',
        },
      },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    queryClient.clear()
  }, [queryClient])

  const refreshMe = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['me'] })
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      me: meQuery.data ?? null,
      role: meQuery.data?.profile.role ?? null,
      loading: initializing || (Boolean(session) && meQuery.isLoading),
      meError: meQuery.error instanceof Error ? meQuery.error : null,
      signInWithGoogle,
      signOut,
      refreshMe,
    }),
    [session, meQuery.data, meQuery.isLoading, meQuery.error, initializing, signInWithGoogle, signOut, refreshMe],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
