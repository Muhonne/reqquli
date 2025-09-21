import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StackProps {
  children: ReactNode
  spacing?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  direction?: 'horizontal' | 'vertical'
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around'
  className?: string
  testid?: string
}

const spacingClasses = {
  horizontal: {
    xs: 'gap-x-1',
    sm: 'gap-x-2',
    md: 'gap-x-4',
    lg: 'gap-x-6',
    xl: 'gap-x-8'
  },
  vertical: {
    xs: 'gap-y-1',
    sm: 'gap-y-2',
    md: 'gap-y-4',
    lg: 'gap-y-6',
    xl: 'gap-y-8'
  }
}

const alignClasses = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch'
}

const justifyClasses = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around'
}

export function Stack({
  children,
  spacing = 'md',
  direction = 'vertical',
  align = 'stretch',
  justify = 'start',
  className,
  testid
}: StackProps) {
  const directionClass = direction === 'horizontal' ? 'flex-row' : 'flex-col'
  const spacingClass = spacingClasses[direction][spacing]
  
  return (
    <div
      data-testid={testid}
      className={cn(
        'flex',
        directionClass,
        spacingClass,
        alignClasses[align],
        justifyClasses[justify],
        className
      )}
    >
      {children}
    </div>
  )
}