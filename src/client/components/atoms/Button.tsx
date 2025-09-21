import { ReactNode, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  testid?: string
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className,
  testid,
  ...props 
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:ring-offset-1 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]'
  
  const variantClasses = {
    primary: 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm hover:shadow',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400 hover:bg-gray-50'
  }
  
  const sizeClasses = {
    sm: 'h-8 px-3 text-xs tracking-wide',
    md: 'h-9 px-4 text-sm',
    lg: 'h-11 px-6 text-base'
  }
  
  return (
    <button
      data-testid={testid}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}