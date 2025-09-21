import { ReactNode, createElement } from 'react'
import { cn } from '@/lib/utils'

interface HeadingProps {
  children: ReactNode
  level: 1 | 2 | 3 | 4 | 5 | 6
  className?: string
  testid?: string
}

export function Heading({ children, level, className, testid }: HeadingProps) {
  const baseClasses = 'font-bold text-[#202020] leading-tight'
  
  const levelClasses = {
    1: 'text-xl',
    2: 'text-lg',
    3: 'text-base', 
    4: 'text-sm',
    5: 'text-xs',
    6: 'text-xs'
  }
  
  return createElement(
    `h${level}`,
    { className: cn(baseClasses, levelClasses[level], className), 'data-testid': testid },
    children
  )
}