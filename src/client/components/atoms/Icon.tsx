import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface IconProps {
  icon: LucideIcon
  size?: 'sm' | 'md' | 'lg'
  className?: string
  testid?: string
}

export function Icon({ icon: IconComponent, size = 'md', className, testid }: IconProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }
  
  return (
    <IconComponent 
      data-testid={testid}
      className={cn(sizeClasses[size], className)}
    />
  )
}