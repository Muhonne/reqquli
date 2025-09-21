import { InputHTMLAttributes, forwardRef } from 'react'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  indeterminate?: boolean
  testid?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate, testid, ...props }, ref) => {
    return (
      <div className="relative inline-flex items-center" data-testid={testid}>
        <input
          type="checkbox"
          className="sr-only"
          ref={ref}
          {...props}
        />
        <div
          className={cn(
            'flex h-4 w-4 items-center justify-center border border-gray-300 bg-white',
            'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2',
            props.checked && 'bg-blue-600 border-blue-600',
            indeterminate && 'bg-blue-600 border-blue-600',
            props.disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
        >
          {indeterminate ? (
            <Minus className="h-3 w-3 text-white" />
          ) : props.checked ? (
            <Check className="h-3 w-3 text-white" />
          ) : null}
        </div>
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'