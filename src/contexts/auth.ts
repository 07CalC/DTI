import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { MyContext, UserRole } from '@/types/app'

export interface AuthContextValue {
  session: Session | null
  me: MyContext | null
  role: UserRole | null
  loading: boolean
  meError: Error | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshMe: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

export function roleHome(role: UserRole | null | undefined) {
  if (role === 'staff') return '/staff/dashboard'
  if (role === 'admin') return '/admin/overview'
  if (role === 'student') return '/student/home'
  return '/login'
}
