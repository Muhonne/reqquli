import { memo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Clock, ChevronRight, FileText } from 'lucide-react';
import { ListItemStyle } from '../atoms';
import { EmptyState, LoadingState, PageHeader } from '../molecules';
import { UserRequirement } from '../../../types/user-requirements';
import { SystemRequirement } from '../../../types/system-requirements';

type Requirement = UserRequirement | SystemRequirement;

// Memoized requirement item to prevent re-renders when selection changes
interface RequirementItemProps {
  requirement: Requirement;
  isActive: boolean;
  linkPath: string;
  isUserRequirement: boolean;
  isTestRequirement: boolean;
  onSelect?: (requirement: Requirement) => void;
  getDateLabel: () => string;
  getDisplayDate: (requirement: Requirement) => string;
}

const RequirementItem = memo(({
  requirement,
  isActive,
  linkPath,
  isUserRequirement,
  isTestRequirement,
  onSelect,
  getDateLabel,
  getDisplayDate
}: RequirementItemProps) => {
  const itemContent = (
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {requirement.status === 'approved' ? (
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" data-testid={`requirement-status-approved-${requirement.id}`} />
        ) : (
          <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" data-testid={`requirement-status-draft-${requirement.id}`} />
        )}
        <div className="flex-1 min-w-0">
          <div className="mb-2">
            <span className="font-semibold text-gray-900 text-sm">
              {requirement.id}-{requirement.revision} {requirement.title}
            </span>
          </div>

          <p className="text-sm text-gray-600 line-clamp-2">
            {requirement.description}
          </p>

          <div className="mt-2 text-xs text-gray-600">
            {getDateLabel()}: {getDisplayDate(requirement)}
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
        testid={`requirement-card-${requirement.id}`}
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
        onClick={() => onSelect?.(requirement)}
        className={baseItemClassName}
        testid={`requirement-card-${requirement.id}`}
      >
        {itemContent}
      </ListItemStyle>
    );
  }
});

interface RequirementListProps<T extends Requirement> {
  requirements: T[];
  onSelectRequirement?: (requirement: T) => void;
  onCreateNew: () => void;
  loading?: boolean;
  selectedId?: string | null;
  sortBy?: 'lastModified' | 'createdAt' | 'approvedAt';
  title: string;
  requirementType: 'user' | 'system' | 'test';
  totalCount?: number;
  filters?: React.ReactNode;
}

function RequirementListComponent<T extends Requirement>({ 
  requirements, 
  onSelectRequirement, 
  onCreateNew,
  loading = false,
  selectedId,
  sortBy = 'lastModified',
  title,
  requirementType,
  totalCount,
  filters
}: RequirementListProps<T>) {
  
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

  const getDisplayDate = (requirement: T) => {
    switch (sortBy) {
      case 'approvedAt':
        return requirement.approvedAt ? formatDate(requirement.approvedAt) : 'Not approved';
      case 'createdAt':
        return formatDate(requirement.createdAt);
      case 'lastModified':
      default:
        return formatDate(requirement.lastModified || requirement.createdAt);
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

  const isUserRequirement = requirementType === 'user';
  const isTestRequirement = requirementType === 'test';

  const renderRequirementItem = (requirement: T) => {
    const linkPath = isUserRequirement
      ? `/user-requirements/${requirement.id}`
      : isTestRequirement
      ? `/test-cases/${requirement.id}`
      : `/system-requirements/${requirement.id}`;

    // Compare selectedId (URL format) with formatted requirement ID
    const formattedRequirementId = requirement.id;
    const isActive = selectedId === formattedRequirementId;

    return (
      <RequirementItem
        key={requirement.id}
        requirement={requirement}
        isActive={isActive}
        linkPath={linkPath}
        isUserRequirement={isUserRequirement}
        isTestRequirement={isTestRequirement}
        onSelect={onSelectRequirement as ((requirement: Requirement) => void) | undefined}
        getDateLabel={getDateLabel}
        getDisplayDate={(req: Requirement) => getDisplayDate(req as T)}
      />
    );
  };

  return (
    <div className="flex flex-col h-full bg-white" style={{ boxShadow: 'inset -2px 0 4px 0 rgba(0,0,0,0.1), inset -1px 0 2px 0 rgba(0,0,0,0.06), inset 2px 0 4px 0 rgba(0,0,0,0.1), inset 1px 0 2px 0 rgba(0,0,0,0.06)' }}>
      <div className="p-6 pb-4 border-b">
        <PageHeader
          title={title}
          count={totalCount}
          onCreateNew={onCreateNew}
          createButtonText={requirementType === 'system' ? 'New' : requirementType === 'test' ? 'New' : 'New'}
          testId="requirements-create-new"
        />
      </div>
      
      {filters && filters}
      
      <div className="flex-1 overflow-auto" role="region" aria-label="Requirements list" tabIndex={0}>
        {loading ? (
          <LoadingState message="Loading requirements..." />
        ) : requirements.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No requirements found"
            description="Get started by creating your first requirement."
            action={{
              label: 'Create your first requirement',
              onClick: onCreateNew
            }}
            testid="requirements-empty-state"
          />
        ) : (
          <div>
            {requirements.map(renderRequirementItem)}
          </div>
        )}
      </div>
    </div>
  );
}

export const RequirementList = memo(RequirementListComponent) as typeof RequirementListComponent;