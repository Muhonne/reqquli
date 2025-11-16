import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../templates/AppLayout';
import { SplitPanelLayout } from '../templates/SplitPanelLayout';
import { ItemList } from '../organisms/ItemList';
import { TestRunDetail } from '../organisms/TestRunDetail';
import { TestRunForm } from '../organisms/TestRunForm';
import { ItemListControls } from '../organisms/ItemListControls';
import { Modal } from '../molecules/Modal';
import { Button, Text, Stack } from '../atoms';
import useTestRunStore from '../../stores/testRunStore';
import { TestRunStatus, TestRun } from '../../../types/test-runs';

export const TestRunsPage: React.FC = () => {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const {
    testRuns,
    currentTestRun,
    testRunFilters,
    testRunPagination,
    loading,
    error,
    fetchTestRuns,
    setTestRunFilters,
    fetchTestRun,
    createTestRun,
    clearError
  } = useTestRunStore();

  // Initial fetch on mount
  useEffect(() => {
    fetchTestRuns();
  }, [fetchTestRuns]);

  useEffect(() => {
    if (runId) {
      fetchTestRun(runId);
    }
  }, [runId, fetchTestRun]);

  const handleCreateTestRun = async (data: any) => {
    try {
      const newTestRun = await createTestRun(data);
      setShowCreateModal(false);
      navigate(`/test-runs/${newTestRun.id}`);
    } catch {
      // Error is handled in store
    }
  };

  const handleSelectTestRun = (testRun: any) => {
    navigate(`/test-runs/${testRun.id}`);
  };

  const handleSearchChange = useCallback((search: string | undefined) => {
    const newFilters = { ...testRunFilters, search, page: 1 };
    setTestRunFilters(newFilters);
    fetchTestRuns(newFilters);
  }, [testRunFilters, setTestRunFilters, fetchTestRuns]);

  const handleStatusChange = useCallback((status: TestRunStatus | 'not_started' | 'in_progress' | 'complete' | 'approved' | undefined) => {
    const newFilters = { ...testRunFilters, status: status as TestRunStatus, page: 1 };
    setTestRunFilters(newFilters);
    fetchTestRuns(newFilters);
  }, [testRunFilters, setTestRunFilters, fetchTestRuns]);

  const handlePageChange = useCallback((page: number) => {
    const newFilters = { ...testRunFilters, page };
    setTestRunFilters(newFilters);
    fetchTestRuns(newFilters);
  }, [testRunFilters, setTestRunFilters, fetchTestRuns]);

  const handleSortChange = useCallback((sort: 'lastModified' | 'createdAt' | 'approvedAt', order: 'asc' | 'desc') => {
    // Map sort values to backend-compatible values
    const sortMap: Record<string, 'createdAt' | 'lastModified' | 'approvedAt'> = {
      'lastModified': 'lastModified',
      'createdAt': 'createdAt',
      'approvedAt': 'approvedAt'
    };
    const newFilters = { 
      ...testRunFilters, 
      sort: sortMap[sort] || 'lastModified', 
      order, 
      page: 1 
    };
    setTestRunFilters(newFilters);
    fetchTestRuns(newFilters);
  }, [testRunFilters, setTestRunFilters, fetchTestRuns]);


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

    if (runId && currentTestRun) {
      return <TestRunDetail testRun={currentTestRun} />;
    }

    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <h2 className="text-lg font-medium mb-2">Test Runs</h2>
          <p>Select a test run from the list to view details, or create a new one.</p>
        </div>
      </div>
    );
  }, [error, clearError, runId, currentTestRun]);

  return (
    <AppLayout>
      <SplitPanelLayout
        leftPanel={
          <ItemList<TestRun>
            items={testRuns}
            onSelectItem={handleSelectTestRun}
            onCreateNew={() => setShowCreateModal(true)}
            loading={loading}
            selectedId={runId || null}
            sortBy={testRunFilters.sort === 'lastModified' ? 'lastModified' : testRunFilters.sort === 'approvedAt' ? 'approvedAt' : 'createdAt'}
            title="Test Runs"
            itemType="testrun"
            totalCount={testRunPagination?.total}
            filters={
              <ItemListControls
                search={testRunFilters.search}
                status={testRunFilters.status as any}
                totalCount={testRunPagination?.total || 0}
                onSearchChange={handleSearchChange}
                onStatusChange={handleStatusChange as any}
                sortBy={testRunFilters.sort === 'lastModified' ? 'lastModified' : testRunFilters.sort === 'approvedAt' ? 'approvedAt' : 'createdAt'}
                sortOrder={testRunFilters.order}
                onSortChange={handleSortChange}
                currentPage={testRunPagination?.page || 1}
                totalPages={testRunPagination?.pages || 1}
                onPageChange={handlePageChange}
                loading={loading}
                statusOptions={[
                  { value: undefined, label: 'All' },
                  { value: 'not_started', label: 'Not Started' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'complete', label: 'Complete' },
                  { value: 'approved', label: 'Approved' }
                ]}
              />
            }
          />
        }
        rightPanel={rightPanel}
      />

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Test Run"
        size="xl"
      >
        <TestRunForm
          onSubmit={handleCreateTestRun}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>
    </AppLayout>
  );
};
