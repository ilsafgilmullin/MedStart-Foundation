import * as React from 'react'
import { cn } from '@/lib/utils'

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
  optional?: boolean
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, optional, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-sm font-medium text-neutral-700 leading-none',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-0.5 text-error-500" aria-hidden="true">*</span>
      )}
      {optional && !required && (
        <span className="ml-1.5 text-xs font-normal text-foreground-subtle">(optional)</span>
      )}
    </label>
  ),
)

Label.displayName = 'Label'
