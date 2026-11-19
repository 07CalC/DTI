interface BookingLike {
  status: 'opted_in' | 'opted_out'
  consumed_at: string | null
}

export function getMealCounts(meal: { meal_bookings: BookingLike[] }, totalStudents: number) {
  const optedIn = meal.meal_bookings.filter((booking) => booking.status === 'opted_in').length
  const optedOut = meal.meal_bookings.filter((booking) => booking.status === 'opted_out').length
  const scanned = meal.meal_bookings.filter((booking) => booking.consumed_at).length
  const pending = Math.max(0, optedIn - scanned)
  return {
    total: totalStudents || meal.meal_bookings.length,
    optedIn,
    optedOut,
    scanned,
    pending,
    rate: optedIn > 0 ? Math.round((scanned / optedIn) * 100) : 0,
  }
}
