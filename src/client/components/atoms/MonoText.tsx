import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MonoTextProps {
  children: ReactNode
  variant?: 'body' | 'small' | 'caption'
  color?: 'primary' | 'secondary' | 'muted'
  className?: string
  testid?: string
}

export function MonoText({ 
  children, 
  variant = 'body',
  color = 'primary',
  className,
  testid
}: MonoTextProps) {
  const baseClasses = 'font-mono leading-relaxed'
  
  const variantClasses = {
    body: 'text-base',
    small: 'text-sm',
    caption: 'text-xs'
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
      colorClasses[color],
      className
    )}>
      {children}
    </span>
  )
}