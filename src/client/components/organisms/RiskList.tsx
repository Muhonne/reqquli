import { memo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Clock, ChevronRight, AlertTriangle } from 'lucide-react';
import { ListItemStyle } from '../atoms';
import { EmptyState, LoadingState, PageHeader } from '../molecules';
import { RiskRecord } from '../../../types/risks';

// Memoized risk item to prevent re-renders when selection changes
interface RiskItemProps {
  risk: RiskRecord;
  isActive: boolean;
  linkPath: string;
  onSelect?: (risk: RiskRecord) => void;
  getDateLabel: () => string;
  getDisplayDate: (risk: RiskRecord) => string;
}

const RiskItem = memo(({
  risk,
  isActive,
  linkPath,
  onSelect: _onSelect,
  getDateLabel,
  getDisplayDate
}: RiskItemProps) => {
  const getStatusIcon = () => {
    if (risk.status === 'approved') {
      return <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" data-testid={`risk-status-approved-${risk.id}`} />;
    }
    return <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" data-testid={`risk-status-draft-${risk.id}`} />;
  };

  const itemContent = (
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <div className="mb-2">
            <span className="font-semibold text-gray-900 text-sm">
              {risk.id}-{risk.revision} {risk.title}
            </span>
          </div>

          <p className="text-sm text-gray-600 line-clamp-2">
            {risk.harm}
          </p>

          <div className="mt-2 text-xs text-gray-600">
            <span className="mr-3">Severity: {risk.severity}</span>
            <span className="mr-3">P_total: {risk.pTotal}</span>
            {risk.residualRiskScore ? (
              <span className="mr-3">Residual: {risk.residualRiskScore}</span>
            ) : (
              <span className="mr-3">Risk: {risk.severity}{risk.pTotal}</span>
            )}
          </div>

          <div className="mt-2 text-xs text-gray-600">
            {getDateLabel()}: {getDisplayDate(risk)}
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
      testid={`risk-card-${risk.id}`}
    >
      <Link to={linkPath}>
        {itemContent}
      </Link>
    </ListItemStyle>
  );
});

interface RiskListProps {
  risks: RiskRecord[];
  onSelectRisk?: (risk: RiskRecord) => void;
  onCreateNew: () => void;
  loading?: boolean;
  selectedId?: string | null;
  sortBy?: 'id' | 'title' | 'createdAt' | 'lastModified' | 'residualRiskScore';
  title: string;
  totalCount?: number;
  filters?: React.ReactNode;
}

export function RiskList({ 
  risks, 
  onSelectRisk, 
  onCreateNew,
  loading = false,
  selectedId,
  sortBy = 'lastModified',
  title,
  totalCount,
  filters
}: RiskListProps) {
  
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

  const getDisplayDate = (risk: RiskRecord) => {
    switch (sortBy) {
      case 'createdAt':
        return formatDate(risk.createdAt);
      case 'lastModified':
      default:
        return formatDate(risk.lastModified || risk.createdAt);
    }
  };

  const getDateLabel = () => {
    switch (sortBy) {
      case 'createdAt':
        return 'Created';
      case 'lastModified':
      default:
        return 'Modified';
    }
  };

  const renderRiskItem = (risk: RiskRecord) => {
    const linkPath = `/risks/${risk.id}`;

    // Compare selectedId (URL format) with formatted risk ID
    const formattedRiskId = risk.id;
    const isActive = selectedId === formattedRiskId;

    return (
      <RiskItem
        key={risk.id}
        risk={risk}
        isActive={isActive}
        linkPath={linkPath}
        onSelect={onSelectRisk}
        getDateLabel={getDateLabel}
        getDisplayDate={getDisplayDate}
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
          createButtonText="New"
          testId="risks-create-new"
        />
      </div>
      
      {filters && filters}
      
      <div className="flex-1 overflow-auto" role="region" aria-label="Risks list" tabIndex={0}>
        {loading ? (
          <LoadingState message="Loading risks..." />
        ) : risks.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No risks found"
            description="Get started by creating your first risk record."
            action={{
              label: 'Create your first risk',
              onClick: onCreateNew
            }}
            testid="risks-empty-state"
          />
        ) : (
          <div>
            {risks.map(renderRiskItem)}
          </div>
        )}
      </div>
    </div>
  );
}

