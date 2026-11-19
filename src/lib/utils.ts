import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import type { BookingStatus, MealCategory, MealForStudent, MealRecord } from '@/types/app'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const IST = 'Asia/Kolkata'

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function formatMealDate(date: string, pattern = 'EEE, d MMM') {
  return formatInTimeZone(new Date(`${date}T12:00:00+05:30`), IST, pattern)
}

export function formatMealDateLong(date: string) {
  return formatInTimeZone(new Date(`${date}T12:00:00+05:30`), IST, 'EEEE, d MMMM')
}

export function formatTime(value: string) {
  const [hoursRaw, minutesRaw] = value.split(':')
  const hours = Number(hoursRaw)
  const minutes = minutesRaw ?? '00'
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const display = hours % 12 || 12
  return `${display}:${minutes.slice(0, 2)} ${suffix}`
}

export function formatTimeRange(start: string, end: string) {
  return `${formatTime(start)} – ${formatTime(end)}`
}

export function formatDateTime(value: string, pattern = 'd MMM, h:mm a') {
  return formatInTimeZone(new Date(value), IST, pattern)
}

export function formatDateTimeCompact(value: string) {
  return formatInTimeZone(new Date(value), IST, 'd MMM, h:mm a')
}

export function todayIST(date = new Date()) {
  return formatInTimeZone(date, IST, 'yyyy-MM-dd')
}

export function addDaysToIST(days: number, date = new Date()) {
  const shifted = new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
  return todayIST(shifted)
}

/** ISO weekday in IST: 1 = Monday … 7 = Sunday. */
export function weekdayIST(date = new Date()) {
  return Number(formatInTimeZone(date, IST, 'i'))
}

export function relativeDayLabel(date: string) {
  const today = todayIST()
  if (date === today) return 'Today'
  if (date === addDaysToIST(1)) return 'Tomorrow'
  if (date === addDaysToIST(-1)) return 'Yesterday'
  return formatMealDate(date, 'EEEE')
}

export function serviceStart(mealDate: string, startTime: string) {
  return fromZonedTime(`${mealDate}T${startTime}`, IST)
}

export function serviceEnd(mealDate: string, endTime: string) {
  return fromZonedTime(`${mealDate}T${endTime}`, IST)
}

export function cutoffDate(cutoffAt: string) {
  return new Date(cutoffAt)
}

export function isCutoffPassed(cutoffAt: string) {
  return Date.now() >= new Date(cutoffAt).getTime()
}

export function isMealPast(meal: Pick<MealForStudent | MealRecord, 'meal_date' | 'end_time'>) {
  return serviceEnd(meal.meal_date, meal.end_time).getTime() < Date.now()
}

export function formatCountdown(ms: number) {
  if (ms <= 0) return 'Closed'
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return '< 1 min'
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

export function cutoffLabel(cutoffAt: string) {
  const ms = new Date(cutoffAt).getTime() - Date.now()
  if (ms <= 0) return 'Booking closed'
  return `Closes in ${formatCountdown(ms)}`
}

export function toDateTimeLocalValue(iso: string) {
  return formatInTimeZone(new Date(iso), IST, "yyyy-MM-dd'T'HH:mm")
}

export function fromDateTimeLocalValue(value: string) {
  return fromZonedTime(value, IST).toISOString()
}

export function toISODate(value: string) {
  return value.slice(0, 10)
}

export function mealStatusLabel(status: BookingStatus | undefined | null) {
  return status === 'opted_out' ? 'Opted out' : 'Opted in'
}

export interface CategoryMeta {
  label: string
  shortLabel: string
  defaultStart: string
  defaultEnd: string
  defaultCutoff: string
  tone: string
}

export const CATEGORY_META: Record<MealCategory, CategoryMeta> = {
  breakfast: {
    label: 'Breakfast',
    shortLabel: 'Breakfast',
    defaultStart: '07:30',
    defaultEnd: '09:00',
    defaultCutoff: '06:30',
    tone: 'bg-amber-100 text-amber-800',
  },
  lunch: {
    label: 'Lunch',
    shortLabel: 'Lunch',
    defaultStart: '12:30',
    defaultEnd: '14:00',
    defaultCutoff: '11:00',
    tone: 'bg-orange-100 text-orange-800',
  },
  snacks: {
    label: 'Snacks',
    shortLabel: 'Snacks',
    defaultStart: '17:00',
    defaultEnd: '18:00',
    defaultCutoff: '15:30',
    tone: 'bg-rose-100 text-rose-800',
  },
  dinner: {
    label: 'Dinner',
    shortLabel: 'Dinner',
    defaultStart: '19:30',
    defaultEnd: '21:00',
    defaultCutoff: '18:00',
    tone: 'bg-emerald-100 text-emerald-800',
  },
}

export const CATEGORY_ORDER: MealCategory[] = ['breakfast', 'lunch', 'snacks', 'dinner']

export const WEEKDAYS = [
  { value: 1, label: 'Monday', shortLabel: 'Mon' },
  { value: 2, label: 'Tuesday', shortLabel: 'Tue' },
  { value: 3, label: 'Wednesday', shortLabel: 'Wed' },
  { value: 4, label: 'Thursday', shortLabel: 'Thu' },
  { value: 5, label: 'Friday', shortLabel: 'Fri' },
  { value: 6, label: 'Saturday', shortLabel: 'Sat' },
  { value: 7, label: 'Sunday', shortLabel: 'Sun' },
] as const

export function defaultCutoffOffset(category: MealCategory) {
  const meta = CATEGORY_META[category]
  const [startHour, startMinute] = meta.defaultStart.split(':').map(Number)
  const [cutoffHour, cutoffMinute] = meta.defaultCutoff.split(':').map(Number)
  return Math.max(0, startHour * 60 + startMinute - (cutoffHour * 60 + cutoffMinute))
}

export function formatCutoffHours(minutes: number) {
  const hours = minutes / 60
  const value = Number.isInteger(hours)
    ? String(hours)
    : hours.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
  return `${value} ${hours === 1 ? 'hour' : 'hours'}`
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

export function greeting(date = new Date()) {
  const hour = Number(formatInTimeZone(date, IST, 'H'))
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function truncate(value: string, length: number) {
  if (value.length <= length) return value
  return `${value.slice(0, length)}…`
}

export function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Something went wrong'
}
