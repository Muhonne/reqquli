import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ItemList,
  RiskForm,
  RequirementsListControls
} from '../organisms';
import { AppLayout, SplitPanelLayout } from '../templates';
import { Button, Text, Heading, Stack } from '../atoms';
import { 
  useRisks, 
  useRisksPagination,
  useRisksFilters,
  useRisksLoading,
  useRisksError,
  useRiskActions
} from '../../stores/riskStore';
import { RiskRecord, RiskRecordFilters } from '../../../types/risks';

type ViewMode = 'none' | 'detail' | 'create' | 'edit';

export function RisksPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('none');
  
  const risks = useRisks();
  const pagination = useRisksPagination();
  const filters: RiskRecordFilters = useRisksFilters();
  const loading = useRisksLoading();
  const error = useRisksError();
  
  const {
    fetchRisks,
    setFilters,
    clearError
  } = useRiskActions();

  useEffect(() => {
    fetchRisks();
  }, [fetchRisks]);

  // Handle URL parameter changes
  useEffect(() => {
    if (id === 'new') {
      setViewMode('create');
    } else if (id) {
      setViewMode('detail');
    } else {
      setViewMode('none');
    }
  }, [id]);

  const handleSelectRisk = useCallback(async (risk: RiskRecord) => {
    navigate(`/risks/${risk.id}`);
  }, [navigate]);

  const handleCreateNew = useCallback(() => {
    navigate('/risks/new');
  }, [navigate]);

  const handleSearchChange = useCallback((search: string | undefined) => {
    const newFilters: RiskRecordFilters = { ...filters, search, page: 1 };
    setFilters(newFilters);
    fetchRisks(newFilters);
  }, [filters, setFilters, fetchRisks]);

  const handleStatusChange = useCallback((status: string | undefined) => {
    const newFilters: RiskRecordFilters = { 
      ...filters, 
      status: status as 'draft' | 'approved' | undefined, 
      page: 1 
    };
    setFilters(newFilters);
    fetchRisks(newFilters);
  }, [filters, setFilters, fetchRisks]);

  const handlePageChange = useCallback((page: number) => {
    const newFilters: RiskRecordFilters = { ...filters, page };
    setFilters(newFilters);
    fetchRisks(newFilters);
  }, [filters, setFilters, fetchRisks]);

  const handleSortChange = useCallback((sort: 'lastModified' | 'createdAt' | 'approvedAt', order: 'asc' | 'desc') => {
    // Map to risk-specific sort options
    const riskSort = sort === 'lastModified' ? 'lastModified' : 
                     sort === 'createdAt' ? 'createdAt' : 
                     'id';
    const newFilters: RiskRecordFilters = { ...filters, sort: riskSort as 'id' | 'title' | 'createdAt' | 'lastModified' | 'residualRiskScore', order, page: 1 };
    setFilters(newFilters);
    fetchRisks(newFilters);
  }, [filters, setFilters, fetchRisks]);

  const leftPanel = useMemo(() => (
    <ItemList<RiskRecord>
      items={risks}
      onSelectItem={handleSelectRisk}
      onCreateNew={handleCreateNew}
      loading={loading ?? false}
      selectedId={id || null}
      sortBy={filters?.sort === 'lastModified' ? 'lastModified' : 
              filters?.sort === 'createdAt' ? 'createdAt' : 
              'lastModified'}
      title="Risk Management"
      itemType="risk"
      totalCount={pagination?.total}
      filters={
        <RequirementsListControls
          search={filters?.search}
          status={filters?.status}
          totalCount={pagination?.total || 0}
          onSearchChange={handleSearchChange}
          onStatusChange={handleStatusChange}
          sortBy={filters?.sort === 'lastModified' ? 'lastModified' : 
                  filters?.sort === 'createdAt' ? 'createdAt' : 
                  'lastModified'}
          sortOrder={filters?.order}
          onSortChange={handleSortChange}
          currentPage={pagination?.page || 1}
          totalPages={pagination?.pages || 1}
          onPageChange={handlePageChange}
          loading={loading}
          statusOptions={[
            { value: undefined, label: 'All' },
            { value: 'draft', label: 'Draft' },
            { value: 'approved', label: 'Approved' }
          ]}
          searchPlaceholder="Search risks..."
        />
      }
    />
  ), [
    risks,
    handleSelectRisk,
    handleCreateNew,
    loading,
    id,
    filters?.sort,
    filters?.search,
    filters?.status,
    filters?.order,
    pagination?.total,
    pagination?.page,
    pagination?.pages,
    handleSearchChange,
    handleStatusChange,
    handleSortChange,
    handlePageChange
  ]);

  const rightPanel = useMemo(() => {
    if (error) {
      return (
        <Stack align="center" justify="center" className="h-full">
          <Stack align="center" spacing="md">
            <Text className="text-red-600">Error: {error}</Text>
            <Button 
              onClick={clearError}
              variant="secondary"
            >
              Try again
            </Button>
          </Stack>
        </Stack>
      );
    }

    switch (viewMode) {
      case 'create':
        return <RiskForm isCreateMode />;

      case 'edit':
        return (
          <Stack align="center" justify="center" className="h-full">
            <Stack align="center" spacing="sm">
              <Heading level={2} className="text-gray-500">Feature Not Available</Heading>
              <Text color="muted">Edit functionality is available via the Edit button in the detail view.</Text>
            </Stack>
          </Stack>
        );

      case 'detail':
        return <RiskForm />;

      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <h2 className="text-lg font-medium mb-2">Risk Management</h2>
              <p>Select a risk from the list to view details, or create a new one.</p>
            </div>
          </div>
        );
    }
  }, [error, clearError, viewMode]);

  return (
    <AppLayout>
      <SplitPanelLayout
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        leftPanelWidth="400px"
      />
    </AppLayout>
  );
}
