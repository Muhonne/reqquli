import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout, SplitPanelLayout } from '../templates';
import { Button, Text, Stack } from '../atoms';
import { RequirementList } from '../organisms/RequirementList';
import { TestCaseForm } from '../organisms/TestCaseForm';
import { RequirementsListControls } from '../organisms/RequirementsListControls';
import useTestRunStore from '../../stores/testRunStore';

type ViewMode = 'none' | 'detail' | 'create';

export function TestCasesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('none');

  const {
    testCases,
    testCaseFilters,
    testCasePagination,
    loading,
    error,
    fetchTestCases,
    setTestCaseFilters,
    clearError
  } = useTestRunStore();

  // Initial fetch
  useEffect(() => {
    fetchTestCases();
  }, []);

  useEffect(() => {
    if (id === 'new') {
      setViewMode('create');
    } else if (id) {
      setViewMode('detail');
    } else {
      setViewMode('none');
    }
  }, [id]);

  const handleSelectTestCase = useCallback((item: any) => {
    navigate(`/test-cases/${item.id}`);
  }, [navigate]);

  const handleCreateNew = useCallback(() => {
    navigate('/test-cases/new');
  }, [navigate]);

  const handleSearchChange = useCallback((search: string | undefined) => {
    const newFilters = { ...testCaseFilters, search };
    setTestCaseFilters(newFilters);
    fetchTestCases({ ...newFilters, page: 1 });
  }, [testCaseFilters, setTestCaseFilters, fetchTestCases]);

  const handleStatusChange = useCallback((status: 'draft' | 'approved' | undefined) => {
    const newFilters = { ...testCaseFilters, status };
    setTestCaseFilters(newFilters);
    fetchTestCases({ ...newFilters, page: 1 });
  }, [testCaseFilters, setTestCaseFilters, fetchTestCases]);

  const handleSortChange = useCallback((sort: 'lastModified' | 'createdAt' | 'approvedAt', order: 'asc' | 'desc') => {
    const newFilters = { ...testCaseFilters, sort, order };
    setTestCaseFilters(newFilters);
    fetchTestCases({ ...newFilters, page: 1 });
  }, [testCaseFilters, setTestCaseFilters, fetchTestCases]);

  const handlePageChange = useCallback((page: number) => {
    fetchTestCases({ ...testCaseFilters, page });
  }, [testCaseFilters, fetchTestCases]);

  const selectedTestCase = useMemo(() => {
    if (id && id !== 'new') {
      return testCases.find(tc => tc.id === id);
    }
    return null;
  }, [testCases, id]);

  // Convert test cases to the format expected by RequirementList
  const testCasesAsRequirements = useMemo(() => {
    return testCases.map(tc => ({
      id: tc.id,
      identifier: tc.id,
      title: tc.title,
      description: tc.description || '',
      status: tc.status as 'draft' | 'approved',
      created_by: tc.createdBy || '',
      creatorName: tc.createdByName || 'Unknown',
      created_at: tc.createdAt,
      updated_at: tc.createdAt, // Test cases don't have a separate lastModified field
      lastModified: tc.createdAt, // Add this for RequirementList compatibility
      createdAt: tc.createdAt, // Ensure both formats are available
      version: tc.revision || 0,
      approved: tc.status === 'approved',
      approved_at: tc.approvedAt,
      approvedAt: tc.approvedAt, // Add both formats
      approved_by: tc.approvedBy,
      approverName: tc.approvedByName
    }));
  }, [testCases]);

  const memoizedControls = useMemo(() => (
    <RequirementsListControls
      search={testCaseFilters.search}
      status={testCaseFilters.status}
      totalCount={testCasePagination.total}
      onSearchChange={handleSearchChange}
      onStatusChange={handleStatusChange as any}
      sortBy={testCaseFilters.sort as 'lastModified' | 'createdAt' | 'approvedAt'}
      sortOrder={testCaseFilters.order as 'asc' | 'desc'}
      onSortChange={handleSortChange}
      currentPage={testCasePagination.page}
      totalPages={testCasePagination.pages}
      onPageChange={handlePageChange}
      loading={loading}
      searchPlaceholder="Search test cases..."
    />
  ), [
    testCaseFilters,
    testCasePagination,
    handleSearchChange,
    handleStatusChange,
    handleSortChange,
    handlePageChange,
    loading
  ]);

  // Split the selectedId out to avoid re-rendering the entire list when selection changes
  const leftPanel = (
    <div className="flex flex-col h-full">
      <RequirementList
        requirements={testCasesAsRequirements}
        onSelectRequirement={handleSelectTestCase}
        onCreateNew={handleCreateNew}
        loading={loading}
        selectedId={id || null}
        sortBy={testCaseFilters.sort as 'lastModified' | 'createdAt' | 'approvedAt'}
        title="Test Cases"
        requirementType="test"
        totalCount={testCasePagination.total}
        filters={memoizedControls}
      />
    </div>
  );

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
        return <TestCaseForm isCreateMode={true} />;

      case 'detail':
        if (selectedTestCase) {
          return <TestCaseForm isCreateMode={false} />;
        }
        return (
          <Stack align="center" justify="center" className="h-full">
            <Text color="muted">Test case not found</Text>
          </Stack>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <h2 className="text-lg font-medium mb-2">Test Cases</h2>
              <p>Select a test case from the list to view details, or create a new one.</p>
            </div>
          </div>
        );
    }
  }, [error, clearError, viewMode, selectedTestCase]);

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