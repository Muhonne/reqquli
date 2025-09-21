import { useState, useCallback, useEffect } from 'react'

interface ValidationRule {
  /** Field is required */
  required?: boolean
  /** Minimum string length */
  minLength?: number
  /** Maximum string length */
  maxLength?: number
  /** Regex pattern to match */
  pattern?: RegExp
  /** Custom validation function */
  custom?: (value: any) => string | undefined
}

interface ValidationRules {
  [field: string]: ValidationRule
}

/**
 * Hook for form state management with validation
 * 
 * Provides form state, validation, error handling, and field updates
 * in a reusable hook. Supports various validation rules and tracks
 * which fields have been touched for better UX.
 * 
 * @param initialData - Initial form values
 * @param rules - Validation rules for each field
 * @returns Form state and helper functions
 * 
 * @example
 * ```tsx
 * const {
 *   formData,
 *   errors,
 *   touched,
 *   updateField,
 *   validateForm,
 *   isValid
 * } = useFormValidation(
 *   { title: '', description: '' },
 *   {
 *     title: { required: true, maxLength: 200 },
 *     description: { required: true, minLength: 1 }
 *   }
 * )
 * ```
 */
export function useFormValidation<T extends Record<string, any>>(
  initialData: T,
  rules: ValidationRules
) {
  const [formData, setFormData] = useState<T>(initialData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  
  // Update form data when initialData changes
  useEffect(() => {
    setFormData(initialData)
    setErrors({})
    setTouched({})
  }, [initialData])
  
  const validateField = useCallback((field: string, value: any): string | undefined => {
    const fieldRules = rules[field]
    if (!fieldRules) {return undefined}
    
    const stringValue = String(value || '').trim()
    
    if (fieldRules.required && !stringValue) {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`
    }
    
    if (fieldRules.minLength && stringValue.length < fieldRules.minLength) {
      return `Must be at least ${fieldRules.minLength} characters`
    }
    
    if (fieldRules.maxLength && stringValue.length > fieldRules.maxLength) {
      return `Must be ${fieldRules.maxLength} characters or less`
    }
    
    if (fieldRules.pattern && !fieldRules.pattern.test(stringValue)) {
      return 'Invalid format'
    }
    
    if (fieldRules.custom) {
      return fieldRules.custom(value)
    }
    
    return undefined
  }, [rules])
  
  const updateField = useCallback((field: keyof T, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setTouched(prev => ({ ...prev, [field]: true }))
    
    const error = validateField(field as string, value)
    setErrors(prev => {
      const newErrors = { ...prev }
      if (error) {
        newErrors[field as string] = error
      } else {
        delete newErrors[field as string]
      }
      return newErrors
    })
  }, [validateField])
  
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}
    
    Object.keys(rules).forEach(field => {
      const error = validateField(field, formData[field])
      if (error) {
        newErrors[field] = error
      }
    })
    
    setErrors(newErrors)
    setTouched(Object.keys(rules).reduce((acc, field) => ({ ...acc, [field]: true }), {}))
    return Object.keys(newErrors).length === 0
  }, [formData, rules, validateField])
  
  const resetForm = useCallback(() => {
    setFormData(initialData)
    setErrors({})
    setTouched({})
  }, [initialData])
  
  return {
    formData,
    errors,
    touched,
    updateField,
    validateForm,
    resetForm,
    isValid: Object.keys(errors).length === 0
  }
}