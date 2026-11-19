import { Toaster as Sonner } from 'sonner'

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      offset={16}
      toastOptions={{
        classNames: {
          toast:
            'rounded-xl border border-border bg-card text-foreground shadow-float font-sans text-sm',
          title: 'font-semibold',
          description: 'text-muted-foreground',
          success: 'text-success',
          error: 'text-destructive',
        },
      }}
    />
  )
}
