import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface TextProps {
  children: ReactNode
  variant?: 'body' | 'small' | 'caption'
  weight?: 'normal' | 'semibold' | 'bold'
  color?: 'primary' | 'secondary' | 'muted'
  className?: string
  testid?: string
}

export function Text({ 
  children, 
  variant = 'body', 
  weight = 'normal',
  color = 'primary',
  className,
  testid
}: TextProps) {
  const baseClasses = 'leading-relaxed'
  
  const variantClasses = {
    body: 'text-base',
    small: 'text-sm',
    caption: 'text-xs'
  }
  
  const weightClasses = {
    normal: 'font-normal',
    semibold: 'font-semibold', 
    bold: 'font-bold'
  }
  
  const colorClasses = {
    primary: 'text-[#202020]',
    secondary: 'text-gray-600',
    muted: 'text-gray-500'
  }
  
  return (
    <span 
      data-testid={testid}
      className={cn(
      baseClasses,
      variantClasses[variant],
      weightClasses[weight],
      colorClasses[color],
      className
    )}>
      {children}
    </span>
  )
}