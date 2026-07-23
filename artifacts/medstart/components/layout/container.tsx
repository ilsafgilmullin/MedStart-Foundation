import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 'default' = max-w-7xl, 'narrow' = max-w-2xl, 'wide' = max-w-screen-2xl */
  size?: 'narrow' | 'default' | 'wide'
}

const sizeClasses = {
  narrow:  'max-w-2xl',
  default: 'max-w-7xl',
  wide:    'max-w-screen-2xl',
}

export function Container({
  className,
  size = 'default',
  children,
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
