import { memo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Clock, ChevronRight, FileText } from 'lucide-react';
import { ListItemStyle } from '../atoms';
import { EmptyState, LoadingState } from '../molecules';
import { LeftPanel } from './LeftPanel';

// Base interface that all listable entities must implement
export interface ListableEntity {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'approved';
  revision: number;
  createdAt: string;
  lastModified?: string;
  approvedAt?: string;
}

// Memoized list item to prevent re-renders when selection changes
interface ListItemProps {
  item: ListableEntity;
  isActive: boolean;
  linkPath: string;
  isUserRequirement: boolean;
  isTestRequirement: boolean;
  onSelect?: (item: ListableEntity) => void;
  getDateLabel: () => string;
  getDisplayDate: (item: ListableEntity) => string;
}

const ListItem = memo(({
  item,
  isActive,
  linkPath,
  isUserRequirement,
  isTestRequirement,
  onSelect,
  getDateLabel,
  getDisplayDate
}: ListItemProps) => {
  const itemContent = (
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {item.status === 'approved' ? (
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" data-testid={`requirement-status-approved-${item.id}`} />
        ) : (
          <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" data-testid={`requirement-status-draft-${item.id}`} />
        )}
        <div className="flex-1 min-w-0">
          <div className="mb-2">
            <span className="font-semibold text-gray-900 text-sm">
              {item.id}-{item.revision} {item.title}
            </span>
          </div>

          <p className="text-sm text-gray-600 line-clamp-2">
            {item.description}
          </p>

          <div className="mt-2 text-xs text-gray-600">
            {getDateLabel()}: {getDisplayDate(item)}
          </div>
        </div>
      </div>

      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4 self-center" />
    </div>
  );

  const baseItemClassName = `px-6 py-4 border-b border-gray-100 ${(isUserRequirement || isTestRequirement) ? 'block no-underline' : ''}`;

  if (isUserRequirement || isTestRequirement) {
    return (
      <ListItemStyle
        isActive={isActive}
        className={baseItemClassName}
        asChild
        testid={`requirement-card-${item.id}`}
      >
        <Link to={linkPath}>
          {itemContent}
        </Link>
      </ListItemStyle>
    );
  } else {
    return (
      <ListItemStyle
        isActive={isActive}
        onClick={() => onSelect?.(item)}
        className={baseItemClassName}
        testid={`requirement-card-${item.id}`}
      >
        {itemContent}
      </ListItemStyle>
    );
  }
});

interface ItemListProps<T extends ListableEntity> {
  items: T[];
  onSelectItem?: (item: T) => void;
  onCreateNew: () => void;
  loading?: boolean;
  selectedId?: string | null;
  sortBy?: 'lastModified' | 'createdAt' | 'approvedAt';
  title: string;
  itemType: 'user' | 'system' | 'test';
  totalCount?: number;
  filters?: React.ReactNode;
}

function ItemListComponent<T extends ListableEntity>({ 
  items, 
  onSelectItem, 
  onCreateNew,
  loading = false,
  selectedId,
  sortBy = 'lastModified',
  title,
  itemType,
  totalCount,
  filters
}: ItemListProps<T>) {
  
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) {return 'N/A';}
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDisplayDate = (item: T) => {
    switch (sortBy) {
      case 'approvedAt':
        return item.approvedAt ? formatDate(item.approvedAt) : 'Not approved';
      case 'createdAt':
        return formatDate(item.createdAt);
      case 'lastModified':
      default:
        return formatDate(item.lastModified || item.createdAt);
    }
  };

  const getDateLabel = () => {
    switch (sortBy) {
      case 'approvedAt':
        return 'Approved';
      case 'createdAt':
        return 'Created';
      case 'lastModified':
      default:
        return 'Modified';
    }
  };

  const isUserRequirement = itemType === 'user';
  const isTestRequirement = itemType === 'test';

  const renderItem = (item: T) => {
    const linkPath = isUserRequirement
      ? `/user-requirements/${item.id}`
      : isTestRequirement
      ? `/test-cases/${item.id}`
      : `/system-requirements/${item.id}`;

    const isActive = selectedId === item.id;

    return (
      <ListItem
        key={item.id}
        item={item}
        isActive={isActive}
        linkPath={linkPath}
        isUserRequirement={isUserRequirement}
        isTestRequirement={isTestRequirement}
        onSelect={onSelectItem ? (item: ListableEntity) => onSelectItem(item as T) : undefined}
        getDateLabel={getDateLabel}
        getDisplayDate={(item: ListableEntity) => getDisplayDate(item as T)}
      />
    );
  };

  return (
    <LeftPanel
      title={title}
      count={totalCount}
      onCreateNew={onCreateNew}
      createButtonText="New"
      headerTestId="items-create-new"
      filters={filters}
      ariaLabel="Items list"
    >
      {loading ? (
        <LoadingState message="Loading items..." />
      ) : items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No items found"
          description="Get started by creating your first item."
          action={{
            label: 'Create your first item',
            onClick: onCreateNew
          }}
          testid="items-empty-state"
        />
      ) : (
        <div>
          {items.map(renderItem)}
        </div>
      )}
    </LeftPanel>
  );
}

export const ItemList = memo(ItemListComponent) as typeof ItemListComponent;

