import { ReactNode } from 'react'
import { Text } from '../atoms'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  children: ReactNode
  error?: string
  required?: boolean
  className?: string
}

export function FormField({ 
  label, 
  children, 
  error, 
  required, 
  className 
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="block">
        <Text weight="semibold" className="text-sm">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Text>
      </label>
      {children}
      {error && (
        <Text variant="small" color="muted" className="text-red-600">
          {error}
        </Text>
      )}
    </div>
  )
}