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
  useUserRequirements, 
  useUserRequirementsPagination,
  useUserRequirementsFilters,
  useUserRequirementsLoading,
  useUserRequirementsError,
  useUserRequirementsActions
} from '../../stores/userRequirementsStore';
import { UserRequirement } from '../../../types/user-requirements';

type ViewMode = 'none' | 'detail' | 'create' | 'edit';

export function UserRequirementsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('none');
  
  const requirements = useUserRequirements();
  const pagination = useUserRequirementsPagination();
  const filters = useUserRequirementsFilters();
  const loading = useUserRequirementsLoading();
  const error = useUserRequirementsError();
  
  const {
    fetchRequirements,
    setFilters,
    clearError
  } = useUserRequirementsActions();


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

  const handleSelectRequirement = useCallback((requirement: UserRequirement) => {
    navigate(`/user-requirements/${requirement.id}`);
  }, [navigate]);

  const handleCreateNew = useCallback(() => {
    navigate('/user-requirements/new');
  }, [navigate]);



  const handleSearchChange = useCallback((search: string | undefined) => {
    const newFilters = { ...filters, search, page: 1 };
    setFilters(newFilters);
    fetchRequirements(newFilters);
  }, [filters?.sort, filters?.order, filters?.limit, setFilters, fetchRequirements]);

  const handleStatusChange = useCallback((status: string | undefined) => {
    const newFilters = { ...filters, status: status as 'draft' | 'approved' | undefined, page: 1 };
    setFilters(newFilters);
    fetchRequirements(newFilters);
  }, [filters?.sort, filters?.order, filters?.limit, setFilters, fetchRequirements]);

  const handlePageChange = useCallback((page: number) => {
    const newFilters = { ...filters, page };
    setFilters(newFilters);
    fetchRequirements(newFilters);
  }, [filters?.sort, filters?.order, filters?.limit, filters?.search, filters?.status, setFilters, fetchRequirements]);

  const handleSortChange = useCallback((sort: 'lastModified' | 'createdAt' | 'approvedAt', order: 'asc' | 'desc') => {
    const newFilters = { ...filters, sort, order, page: 1 };
    setFilters(newFilters);
    fetchRequirements(newFilters);
  }, [filters?.search, filters?.status, filters?.limit, setFilters, fetchRequirements]);



  const memoizedControls = useMemo(() => (
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
  ), [
    filters?.search,
    filters?.status,
    filters?.sort,
    filters?.order,
    pagination?.total,
    pagination?.page,
    pagination?.pages,
    handleSearchChange,
    handleStatusChange,
    handleSortChange,
    handlePageChange,
    loading
  ]);

  const leftPanel = useMemo(() => (
    <div className="flex flex-col h-full">
      <ItemList
        items={requirements || []}
        onSelectItem={handleSelectRequirement}
        onCreateNew={handleCreateNew}
        loading={loading}
        selectedId={id || null}
        sortBy={filters?.sort}
        title="User Requirements"
        itemType="user"
        totalCount={pagination?.total}
        filters={memoizedControls}
      />
    </div>
  ), [
    requirements,
    handleSelectRequirement,
    handleCreateNew,
    loading,
    id,
    filters?.sort,
    pagination?.total,
    memoizedControls
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
        return <RequirementForm requirementType="user" isCreateMode />;

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
        return <RequirementForm requirementType="user" />;

      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <h2 className="text-lg font-medium mb-2">User Requirements</h2>
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