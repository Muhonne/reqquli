import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button, Stack } from '../atoms'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string | ReactNode
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'fixed'
  hideCloseButton?: boolean
}

export function Modal({ isOpen, onClose, title, children, className = '', size = 'md', hideCloseButton = false }: ModalProps) {
  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {return null}
  
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`bg-white ${size === 'fixed' ? 'w-4/5 h-4/5 flex flex-col' : `w-full m-4 ${sizeClasses[size]} p-6`} ${className}`}>
        {size === 'fixed' ? (
          <>
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              {typeof title === 'string' ? (
                <h2 className="text-lg font-medium">{title}</h2>
              ) : (
                <div className="text-lg font-medium">{title}</div>
              )}
              {!hideCloseButton && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onClose}
                  className="p-1"
                  aria-label="Close modal"
                  testid="trace-modal-close"
                >
                  <X size={20} />
                </Button>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              {children}
            </div>
          </>
        ) : (
          <Stack spacing="md">
            <div className="flex items-center justify-between">
              {typeof title === 'string' ? (
                <h2 className="text-lg font-medium">{title}</h2>
              ) : (
                <div className="text-lg font-medium">{title}</div>
              )}
              {!hideCloseButton && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onClose}
                  className="p-1"
                  aria-label="Close modal"
                  testid="trace-modal-close"
                >
                  <X size={20} />
                </Button>
              )}
            </div>
            {children}
          </Stack>
        )}
      </div>
    </div>
  )
}