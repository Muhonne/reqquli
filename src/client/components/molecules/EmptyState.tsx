import { LucideIcon } from 'lucide-react'
import { Stack, Text, Button } from '../atoms'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
  testid?: string
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className = '',
  testid
}: EmptyStateProps) {
  return (
    <div className={`flex items-center justify-center min-h-[400px] ${className}`} data-testid={testid}>
      <Stack spacing="md" className="text-center max-w-sm" testid={testid ? `${testid}-content` : 'empty-state-content'}>
        {Icon && (
          <div className="mx-auto text-gray-400">
            <Icon size={48} strokeWidth={1.5} />
          </div>
        )}
        
        <Stack spacing="xs">
          <Text weight="semibold" color="muted" className="text-lg" testid={testid ? `${testid}-title` : 'empty-state-title'}>
            {title}
          </Text>
          
          {description && (
            <Text color="muted" variant="small" testid={testid ? `${testid}-description` : 'empty-state-description'}>
              {description}
            </Text>
          )}
        </Stack>
        
        {action && (
          <div className="mt-2">
            <Button 
              variant="primary" 
              size="sm"
              onClick={action.onClick}
              testid={testid ? `${testid}-action` : 'empty-state-action'}
            >
              {action.label}
            </Button>
          </div>
        )}
      </Stack>
    </div>
  )
}