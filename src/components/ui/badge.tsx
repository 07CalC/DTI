import * as React from 'react'
import { cn } from '@/lib/utils'
import { badgeVariants, type BadgeVariantProps } from '@/components/ui/badge-variants'

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & BadgeVariantProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge }
