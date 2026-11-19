import type { Database } from '@/types/database'

export type UserRole = Database['public']['Enums']['user_role']
export type BookingStatus = Database['public']['Enums']['booking_status']
export type BookingActionSource = Database['public']['Enums']['booking_action_source']
export type MealCategory = Database['public']['Enums']['meal_category']

export interface MessSummary {
  id: string
  name: string
  is_active: boolean
}

export interface StudentContext {
  id: string
  roll_number: string
  mess_id: string
  default_booking_preference: BookingStatus
  mess: MessSummary
}

export interface MyContext {
  profile: {
    id: string
    name: string
    email: string
    role: UserRole
    is_active: boolean
  }
  student: StudentContext | null
  staff_messes: MessSummary[]
}

export interface MenuItem {
  id: string
  name: string
  description: string | null
  sort_order: number
}

export interface BookingSummary {
  id: string
  status: BookingStatus
  consumed_at: string | null
  initial_status: BookingStatus
  created_at: string
  updated_at: string
}

export interface MealForStudent {
  id: string
  mess_id: string
  category: MealCategory
  title: string
  description: string | null
  meal_date: string
  start_time: string
  end_time: string
  booking_cutoff_at: string
  mess: { id: string; name: string } | null
  menu_items: MenuItem[]
  meal_bookings: BookingSummary[]
}

export interface MealRecord {
  id: string
  mess_id: string
  category: MealCategory
  title: string
  description: string | null
  meal_date: string
  start_time: string
  end_time: string
  booking_cutoff_at: string
  created_at: string
  updated_at: string
  mess: { id: string; name: string } | null
  menu_items: MenuItem[]
}

export interface BookingHistoryItem {
  id: string
  status: BookingStatus
  initial_status: BookingStatus
  consumed_at: string | null
  created_at: string
  updated_at: string
  meal: {
    id: string
    title: string
    category: MealCategory
    meal_date: string
    start_time: string
    end_time: string
    booking_cutoff_at: string
    mess: { name: string } | null
    menu_items: MenuItem[]
  }
  booking_events: {
    id: number
    previous_status: BookingStatus | null
    new_status: BookingStatus
    action_source: BookingActionSource
    created_at: string
  }[]
}

export interface StudentDirectoryItem {
  id: string
  roll_number: string
  mess_id: string
  default_booking_preference: BookingStatus
  created_at: string
  profile: {
    id: string
    name: string
    email: string
    is_active: boolean
  }
  mess: { id: string; name: string } | null
}

export interface ParticipationBooking {
  id: string
  status: BookingStatus
  initial_status: BookingStatus
  consumed_at: string | null
  created_at: string
  updated_at: string
  student: {
    id: string
    roll_number: string
    default_booking_preference: BookingStatus
    profile: { id: string; name: string; email: string }
    mess: { id: string; name: string } | null
  }
}

export interface StaffMember {
  id: string
  name: string
  email: string
  role: UserRole
  is_active: boolean
  created_at: string
  staff_assignments: {
    id: string
    mess_id: string
    mess: { id: string; name: string } | null
  }[]
}

export interface MessDetail {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  students: { id: string }[]
  staff_assignments: { id: string }[]
  meals: { id: string }[]
}

export interface MealPass {
  booking_id: string
  status: BookingStatus
  consumed_at: string | null
  token: string | null
  student: { name: string; roll_number: string }
  meal: {
    id: string
    title: string
    category: MealCategory
    meal_date: string
    start_time: string
    end_time: string
    booking_cutoff_at: string
    mess_name: string
  }
}

export type ScanResultCode =
  | 'valid'
  | 'already_scanned'
  | 'opted_out'
  | 'invalid'
  | 'forbidden'
  | 'not_booked'

export interface ScanResult {
  result: ScanResultCode
  message?: string
  student_name?: string
  roll_number?: string
  mess_name?: string
  meal_title?: string
  meal_category?: MealCategory
  meal_date?: string
  status?: BookingStatus
  consumed_at?: string
  scanned_at?: string
}

export interface ReportRow {
  booking_id: string
  student_id: string
  student_name: string
  roll_number: string
  mess_id: string
  mess_name: string
  meal_id: string
  meal_date: string
  meal_category: MealCategory
  meal_title: string
  menu: string
  status: BookingStatus
  initial_status: BookingStatus
  opt_in_at: string | null
  opt_out_at: string | null
  consumed_at: string | null
  scanned_at: string | null
  events: {
    previous_status: BookingStatus | null
    new_status: BookingStatus
    action_source: BookingActionSource
    created_at: string
  }[]
}

export interface ImportRecord {
  name: string
  roll_number: string
  email: string
  mess: string
}

export interface ImportResult {
  inserted: number
  failed: number
  total: number
  results: {
    row: number
    status: 'imported' | 'failed'
    email: string
    roll_number: string
    error?: string
  }[]
}
