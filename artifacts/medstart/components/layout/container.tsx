import * as React from 'react'
import { cn } from '@/lib/utils'

type ContainerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

const sizeClasses: Record<ContainerSize, string> = {
  xs:  'max-w-[480px]',
  sm:  'max-w-[640px]',
  md:  'max-w-[768px]',
  lg:  'max-w-[1024px]',
  xl:  'max-w-[1280px]',
  '2xl': 'max-w-[1440px]',
}

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: ContainerSize
}

export function Container({ className, size = 'xl', children, ...props }: ContainerProps) {
  return (
    <div
      className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', sizeClasses[size], className)}
      {...props}
    >
      {children}
    </div>
  )
}
