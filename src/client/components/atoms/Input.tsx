import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Shows error state styling */
  error?: boolean
  testid?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, testid, ...props }, ref) => {
    return (
      <input
        data-testid={testid}
        className={cn(
          'flex h-10 w-full border border-gray-300 bg-white px-3 py-2 text-sm text-[#202020] placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-red-500 focus-visible:ring-red-500',
          className
        )}
        ref={ref}
        aria-invalid={error}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'