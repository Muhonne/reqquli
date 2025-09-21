import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../templates/AppLayout';
import { SplitPanelLayout } from '../templates/SplitPanelLayout';
import { TestRunList } from '../organisms/TestRunList';
import { TestRunDetail } from '../organisms/TestRunDetail';
import { TestRunForm } from '../organisms/TestRunForm';
import { RequirementsListControls } from '../organisms/RequirementsListControls';
import { PageHeader } from '../molecules/PageHeader';
import { Modal } from '../molecules/Modal';
import useTestRunStore from '../../stores/testRunStore';
import { TestRunStatus } from '../../../types/test-runs';

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

  useEffect(() => {
    fetchTestRuns();
  }, [testRunFilters]);

  useEffect(() => {
    if (runId) {
      fetchTestRun(runId);
    }
  }, [runId]);

  const handleCreateTestRun = async (data: any) => {
    console.log('Creating test run with data:', data);
    try {
      const newTestRun = await createTestRun(data);
      console.log('Test run created:', newTestRun);
      setShowCreateModal(false);
      navigate(`/test-runs/${newTestRun.id}`);
    } catch (error) {
      console.error('Failed to create test run:', error);
      // Error is handled in store
    }
  };

  const handleSelectTestRun = (testRun: any) => {
    navigate(`/test-runs/${testRun.id}`);
  };

  const handleSearchChange = useCallback((search: string | undefined) => {
    setTestRunFilters({ search, page: 1 });
  }, [setTestRunFilters]);

  const handleStatusChange = useCallback((status: TestRunStatus | 'not_started' | 'in_progress' | 'complete' | 'approved' | undefined) => {
    setTestRunFilters({ status: status as TestRunStatus, page: 1 });
  }, [setTestRunFilters]);

  const handlePageChange = useCallback((page: number) => {
    setTestRunFilters({ page });
  }, [setTestRunFilters]);

  const handleSortChange = useCallback((sort: 'lastModified' | 'createdAt' | 'approvedAt', order: 'asc' | 'desc') => {
    const sortMap = {
      'lastModified': 'lastModified',
      'createdAt': 'createdAt',
      'approvedAt': 'createdAt'
    };
    setTestRunFilters({ sort: sortMap[sort] as 'createdAt' | 'lastModified', order, page: 1 });
  }, [setTestRunFilters]);

  const memoizedControls = useMemo(() => (
    <RequirementsListControls
      search={testRunFilters.search}
      status={testRunFilters.status as any}
      totalCount={testRunPagination?.total || 0}
      onSearchChange={handleSearchChange}
      onStatusChange={handleStatusChange as any}
      sortBy={testRunFilters.sort === 'lastModified' ? 'lastModified' : 'createdAt'}
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
  ), [
    testRunFilters.search,
    testRunFilters.status,
    testRunFilters.sort,
    testRunFilters.order,
    testRunPagination?.total,
    testRunPagination?.page,
    testRunPagination?.pages,
    handleSearchChange,
    handleStatusChange,
    handleSortChange,
    handlePageChange,
    loading
  ]);

  return (
    <AppLayout>
      <SplitPanelLayout
        leftPanel={
          <div className="h-full flex flex-col bg-white" style={{ boxShadow: 'inset -2px 0 4px 0 rgba(0,0,0,0.1), inset -1px 0 2px 0 rgba(0,0,0,0.06), inset 2px 0 4px 0 rgba(0,0,0,0.1), inset 1px 0 2px 0 rgba(0,0,0,0.06)' }}>
            <div className="p-6 pb-4 border-b">
              <PageHeader
                title="Test Runs"
                count={testRunPagination?.total}
                onCreateNew={() => setShowCreateModal(true)}
                createButtonText="New"
                testId="create-test-run-btn"
              />
            </div>

            {memoizedControls}

            <div className="flex-1 overflow-y-auto">
              <TestRunList
                testRuns={testRuns}
                selectedTestRun={currentTestRun}
                onSelectTestRun={handleSelectTestRun}
                loading={loading}
              />
            </div>
          </div>
        }
        rightPanel={
          runId && currentTestRun ? (
            <TestRunDetail testRun={currentTestRun} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a test run to view details
            </div>
          )
        }
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

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded">
          {error}
          <button
            onClick={clearError}
            className="ml-2 text-red-700 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}
    </AppLayout>
  );
};