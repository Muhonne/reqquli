import { memo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Clock, ChevronRight, FileText, AlertTriangle, XCircle } from 'lucide-react';
import { ListItemStyle } from '../atoms';
import { EmptyState, LoadingState } from '../molecules';
import { LeftPanel } from './LeftPanel';
import { RiskRecord } from '../../../types/risks';
import { TestRun } from '../../../types/test-runs';

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

// Extended interface for risk items
interface RiskItem extends RiskRecord, ListableEntity {}

// Extended interface for test run items (adapter pattern)
interface TestRunItem extends ListableEntity {
  originalTestRun: TestRun;
}

// Memoized list item to prevent re-renders when selection changes
interface ListItemProps {
  item: ListableEntity | RiskItem | TestRunItem;
  isActive: boolean;
  linkPath: string;
  isUserRequirement: boolean;
  isTestRequirement: boolean;
  isRisk: boolean;
  isTestRun: boolean;
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
  isRisk,
  isTestRun,
  onSelect,
  getDateLabel,
  getDisplayDate
}: ListItemProps) => {
  // Risk-specific rendering
  if (isRisk && 'harm' in item) {
    const riskItem = item as RiskItem;
    const itemContent = (
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {riskItem.status === 'approved' ? (
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" data-testid={`risk-status-approved-${riskItem.id}`} />
          ) : (
            <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" data-testid={`risk-status-draft-${riskItem.id}`} />
          )}
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <span className="font-semibold text-gray-900 text-sm">
                {riskItem.id}-{riskItem.revision} {riskItem.title}
              </span>
            </div>

            <p className="text-sm text-gray-600 line-clamp-2">
              {riskItem.harm}
            </p>

            <div className="mt-2 text-xs text-gray-600">
              <span className="mr-3">Severity: {riskItem.severity}</span>
              <span className="mr-3">P_total: {riskItem.pTotal}</span>
              {riskItem.residualRiskScore ? (
                <span className="mr-3">Residual: {riskItem.residualRiskScore}</span>
              ) : (
                <span className="mr-3">Risk: {riskItem.severity}{riskItem.pTotal}</span>
              )}
            </div>

            <div className="mt-2 text-xs text-gray-600">
              {getDateLabel()}: {getDisplayDate(riskItem)}
            </div>
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4 self-center" />
      </div>
    );

    const baseItemClassName = `px-6 py-4 border-b border-gray-100 block no-underline`;

    return (
      <ListItemStyle
        isActive={isActive}
        className={baseItemClassName}
        asChild
        testid={`risk-card-${riskItem.id}`}
        data-item-id={riskItem.id}
      >
        <Link to={linkPath}>
          {itemContent}
        </Link>
      </ListItemStyle>
    );
  }

  // TestRun-specific rendering
  if (isTestRun && 'originalTestRun' in item) {
    const testRunItem = item as TestRunItem;
    const testRun = testRunItem.originalTestRun;
    
    const getStatusIcon = () => {
      if (testRun.status === 'complete' || testRun.status === 'approved') {
        if (testRun.overallResult === 'pass') {
          return <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />;
        } else if (testRun.overallResult === 'fail') {
          return <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-1" />;
        }
      }
      if (testRun.status === 'in_progress') {
        return <Clock className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-1" />;
      }
      return <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />;
    };

    const itemContent = (
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <span className="font-semibold text-gray-900 text-sm">
                {testRun.name}
              </span>
              {testRun.status === 'approved' && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  APPROVED
                </span>
              )}
            </div>

            {testRun.description && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {testRun.description}
              </p>
            )}

            <div className="mt-2 text-xs text-gray-600 flex items-center gap-4">
              <span>Created: {testRun.createdAt ? new Date(testRun.createdAt).toLocaleDateString() : 'Unknown'}</span>
              {testRun.createdByName && (
                <span>By: {testRun.createdByName}</span>
              )}
            </div>
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4 self-center" />
      </div>
    );

    return (
      <ListItemStyle
        isActive={isActive}
        onClick={() => onSelect?.(item)}
        className="px-6 py-4 border-b border-gray-100"
        testid={`test-run-item-${testRun.id}`}
        data-item-id={testRun.id}
      >
        {itemContent}
      </ListItemStyle>
    );
  }

  // Standard requirement/test case rendering
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
        data-item-id={item.id}
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
        data-item-id={item.id}
      >
        {itemContent}
      </ListItemStyle>
    );
  }
});

interface ItemListProps<T extends ListableEntity | RiskRecord | TestRun> {
  items: T[];
  onSelectItem?: (item: T) => void;
  onCreateNew: () => void;
  loading?: boolean;
  selectedId?: string | null;
  sortBy?: 'lastModified' | 'createdAt' | 'approvedAt';
  title: string;
  itemType: 'user' | 'system' | 'test' | 'risk' | 'testrun';
  totalCount?: number;
  filters?: React.ReactNode;
}

function ItemListComponent<T extends ListableEntity | RiskRecord | TestRun>({ 
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
  const listContainerRef = useRef<globalThis.HTMLDivElement>(null);
  
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
    // Handle TestRun specially
    if (isTestRun) {
      const testRun = item as unknown as TestRun;
      switch (sortBy) {
        case 'approvedAt':
          return testRun.approvedAt ? formatDate(testRun.approvedAt) : 'Not approved';
        case 'createdAt':
        case 'lastModified':
        default:
          return formatDate(testRun.createdAt);
      }
    }
    
    // Handle RiskRecord and ListableEntity
    const listableItem = item as unknown as ListableEntity | RiskRecord;
    switch (sortBy) {
      case 'approvedAt':
        return listableItem.approvedAt ? formatDate(listableItem.approvedAt) : 'Not approved';
      case 'createdAt':
        return formatDate(listableItem.createdAt);
      case 'lastModified':
      default:
        return formatDate(listableItem.lastModified || listableItem.createdAt);
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
  const isRisk = itemType === 'risk';
  const isTestRun = itemType === 'testrun';

  // Scroll active item into view when selectedId changes or items are loaded
  useEffect(() => {
    if (!selectedId || !listContainerRef.current || loading || items.length === 0) {
      return;
    }

    // Check if the selected item is in the current items list
    const itemExists = items.some(item => {
      if (isRisk) {
        return (item as unknown as RiskRecord).id === selectedId;
      } else if (isTestRun) {
        return (item as unknown as TestRun).id === selectedId;
      } else {
        return (item as unknown as ListableEntity).id === selectedId;
      }
    });

    if (!itemExists) {
      return;
    }

    // Use a small delay to ensure DOM is updated
    const timeoutId = setTimeout(() => {
      const activeElement = listContainerRef.current?.querySelector(
        `[data-item-id="${selectedId}"]`
      ) as HTMLElement;

      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [selectedId, loading, items, isRisk, isTestRun]);

  const renderItem = (item: T) => {
    let linkPath: string;
    let listItem: ListableEntity | RiskItem | TestRunItem;
    
    if (isRisk) {
      const riskItem = item as unknown as RiskRecord;
      linkPath = `/risks/${riskItem.id}`;
      listItem = riskItem as RiskItem;
    } else if (isTestRun) {
      const testRun = item as unknown as TestRun;
      linkPath = `/test-runs/${testRun.id}`;
      // Create adapter for TestRun to ListableEntity
      listItem = {
        id: testRun.id,
        title: testRun.name,
        description: testRun.description || '',
        status: testRun.status === 'approved' ? 'approved' : 'draft',
        revision: 0,
        createdAt: testRun.createdAt,
        lastModified: testRun.createdAt,
        approvedAt: testRun.approvedAt,
        originalTestRun: testRun
      } as TestRunItem;
    } else {
      const listableItem = item as unknown as ListableEntity;
      linkPath = isUserRequirement
        ? `/user-requirements/${listableItem.id}`
        : isTestRequirement
        ? `/test-cases/${listableItem.id}`
        : `/system-requirements/${listableItem.id}`;
      listItem = listableItem;
    }

    const isActive = selectedId === listItem.id;

    return (
      <ListItem
        key={listItem.id}
        item={listItem}
        isActive={isActive}
        linkPath={linkPath}
        isUserRequirement={isUserRequirement}
        isTestRequirement={isTestRequirement}
        isRisk={isRisk}
        isTestRun={isTestRun}
        onSelect={onSelectItem ? (item: ListableEntity) => {
          if (isTestRun && 'originalTestRun' in item) {
            onSelectItem((item as TestRunItem).originalTestRun as T);
          } else if (isRisk) {
            onSelectItem(item as T);
          } else {
            onSelectItem(item as T);
          }
        } : undefined}
        getDateLabel={getDateLabel}
        getDisplayDate={(item: ListableEntity) => {
          if (isTestRun && 'originalTestRun' in item) {
            const testRun = (item as TestRunItem).originalTestRun;
            return formatDate(testRun.createdAt);
          }
          return getDisplayDate(item as T);
        }}
      />
    );
  };

  return (
    <LeftPanel
      title={title}
      count={totalCount}
      onCreateNew={onCreateNew}
      createButtonText="New"
      headerTestId={isRisk ? "risks-create-new" : isTestRun ? "create-test-run-btn" : "requirements-create-new"}
      filters={filters}
      ariaLabel={isRisk ? "Risks list" : isTestRun ? "Test runs list" : "Items list"}
    >
      {loading ? (
        <LoadingState message={isRisk ? "Loading risks..." : isTestRun ? "Loading test runs..." : "Loading items..."} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={isRisk ? AlertTriangle : FileText}
          title={isRisk ? "No risks found" : isTestRun ? "No test runs found" : "No items found"}
          description={isRisk ? "Get started by creating your first risk record." : isTestRun ? "Get started by creating your first test run." : "Get started by creating your first item."}
          action={{
            label: isRisk ? 'Create your first risk' : isTestRun ? 'Create your first test run' : 'Create your first item',
            onClick: onCreateNew
          }}
          testid={isRisk ? "risks-empty-state" : isTestRun ? "test-runs-empty-state" : "items-empty-state"}
        />
      ) : (
        <div ref={listContainerRef}>
          {items.map(renderItem)}
        </div>
      )}
    </LeftPanel>
  );
}

export const ItemList = memo(ItemListComponent) as typeof ItemListComponent;
