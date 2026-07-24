import * as React from 'react'
import { cn } from '@/lib/utils'

// ─── Card ──────────────────────────────────────────────────────────────────

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Remove default padding */
  noPadding?: boolean
  /** Add a hover lift effect */
  hoverable?: boolean
  /** Flatten shadow — use when stacking cards */
  flat?: boolean
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, noPadding, hoverable, flat, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-border bg-background',
        flat ? 'shadow-none' : 'shadow-sm',
        hoverable && 'cursor-pointer transition-shadow duration-[200ms] hover:shadow-md',
        !noPadding && 'p-6',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
)
Card.displayName = 'Card'

// ─── Card sub-components ───────────────────────────────────────────────────

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1', className)} {...props} />
  ),
)
CardHeader.displayName = 'CardHeader'

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('text-base font-semibold leading-tight text-foreground tracking-tight', className)}
      {...props}
    />
  ),
)
CardTitle.displayName = 'CardTitle'

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-foreground-muted', className)} {...props} />
  ),
)
CardDescription.displayName = 'CardDescription'

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props} />
  ),
)
CardContent.displayName = 'CardContent'

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center', className)} {...props} />
  ),
)
CardFooter.displayName = 'CardFooter'

// ─── Card divider ──────────────────────────────────────────────────────────

export function CardDivider({ className }: { className?: string }) {
  return <hr className={cn('my-4 border-border', className)} />
}
