import { Button, ListItemStyle } from '../atoms'
import { RequirementCard } from './RequirementCard'

interface TraceListItemProps {
  id: string
  title: string
  description?: string
  onRemove: (id: string) => void
  isRemoving?: boolean
  removeButtonVariant?: 'primary' | 'secondary'
}

export function TraceListItem({ 
  id, 
  title, 
  description, 
  onRemove, 
  isRemoving = false,
  removeButtonVariant = 'secondary'
}: TraceListItemProps) {
  return (
    <ListItemStyle className="px-6 py-4 border-b border-gray-100 last:border-b-0" testid={`trace-list-item-${id}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <RequirementCard id={id} title={title} description={description} />
        </div>
        
        <Button 
          variant={removeButtonVariant}
          size="sm"
          onClick={() => onRemove(id)}
          disabled={isRemoving}
          className="ml-4 flex-shrink-0 text-red-700 hover:text-red-800"
          testid={`trace-remove-${id}`}
        >
          {isRemoving ? 'Removing...' : 'Remove'}
        </Button>
      </div>
    </ListItemStyle>
  )
}