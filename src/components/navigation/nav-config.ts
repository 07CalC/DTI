import {
  CalendarDays,
  History,
  Home,
  LayoutDashboard,
  QrCode,
  ScanLine,
  School,
  Store,
  UserRound,
  UsersRound,
  UtensilsCrossed,
  FileSpreadsheet,
  ClipboardList,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { UserRole } from '@/types/app'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
}

export const STUDENT_NAV: NavItem[] = [
  { label: 'Home', to: '/student/home', icon: Home },
  { label: 'My Meals', to: '/student/meals', icon: CalendarDays },
  { label: 'History', to: '/student/history', icon: History },
  { label: 'Profile', to: '/student/profile', icon: UserRound },
]

export const STAFF_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/staff/dashboard', icon: LayoutDashboard },
  { label: 'Scanner', to: '/staff/scanner', icon: ScanLine },
  { label: 'Meals', to: '/staff/meals', icon: UtensilsCrossed },
  { label: 'Menu', to: '/staff/menu', icon: CalendarDays },
  { label: 'Students', to: '/staff/students', icon: UsersRound },
]

export const ADMIN_NAV: NavItem[] = [
  { label: 'Overview', to: '/admin/overview', icon: LayoutDashboard },
  { label: 'Messes', to: '/admin/messes', icon: Store },
  { label: 'Students', to: '/admin/students', icon: School },
  { label: 'Staff', to: '/admin/staff', icon: UsersRound },
  { label: 'Reports', to: '/admin/reports', icon: ClipboardList },
]

export const DRAWER_EXTRAS: Record<UserRole, NavItem[]> = {
  student: [
    { label: 'Meal pass', to: '/student/meals', icon: QrCode },
    { label: 'Profile & preferences', to: '/student/profile', icon: UserRound },
  ],
  staff: [
    { label: 'Create a meal', to: '/staff/meals/new', icon: UtensilsCrossed },
    { label: 'QR scanner', to: '/staff/scanner', icon: ScanLine },
  ],
  admin: [
    { label: 'Bulk import', to: '/admin/import', icon: FileSpreadsheet },
    { label: 'Rebate reports', to: '/admin/reports', icon: ClipboardList },
  ],
}

export function navForRole(role: UserRole | null | undefined) {
  if (role === 'staff') return STAFF_NAV
  if (role === 'admin') return ADMIN_NAV
  return STUDENT_NAV
}

export function titleForPath(pathname: string, role: UserRole | null | undefined) {
  const all = [...STUDENT_NAV, ...STAFF_NAV, ...ADMIN_NAV, ...DRAWER_EXTRAS[role ?? 'student']]
  if (pathname === '/admin/import') return 'Bulk import'
  if (pathname.includes('/meals/new')) return 'Create meal'
  if (pathname.includes('/meals/') && pathname.includes('/edit')) return 'Edit meal'
  if (pathname.includes('/meals/') && pathname.includes('/participation')) return 'Participation'
  if (pathname.includes('/meals/')) return 'Meal details'
  if (pathname.includes('/students/')) return 'Student history'
  if (pathname.includes('/messes/')) return 'Mess details'
  if (pathname.includes('/pass/')) return 'Meal pass'
  const exact = all.find((item) => pathname === item.to || (item.to !== '/student/home' && pathname.startsWith(`${item.to}/`)))
  return exact?.label ?? 'MessMate'
}
