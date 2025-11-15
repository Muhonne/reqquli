import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Textarea } from '../atoms/Textarea';
import { Checkbox } from '../atoms/Checkbox';
import { Stack } from '../atoms/Stack';
import { FormField } from '../molecules/FormField';
import { LoadingState } from '../molecules/LoadingState';
import { RequirementsListControls } from './RequirementsListControls';
import { CheckCircle, Clock, ChevronRight } from 'lucide-react';
import { ListItemStyle } from '../atoms/ListItemStyle';
import useTestRunStore from '../../stores/testRunStore';

interface TestRunFormProps {
  onSubmit: (data: { name: string; description: string; testCaseIds: string[] }) => void;
  onCancel: () => void;
}

export const TestRunForm: React.FC<TestRunFormProps> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTestCases, setSelectedTestCases] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Filter states
  const [filters, setFilters] = useState({
    search: undefined as string | undefined,
    status: 'approved' as 'draft' | 'approved' | undefined,
    sort: 'createdAt' as 'lastModified' | 'createdAt' | 'approvedAt',
    order: 'desc' as 'asc' | 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { testCases, loading, fetchTestCases } = useTestRunStore();

  useEffect(() => {
    fetchTestCases({ status: 'approved' });
  }, [fetchTestCases]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (selectedTestCases.size === 0) {
      newErrors.testCases = 'At least one test case must be selected';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      testCaseIds: Array.from(selectedTestCases)
    });
  };

  // Filter and sort test cases
  const filteredTestCases = useMemo(() => {
    let filtered = testCases;

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(tc =>
        tc.id.toLowerCase().includes(search) ||
        tc.title.toLowerCase().includes(search) ||
        (tc.description && tc.description.toLowerCase().includes(search))
      );
    }

    // Sort the filtered results
    filtered = [...filtered].sort((a, b) => {
      let compareValue = 0;

      if (filters.sort === 'createdAt') {
        compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (filters.sort === 'approvedAt') {
        const aTime = a.approvedAt ? new Date(a.approvedAt).getTime() : 0;
        const bTime = b.approvedAt ? new Date(b.approvedAt).getTime() : 0;
        compareValue = aTime - bTime;
      } else {
        // lastModified
        compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      return filters.order === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [testCases, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredTestCases.length / itemsPerPage);
  const paginatedTestCases = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredTestCases.slice(start, end);
  }, [filteredTestCases, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.status, filters.sort, filters.order]);

  const toggleTestCase = useCallback((testCaseId: string) => {
    const newSelection = new Set(selectedTestCases);
    if (newSelection.has(testCaseId)) {
      newSelection.delete(testCaseId);
    } else {
      newSelection.add(testCaseId);
    }
    setSelectedTestCases(newSelection);
    setErrors({ ...errors, testCases: '' });
  }, [selectedTestCases, errors]);

  const handleSearchChange = useCallback((search: string | undefined) => {
    setFilters(prev => ({ ...prev, search }));
  }, []);

  const handleStatusChange = useCallback((status: string | undefined) => {
    // Since we only fetch approved test cases, this is mainly for UI consistency
    setFilters(prev => ({ ...prev, status: status as 'draft' | 'approved' | undefined }));
  }, []);

  const handleSortChange = useCallback((sort: 'lastModified' | 'createdAt' | 'approvedAt', order: 'asc' | 'desc') => {
    setFilters(prev => ({ ...prev, sort, order }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

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

  const getDisplayDate = (testCase: any) => {
    switch (filters.sort) {
      case 'approvedAt':
        return testCase.approvedAt ? formatDate(testCase.approvedAt) : 'Not approved';
      case 'createdAt':
        return formatDate(testCase.createdAt);
      case 'lastModified':
      default:
        return formatDate(testCase.lastModified || testCase.createdAt);
    }
  };

  const getDateLabel = () => {
    switch (filters.sort) {
      case 'approvedAt':
        return 'Approved';
      case 'createdAt':
        return 'Created';
      case 'lastModified':
      default:
        return 'Modified';
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing="md">
        <FormField label="Test Run Name" required error={errors.name}>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors({ ...errors, name: '' });
            }}
            placeholder="e.g., Release 1.0 Test Run"
            data-testid="test-run-name"
          />
        </FormField>

        <FormField label="Description">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the purpose of this test run..."
            rows={3}
            data-testid="test-run-description"
          />
        </FormField>

        <FormField label="Select Test Cases" required error={errors.testCases}>
          <div className="border border-gray-200 rounded-lg">
            {/* Use the same RequirementsListControls component */}
            <RequirementsListControls
              search={filters.search}
              status={filters.status}
              totalCount={filteredTestCases.length}
              onSearchChange={handleSearchChange}
              onStatusChange={handleStatusChange}
              sortBy={filters.sort}
              sortOrder={filters.order}
              onSortChange={handleSortChange}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              loading={loading}
            />

            {/* Test cases list with checkbox selection */}
            <div className="max-h-64 overflow-y-auto">
              {paginatedTestCases.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {filters.search ? 'No test cases found matching your search' : 'No approved test cases available'}
                </div>
              ) : (
                <div>
                  {paginatedTestCases.map((testCase) => {
                    const isSelected = selectedTestCases.has(testCase.id);

                    return (
                      <ListItemStyle
                        key={testCase.id}
                        isActive={false}
                        onClick={() => toggleTestCase(testCase.id)}
                        className="px-6 py-4 border-b border-gray-100 cursor-pointer"
                        testid={`test-case-item-${testCase.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="mt-1">
                              <Checkbox
                                checked={isSelected}
                                onChange={() => {
                                  // Selection is handled via row click
                                }}
                                onClick={(e) => e.stopPropagation()}
                                data-testid={`test-case-checkbox-${testCase.id}`}
                              />
                            </div>

                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              {testCase.status === 'approved' ? (
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                              ) : (
                                <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="mb-2">
                                  <span className="font-semibold text-gray-900 text-sm">
                                    {testCase.id}-{testCase.revision || 0} {testCase.title}
                                  </span>
                                </div>

                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {testCase.description}
                                </p>

                                <div className="mt-2 text-xs text-gray-600">
                                  {getDateLabel()}: {getDisplayDate(testCase)}
                                </div>
                              </div>
                            </div>
                          </div>

                          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4 self-center" />
                        </div>
                      </ListItemStyle>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selection summary */}
            {selectedTestCases.size > 0 && (
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
                {selectedTestCases.size} test case{selectedTestCases.size !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        </FormField>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" data-testid="create-test-run-submit">
            Create Test Run
          </Button>
        </div>
      </Stack>
    </form>
  );
};