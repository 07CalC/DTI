import { Coffee, Cookie, MoonStar, SunMedium, UtensilsCrossed } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MealCategory } from '@/types/app'
import { cn } from '@/lib/utils'

const ICONS: Record<MealCategory, LucideIcon> = {
  breakfast: Coffee,
  lunch: SunMedium,
  snacks: Cookie,
  dinner: MoonStar,
}

const TONES: Record<MealCategory, string> = {
  breakfast: 'bg-amber-100 text-amber-700',
  lunch: 'bg-orange-100 text-orange-700',
  snacks: 'bg-rose-100 text-rose-700',
  dinner: 'bg-emerald-100 text-emerald-700',
}

export function MealIcon({
  category,
  className,
  tone = true,
}: {
  category: MealCategory
  className?: string
  tone?: boolean
}) {
  const Icon = ICONS[category] ?? UtensilsCrossed
  return (
    <div
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-2xl',
        tone ? TONES[category] : 'bg-white/15 text-white',
        className,
      )}
    >
      <Icon className="size-5" strokeWidth={1.9} />
    </div>
  )
}

export function MealIconInline({ category, className }: { category: MealCategory; className?: string }) {
  const Icon = ICONS[category] ?? UtensilsCrossed
  return <Icon className={className} strokeWidth={1.9} />
}
