import { useState, ReactNode } from 'react'
import { Modal } from './Modal'
import { FormField } from './FormField'
import { Button, Input, Text, Stack } from '../atoms'

/**
 * CRITICAL ERROR HANDLING RULES:
 * 
 * This modal COMPLETELY ENCAPSULATES all error handling for password confirmation.
 * 
 * 1. ALL errors from the onConfirm callback are caught and displayed in this modal
 * 2. The modal STAYS OPEN when errors occur - no navigation happens
 * 3. Parent components MUST NOT handle errors from password confirmation
 * 4. Parent components MUST NOT show error messages for password failures
 * 5. Parent components should pass async functions that simply throw on error
 * 
 * The API layer has been configured to skip auth redirects for password validation
 * to ensure errors are properly handled here without side effects.
 */
interface PasswordConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (password: string) => Promise<void>
  title: string
  message: string
  children?: ReactNode
  confirmText?: string
  loadingText?: string
}

export function PasswordConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  children,
  confirmText = 'Confirm',
  loadingText = 'Confirming...'
}: PasswordConfirmModalProps) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!password.trim()) {
      setError('Password is required')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      await onConfirm(password)
      setPassword('')
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Invalid password')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (!loading) {
      setPassword('')
      setError('')
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={title}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit}>
        <Stack spacing="lg">
          <Text color="muted" className="text-sm">
            {message}
          </Text>
          
          {children}
          
          <FormField 
            label="Password" 
            required
            error={error}
          >
            <Input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) {setError('')}
              }}
              placeholder="Enter your password to confirm"
              disabled={loading}
              autoComplete="current-password"
              autoFocus
              testid="password-confirm-input"
            />
          </FormField>
          
          <Stack direction="horizontal" spacing="sm" justify="end">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={handleCancel}
              disabled={loading}
              testid="password-confirm-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              disabled={loading || !password.trim()}
              testid="password-confirm-submit"
            >
              {loading ? loadingText : confirmText}
            </Button>
          </Stack>
        </Stack>
      </form>
    </Modal>
  )
}