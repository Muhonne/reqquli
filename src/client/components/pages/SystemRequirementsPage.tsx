import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ItemList,
  RequirementForm,
  RequirementsListControls
} from '../organisms';
import { AppLayout, SplitPanelLayout } from '../templates';
import { Button, Text, Heading, Stack } from '../atoms';
import { 
  useSystemRequirements, 
  useSystemRequirementsPagination,
  useSystemRequirementsFilters,
  useSystemRequirementsLoading,
  useSystemRequirementsError,
  useSystemRequirementsActions
} from '../../stores/systemRequirementStore';
import { SystemRequirement } from '../../../types/system-requirements';

type ViewMode = 'none' | 'detail' | 'create' | 'edit';

export function SystemRequirementsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('none');
  
  const requirements = useSystemRequirements();
  const pagination = useSystemRequirementsPagination();
  const filters = useSystemRequirementsFilters();
  const loading = useSystemRequirementsLoading();
  const error = useSystemRequirementsError();
  
  const {
    fetchRequirements,
    setFilters,
    clearError
  } = useSystemRequirementsActions();


  useEffect(() => {
    fetchRequirements();
  }, [fetchRequirements]);

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

  const handleSelectRequirement = useCallback(async (requirement: SystemRequirement) => {
    // Navigation is now handled by Link components
    navigate(`/system-requirements/${requirement.id}`);
  }, [navigate]);

  const handleCreateNew = useCallback(() => {
    navigate('/system-requirements/new');
  }, [navigate]);



  const handleSearchChange = useCallback((search: string | undefined) => {
    const newFilters = { ...filters, search, page: 1 };
    setFilters(newFilters);
    fetchRequirements(newFilters);
  }, [filters, setFilters, fetchRequirements]);

  const handleStatusChange = useCallback((status: string | undefined) => {
    const newFilters = { ...filters, status: status as 'draft' | 'approved' | undefined, page: 1 };
    setFilters(newFilters);
    fetchRequirements(newFilters);
  }, [filters, setFilters, fetchRequirements]);

  const handlePageChange = useCallback((page: number) => {
    const newFilters = { ...filters, page };
    setFilters(newFilters);
    fetchRequirements(newFilters);
  }, [filters, setFilters, fetchRequirements]);

  const handleSortChange = useCallback((sort: 'lastModified' | 'createdAt' | 'approvedAt', order: 'asc' | 'desc') => {
    const newFilters = { ...filters, sort, order, page: 1 };
    setFilters(newFilters);
    fetchRequirements(newFilters);
  }, [filters, setFilters, fetchRequirements]);


  const leftPanel = useMemo(() => (
    <ItemList
      items={requirements || []}
      onSelectItem={handleSelectRequirement}
      onCreateNew={handleCreateNew}
      loading={loading}
      selectedId={id || null}
      sortBy={filters?.sort}
      title="System Requirements"
      itemType="system"
      totalCount={pagination?.total}
      filters={
        <RequirementsListControls
          search={filters?.search}
          status={filters?.status}
          totalCount={pagination?.total || 0}
          onSearchChange={handleSearchChange}
          onStatusChange={handleStatusChange}
          sortBy={filters?.sort}
          sortOrder={filters?.order}
          onSortChange={handleSortChange}
          currentPage={pagination?.page || 1}
          totalPages={pagination?.pages || 1}
          onPageChange={handlePageChange}
          loading={loading}
        />
      }
    />
  ), [
    requirements,
    handleSelectRequirement,
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
        return <RequirementForm requirementType="system" isCreateMode />;

      case 'edit':
        return (
          <Stack align="center" justify="center" className="h-full">
            <Stack align="center" spacing="sm">
              <Heading level={2} className="text-gray-500">Feature Not Available</Heading>
              <Text color="muted">Edit functionality will be implemented in a future version.</Text>
            </Stack>
          </Stack>
        );

      case 'detail':
        return <RequirementForm requirementType="system" />;

      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <h2 className="text-lg font-medium mb-2">System Requirements</h2>
              <p>Select a requirement from the list to view details, or create a new one.</p>
            </div>
          </div>
        );
    }
  }, [error, clearError, viewMode, id]);

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