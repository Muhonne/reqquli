import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps {
  children: ReactNode
  variant?: 'success' | 'error' | 'warning' | 'pending' | 'neutral' | 'outline'
  size?: 'sm' | 'md'
  className?: string
  testid?: string
}

export function Badge({ 
  children, 
  variant = 'neutral', 
  size = 'sm',
  className,
  testid
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center font-medium transition-colors duration-150'
  
  const sizeClasses = {
    sm: 'h-10 px-3 py-2 text-xs tracking-wider uppercase',
    md: 'h-10 px-3 py-2 text-sm tracking-wide'
  }
  
  const variantClasses = {
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/50',
    error: 'bg-red-50 text-red-700 border border-red-200/50',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/50',
    pending: 'bg-blue-50 text-blue-700 border border-blue-200/50',
    neutral: 'bg-white text-gray-600 border border-gray-200/50',
    outline: 'bg-transparent text-gray-600 border border-gray-300'
  }
  
  return (
    <span 
      data-testid={testid}
      className={cn(
      baseClasses,
      sizeClasses[size],
      variantClasses[variant],
      className
    )}>
      {children}
    </span>
  )
}